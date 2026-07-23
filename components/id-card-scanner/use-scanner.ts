"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { ANALYSIS, CARD_DETECTION_CONFIG, DEFAULT_SCANNER_CONFIG, type IScannerConfig } from "./config";
import { cameraErrorMessage, isTorchSupported, requestCamera, setTorch, type ICameraState } from "./camera";
import { captureRoiImage, expandRoiBounds, getRoiBounds, type IRoiBounds } from "./crop";
import { createReadinessState, type IReadinessState } from "./analysis";
import { processScannerFrame, type IDebugMetrics, type IDistanceHint, type IScannerStatus } from "./geometry";

export type { IScannerStatus, ICameraState, IDistanceHint, IScannerConfig, IDebugMetrics };
export { DEFAULT_SCANNER_CONFIG };

export type IScannerOptions = {
  videoRef: RefObject<HTMLVideoElement | null>;
  roiRef: RefObject<HTMLElement | null>;
};

const ANALYSIS_PIXEL_COUNT = ANALYSIS.width * ANALYSIS.height;

interface IFrameState {
  canvas: HTMLCanvasElement | null;
  previousLuma: Uint8Array | null;
  currentLuma: Uint8Array;
  roiBounds: IRoiBounds | null;
  needsRectRecalc: boolean;
  readiness: IReadinessState;
  hasDetectedCard: boolean;
  isCaptureAligned: boolean;
}

const createFrameState = (): IFrameState => ({
  canvas: null,
  previousLuma: null,
  currentLuma: new Uint8Array(ANALYSIS_PIXEL_COUNT),
  roiBounds: null,
  needsRectRecalc: true,
  readiness: createReadinessState(),
  hasDetectedCard: false,
  isCaptureAligned: false,
});

const resetFrameState = (fs: IFrameState): void => {
  fs.canvas = null;
  fs.previousLuma = null;
  fs.roiBounds = null;
  fs.needsRectRecalc = true;
  fs.hasDetectedCard = false;
  fs.isCaptureAligned = false;
  fs.readiness = createReadinessState();
};

export const useIdCardScanner = ({ videoRef, roiRef }: IScannerOptions) => {
  const config = DEFAULT_SCANNER_CONFIG;

  const [cameraState, setCameraState] = useState<ICameraState>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannerStatus, setScannerStatus] = useState<IScannerStatus>("searching");
  const [distanceHint, setDistanceHint] = useState<IDistanceHint>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [debugMetrics, setDebugMetrics] = useState<IDebugMetrics | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const cameraRequestIdRef = useRef(0);
  const lastSampleAtRef = useRef(0);
  const capturedRef = useRef(false);
  const runningRef = useRef(false);
  const frameStateRef = useRef(createFrameState());

  const resetState = useCallback(() => {
    resetFrameState(frameStateRef.current);
  }, []);

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
    resetState();
  }, [resetState, videoRef]);

  const capture = useCallback((): boolean => {
    const video = videoRef.current;
    const fs = frameStateRef.current;
    if (!video || !fs.roiBounds || capturedRef.current || !fs.readiness.isReady) return false;

    const pad = CARD_DETECTION_CONFIG.capturePaddingRatio;
    const padW = fs.roiBounds.sw * pad;
    const padH = fs.roiBounds.sh * pad;
    const sx = Math.max(0, fs.roiBounds.sx - padW);
    const sy = Math.max(0, fs.roiBounds.sy - padH);
    const paddedRect: IRoiBounds = {
      sx, sy,
      sw: Math.min(video.videoWidth - sx, fs.roiBounds.sw + padW * 2),
      sh: Math.min(video.videoHeight - sy, fs.roiBounds.sh + padH * 2),
    };

    const dataUrl = captureRoiImage(video, paddedRect);
    if (!dataUrl) return false;

    capturedRef.current = true;
    setCapturedImage(dataUrl);
    return true;
  }, [videoRef]);

  const toggleTorch = useCallback(async () => {
    const stream = streamRef.current;
    if (!stream) return;
    const actual = await setTorch(stream, !isTorchOn);
    setIsTorchOn(actual);
  }, [isTorchOn]);

  const processSample = useCallback(
    (now: number) => {
      const video = videoRef.current;
      const roi = roiRef.current;
      if (!video || !roi || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

      const fs = frameStateRef.current;
      if (!fs.roiBounds || fs.needsRectRecalc) {
        fs.roiBounds = getRoiBounds(video, roi);
        fs.needsRectRecalc = false;
      }
      if (!fs.roiBounds) return;

      if (!fs.canvas) {
        fs.canvas = document.createElement("canvas");
        fs.canvas.width = CARD_DETECTION_CONFIG.analysisWidth;
        fs.canvas.height = CARD_DETECTION_CONFIG.analysisHeight;
      }
      const context = fs.canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;

      const expanded = expandRoiBounds(fs.roiBounds, video.videoWidth, video.videoHeight);
      context.drawImage(
        video,
        expanded.sx, expanded.sy, expanded.sw, expanded.sh,
        0, 0, CARD_DETECTION_CONFIG.analysisWidth, CARD_DETECTION_CONFIG.analysisHeight,
      );

      const pixels = context.getImageData(
        0, 0, CARD_DETECTION_CONFIG.analysisWidth, CARD_DETECTION_CONFIG.analysisHeight,
      ).data;

      const result = processScannerFrame({
        pixels,
        analysisWidth: CARD_DETECTION_CONFIG.analysisWidth,
        analysisHeight: CARD_DETECTION_CONFIG.analysisHeight,
        now,
        previousLuma: fs.previousLuma,
        currentLuma: fs.currentLuma,
        readiness: fs.readiness,
        readinessConfig: config,
        hasDetectedCard: fs.hasDetectedCard,
        isCaptureAligned: fs.isCaptureAligned,
        thresholds: config,
      });

      fs.previousLuma = result.previousLuma;
      fs.currentLuma = result.currentLuma;
      fs.readiness = result.readiness;
      fs.hasDetectedCard = result.hasDetectedCard;
      fs.isCaptureAligned = result.isCaptureAligned;

      setScannerStatus((current: IScannerStatus) => (current === result.scannerStatus ? current : result.scannerStatus));
      setDistanceHint((current: IDistanceHint) => (current === result.distanceHint ? current : result.distanceHint));
      setDebugMetrics(result.debugMetrics);
    },
    [config, roiRef, videoRef],
  );

  const startDetectionLoop = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;

    const tick = (now: number) => {
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
    resetState();
    setCapturedImage(null);
    startDetectionLoop();
  }, [resetState, startDetectionLoop]);

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
    cameraState, cameraError, scannerStatus, distanceHint, capturedImage,
    torchAvailable, isTorchOn, debugMetrics, capturePhoto: capture,
    toggleTorch, retryCapture, retryCamera: startCamera, stopCamera, config,
  };
};
