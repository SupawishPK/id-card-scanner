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
  getSourceRect,
  isTorchSupported,
  processScannerFrame,
  requestCamera,
  resetReadiness,
  setTorch,
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
  // 1. Unified Configuration
  const customConfigRef = useRef(customConfig);
  customConfigRef.current = customConfig;

  const config = useMemo(
    () => ({
      ...DEFAULT_SCANNER_CONFIG,
      stableFrames,
      minimumStableMs,
      jpegQuality,
      ...(customConfigRef.current ?? {}),
    }),
    [jpegQuality, minimumStableMs, stableFrames],
  );

  // 2. Public UI States
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectionState, setDetectionState] = useState<DetectionState>("searching");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);

  // 3. Control & Loop Flags
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const cameraRequestIdRef = useRef(0);
  const lastSampleAtRef = useRef(0);
  const capturedRef = useRef(false);
  const runningRef = useRef(false);

  // 4. Grouped Frame Processing Buffer & State
  interface FrameState {
    canvas: HTMLCanvasElement | null;
    previousLuma: Uint8Array | null;
    currentLuma: Uint8Array | null;
    sourceRect: SourceRect | null;
    needsRectRecalc: boolean;
    readiness: ReturnType<typeof createReadinessState>;
    hasDetectedCard: boolean;
    isCaptureAligned: boolean;
  }
  const frameStateRef = useRef<FrameState>({
    canvas: null,
    previousLuma: null,
    currentLuma: null,
    sourceRect: null,
    needsRectRecalc: true,
    readiness: createReadinessState(),
    hasDetectedCard: false,
    isCaptureAligned: false,
  });

  // Helper: Reset frame analysis buffers & readiness tracking
  const resetFrameState = useCallback(() => {
    const fs = frameStateRef.current;
    fs.canvas = null;
    fs.previousLuma = null;
    fs.currentLuma = null;
    fs.sourceRect = null;
    fs.needsRectRecalc = true;
    fs.hasDetectedCard = false;
    fs.isCaptureAligned = false;
    resetReadiness(fs.readiness);
  }, []);

  // 5. Camera & Pipeline Controls
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

    setTorchAvailable(false);
    setIsTorchOn(false);
    capturedRef.current = false;
    resetFrameState();
  }, [resetFrameState, videoRef]);

  const capture = useCallback((): boolean => {
    const video = videoRef.current;
    const fs = frameStateRef.current;
    if (!video || !fs.sourceRect || capturedRef.current || !fs.readiness.isReady) return false;

    const dataUrl = captureRoiImage(video, fs.sourceRect, config.jpegQuality);
    if (!dataUrl) return false;

    capturedRef.current = true;
    setCapturedImage(dataUrl);
    return true;
  }, [config.jpegQuality, videoRef]);

  const toggleTorch = useCallback(async () => {
    const stream = streamRef.current;
    if (!stream) return;
    const next = !isTorchOn;
    const actual = await setTorch(stream, next);
    setIsTorchOn(actual);
  }, [isTorchOn]);

  // 6. Frame Sampling & Analysis Loop
  const processSample = useCallback(
    (now: number) => {
      const video = videoRef.current;
      const roi = roiRef.current;
      if (!video || !roi) return;

      const fs = frameStateRef.current;

      // Recalculate sourceRect only when null or invalidated by resize/orientation change
      if (!fs.sourceRect || fs.needsRectRecalc) {
        fs.sourceRect = getSourceRect(video, roi);
        fs.needsRectRecalc = false;
      }
      if (!fs.sourceRect) return;

      const result = processScannerFrame({
        video,
        roi,
        now,
        canvas: fs.canvas,
        previousLuma: fs.previousLuma,
        currentLuma: fs.currentLuma,
        readiness: fs.readiness,
        readinessConfig: config,
        hasDetectedCard: fs.hasDetectedCard,
        isCaptureAligned: fs.isCaptureAligned,
        thresholds: config,
        sourceRect: fs.sourceRect,
      });

      if (!result) return;

      fs.sourceRect = result.sourceRect;
      fs.canvas = result.canvas;
      fs.previousLuma = result.previousLuma;
      fs.currentLuma = result.currentLuma;
      fs.hasDetectedCard = result.hasDetectedCard;
      fs.isCaptureAligned = result.isCaptureAligned;

      setDetectionState((current) =>
        current === result.detectionState ? current : result.detectionState,
      );
    },
    [config, roiRef, videoRef],
  );

  const startDetectionLoop = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;

    const tick = (now: number) => {
      // Stop rAF loop immediately if no longer running or already captured photo
      if (!runningRef.current || capturedRef.current) {
        runningRef.current = false;
        animationFrameRef.current = null;
        return;
      }

      if (now - lastSampleAtRef.current >= config.sampleIntervalMs) {
        lastSampleAtRef.current = now;
        processSample(now);
      }
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
  }, [config.sampleIntervalMs, processSample]);

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

      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      await video.play();

      // Guard against component unmount or camera restart while waiting for video.play()
      if (requestId !== cameraRequestIdRef.current) return;

      setCameraState("ready");
      setTorchAvailable(isTorchSupported(stream));
      setIsTorchOn(false);
      startDetectionLoop();
    } catch (error) {
      if (requestId !== cameraRequestIdRef.current) return;
      stopCamera();
      setCameraState("error");
      setCameraError(cameraErrorMessage(error));
    }
  }, [startDetectionLoop, stopCamera, videoRef]);

  const retryCapture = useCallback(() => {
    capturedRef.current = false;
    resetFrameState();
    setCapturedImage(null);
    setDetectionState("searching");
    startDetectionLoop();
  }, [resetFrameState, startDetectionLoop]);

  // 7. Lifecycle & Window / Visibility Event Management
  useEffect(() => {
    const handleResize = () => {
      frameStateRef.current.needsRectRecalc = true;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && runningRef.current) {
        const video = videoRef.current;
        if (video && video.paused && streamRef.current?.active) {
          void video.play().catch(() => void startCamera());
        }
      }
    };

    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    void startCamera();

    return () => {
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopCamera();
    };
  }, [startCamera, stopCamera, videoRef]);

  return {
    cameraState,
    cameraError,
    detectionState,
    capturedImage,
    torchAvailable,
    isTorchOn,
    capturePhoto: capture,
    toggleTorch,
    retryCapture,
    retryCamera: startCamera,
    stopCamera,
    config,
  };
}
