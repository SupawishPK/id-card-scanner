"use client";

import {
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  DEFAULT_SCANNER_CONFIG,
  type ScannerConfig,
} from "@/lib/id-card-scanner-config";
import {
  type CameraState,
  type DetectionState,
  type SourceRect,
  cameraErrorMessage,
  captureRoiImage,
  createReadinessState,
  processScannerFrame,
  requestCamera,
  resetReadiness,
} from "@/lib/id-card-scanner-engine";

export type { DetectionState, CameraState, ScannerConfig };
export { DEFAULT_SCANNER_CONFIG };

export type ScannerOptions = {
  /** Reference ถึงตัวแปร `<video>` element ที่แสดงภาพสดจากกล้อง */
  videoRef: RefObject<HTMLVideoElement | null>;
  /** Reference ถึงตัวแปร HTML Element ที่เป็นกรอบสแกนบัตร (ROI Guide) */
  roiRef: RefObject<HTMLElement | null>;
  /** จำนวนเฟรมขั้นต่ำที่ต้องการให้นิ่ง */
  stableFrames?: number;
  /** ระยะเวลาขั้นต่ำ (ms) ที่ต้องการให้นิ่ง */
  minimumStableMs?: number;
  /** คุณภาพไฟล์ภาพ JPEG (0.0 - 1.0) */
  jpegQuality?: number;
  /** สามารถส่งค่า Config เพื่อปรับแต่งความแม่นยำ/ความเร็วในการสแกนได้เพิ่มเติม */
  config?: ScannerConfig;
};

export function useIdCardScanner({
  videoRef,
  roiRef,
  stableFrames = DEFAULT_SCANNER_CONFIG.stableFrames,
  minimumStableMs = DEFAULT_SCANNER_CONFIG.minimumStableMs,
  jpegQuality = DEFAULT_SCANNER_CONFIG.jpegQuality,
  config: customConfig,
}: ScannerOptions) {
  // Merge configurations
  const config = useMemo(
    () => ({
      ...DEFAULT_SCANNER_CONFIG,
      stableFrames,
      minimumStableMs,
      jpegQuality,
      ...customConfig,
    }),
    [customConfig, jpegQuality, minimumStableMs, stableFrames],
  );

  // Public UI State
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectionState, setDetectionState] = useState<DetectionState>("searching");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Configuration for readiness tracking accumulator
  const readinessConfig = useMemo(
    () => ({
      stableFrames: config.stableFrames,
      minimumStableMs: config.minimumStableMs,
      acquireMissGraceFrames: config.acquireMissGraceFrames,
      readyMissGraceFrames: config.readyMissGraceFrames,
    }),
    [config],
  );

  // Internal Scanner Refs & Buffers
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previousLumaRef = useRef<Uint8Array | null>(null);
  const currentLumaRef = useRef<Uint8Array | null>(null);
  const sourceRectRef = useRef<SourceRect | null>(null);
  const readinessRef = useRef(createReadinessState());
  const hasDetectedCardRef = useRef(false);
  const isCaptureAlignedRef = useRef(false);
  const capturedRef = useRef(false);
  const runningRef = useRef(false);
  const cameraRequestIdRef = useRef(0);
  const lastSampleAtRef = useRef(0);

  // Stop camera stream & reset scanner pipeline state
  const stopCamera = useCallback(() => {
    cameraRequestIdRef.current += 1;
    runningRef.current = false;

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;

    previousLumaRef.current = null;
    currentLumaRef.current = null;
    sourceRectRef.current = null;
    analysisCanvasRef.current = null;
    resetReadiness(readinessRef.current);
    hasDetectedCardRef.current = false;
    isCaptureAlignedRef.current = false;
  }, [videoRef]);

  // Capture current ROI image when card scanner is ready
  const capture = useCallback(() => {
    const video = videoRef.current;
    const rect = sourceRectRef.current;
    if (!video || !rect || capturedRef.current || !readinessRef.current.isReady) return;

    const dataUrl = captureRoiImage(video, rect, config.jpegQuality);
    if (!dataUrl) return;

    capturedRef.current = true;
    setCapturedImage(dataUrl);
  }, [config.jpegQuality, videoRef]);

  // Process a single camera video frame
  const processSample = useCallback(
    (now: number) => {
      const video = videoRef.current;
      const roi = roiRef.current;
      if (!video || !roi) return;

      const result = processScannerFrame({
        video,
        roi,
        now,
        canvas: analysisCanvasRef.current,
        previousLuma: previousLumaRef.current,
        currentLuma: currentLumaRef.current,
        readiness: readinessRef.current,
        readinessConfig,
        hasDetectedCard: hasDetectedCardRef.current,
        isCaptureAligned: isCaptureAlignedRef.current,
        thresholds: {
          sampleIntervalMs: config.sampleIntervalMs,
          motionEnterThreshold: config.motionEnterThreshold,
          motionExitThreshold: config.motionExitThreshold,
          presenceConfidenceEnter: config.presenceConfidenceEnter,
          presenceConfidenceExit: config.presenceConfidenceExit,
          captureConfidenceEnter: config.captureConfidenceEnter,
          captureConfidenceExit: config.captureConfidenceExit,
        },
      });

      if (!result) return;

      sourceRectRef.current = result.sourceRect;
      analysisCanvasRef.current = result.canvas;
      previousLumaRef.current = result.previousLuma;
      currentLumaRef.current = result.currentLuma;
      hasDetectedCardRef.current = result.hasDetectedCard;
      isCaptureAlignedRef.current = result.isCaptureAligned;

      setDetectionState((current) =>
        current === result.detectionState ? current : result.detectionState,
      );
    },
    [config, readinessConfig, roiRef, videoRef],
  );

  // Start continuous frame sampling loop
  const startDetectionLoop = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;

    const tick = (now: number) => {
      if (!runningRef.current) return;
      if (!capturedRef.current && now - lastSampleAtRef.current >= config.sampleIntervalMs) {
        lastSampleAtRef.current = now;
        processSample(now);
      }
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
  }, [config.sampleIntervalMs, processSample]);

  // Start hardware camera stream and detection loop
  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraState("error");
      setCameraError("เบราว์เซอร์นี้ไม่รองรับ Camera API กรุณาใช้ Safari หรือ Chrome รุ่นล่าสุด");
      return;
    }

    stopCamera();
    const requestId = cameraRequestIdRef.current;
    setCameraState("requesting");
    setCameraError(null);

    try {
      const stream = await requestCamera();
      if (requestId !== cameraRequestIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      video.srcObject = stream;
      await video.play();
      setCameraState("ready");
      startDetectionLoop();
    } catch (error) {
      if (requestId !== cameraRequestIdRef.current) return;
      stopCamera();
      setCameraState("error");
      setCameraError(cameraErrorMessage(error));
    }
  }, [startDetectionLoop, stopCamera, videoRef]);

  // Reset captured image and restart frame analysis
  const retryCapture = useCallback(() => {
    capturedRef.current = false;
    previousLumaRef.current = null;
    currentLumaRef.current = null;
    resetReadiness(readinessRef.current);
    hasDetectedCardRef.current = false;
    isCaptureAlignedRef.current = false;
    setCapturedImage(null);
    setDetectionState("searching");
  }, []);

  // Initialize camera stream on mount and cleanup on unmount
  useEffect(() => {
    void startCamera();
    return stopCamera;
  }, [startCamera, stopCamera]);

  return {
    cameraState,
    cameraError,
    detectionState,
    capturedImage,
    capturePhoto: capture,
    retryCapture,
    retryCamera: startCamera,
    stopCamera,
    config,
  };
}
