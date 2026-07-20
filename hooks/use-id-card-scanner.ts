"use client";

import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const ANALYSIS_WIDTH = 240;
const CARD_ASPECT_RATIO = 1.586;
const ANALYSIS_HEIGHT = Math.round(ANALYSIS_WIDTH / CARD_ASPECT_RATIO);
const SAMPLE_INTERVAL_MS = 1000 / 15;

type CameraState = "idle" | "requesting" | "ready" | "error";
export type DetectionState = "searching" | "hold-still" | "stable";

export type DetectionMetrics = {
  motion: number;
  edgeDensity: number;
  lumaVariance: number;
  progress: number;
};

type ScannerOptions = {
  videoRef: RefObject<HTMLVideoElement | null>;
  roiRef: RefObject<HTMLDivElement | null>;
  stableFrames?: number;
  minimumStableMs?: number;
  jpegQuality?: number;
};

type SourceRect = { sx: number; sy: number; sw: number; sh: number };

const EMPTY_METRICS: DetectionMetrics = {
  motion: 0,
  edgeDensity: 0,
  lumaVariance: 0,
  progress: 0,
};

function cameraErrorMessage(error: unknown): string {
  if (!(error instanceof DOMException)) {
    return "ไม่สามารถเปิดกล้องได้ กรุณาลองใหม่อีกครั้ง";
  }

  switch (error.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "ไม่ได้รับสิทธิ์ใช้กล้อง กรุณาอนุญาต Camera ในการตั้งค่าเบราว์เซอร์";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "ไม่พบกล้องบนอุปกรณ์นี้";
    case "NotReadableError":
    case "TrackStartError":
      return "กล้องกำลังถูกใช้งานโดยแอปอื่น กรุณาปิดแอปนั้นแล้วลองใหม่";
    case "OverconstrainedError":
      return "กล้องไม่รองรับค่าที่ร้องขอ กรุณาลองใช้อุปกรณ์หรือเบราว์เซอร์อื่น";
    default:
      return "เปิดกล้องไม่สำเร็จ กรุณาใช้ HTTPS และตรวจสอบสิทธิ์กล้อง";
  }
}

function isConstraintError(error: unknown) {
  return (
    error instanceof DOMException &&
    (error.name === "OverconstrainedError" || error.name === "NotFoundError")
  );
}

async function requestCamera(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { exact: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
  } catch (error) {
    if (!isConstraintError(error)) throw error;

    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
  }
}

/** Maps the visible CSS ROI to native video pixels when object-fit is cover. */
function getSourceRect(video: HTMLVideoElement, roi: HTMLElement): SourceRect | null {
  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;
  if (!videoWidth || !videoHeight) return null;

  const videoBox = video.getBoundingClientRect();
  const roiBox = roi.getBoundingClientRect();
  if (!videoBox.width || !videoBox.height) return null;

  const coverScale = Math.max(
    videoBox.width / videoWidth,
    videoBox.height / videoHeight,
  );
  const renderedWidth = videoWidth * coverScale;
  const renderedHeight = videoHeight * coverScale;
  const cropOffsetX = (renderedWidth - videoBox.width) / 2;
  const cropOffsetY = (renderedHeight - videoBox.height) / 2;

  const rawX = (roiBox.left - videoBox.left + cropOffsetX) / coverScale;
  const rawY = (roiBox.top - videoBox.top + cropOffsetY) / coverScale;
  const rawWidth = roiBox.width / coverScale;
  const rawHeight = roiBox.height / coverScale;
  const sx = Math.max(0, Math.min(videoWidth - 1, rawX));
  const sy = Math.max(0, Math.min(videoHeight - 1, rawY));

  return {
    sx,
    sy,
    sw: Math.max(1, Math.min(videoWidth - sx, rawWidth)),
    sh: Math.max(1, Math.min(videoHeight - sy, rawHeight)),
  };
}

export function useIdCardScanner({
  videoRef,
  roiRef,
  stableFrames = 10,
  minimumStableMs = 650,
  jpegQuality = 0.85,
}: ScannerOptions) {
  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectionState, setDetectionState] = useState<DetectionState>("searching");
  const [metrics, setMetrics] = useState<DetectionMetrics>(EMPTY_METRICS);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previousLumaRef = useRef<Uint8Array | null>(null);
  const currentLumaRef = useRef<Uint8Array | null>(null);
  const sourceRectRef = useRef<SourceRect | null>(null);
  const lastSampleAtRef = useRef(0);
  const lastMetricsPublishAtRef = useRef(0);
  const stableSinceRef = useRef<number | null>(null);
  const stableFrameCountRef = useRef(0);
  const capturedRef = useRef(false);
  const runningRef = useRef(false);
  const cameraRequestIdRef = useRef(0);

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
  }, [videoRef]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    const rect = sourceRectRef.current;
    if (!video || !rect || capturedRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(rect.sw);
    canvas.height = Math.round(rect.sh);
    const context = canvas.getContext("2d");
    if (!context) return;

    context.drawImage(
      video,
      rect.sx,
      rect.sy,
      rect.sw,
      rect.sh,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    capturedRef.current = true;
    setCapturedImage(canvas.toDataURL("image/jpeg", jpegQuality));
    context.clearRect(0, 0, canvas.width, canvas.height);
  }, [jpegQuality, videoRef]);

  const processSample = useCallback(
    (now: number) => {
      const video = videoRef.current;
      const roi = roiRef.current;
      if (!video || !roi || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

      const sourceRect = getSourceRect(video, roi);
      if (!sourceRect) return;
      sourceRectRef.current = sourceRect;

      let canvas = analysisCanvasRef.current;
      if (!canvas) {
        canvas = document.createElement("canvas");
        canvas.width = ANALYSIS_WIDTH;
        canvas.height = ANALYSIS_HEIGHT;
        analysisCanvasRef.current = canvas;
      }
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context) return;

      context.drawImage(
        video,
        sourceRect.sx,
        sourceRect.sy,
        sourceRect.sw,
        sourceRect.sh,
        0,
        0,
        ANALYSIS_WIDTH,
        ANALYSIS_HEIGHT,
      );

      const pixels = context.getImageData(0, 0, ANALYSIS_WIDTH, ANALYSIS_HEIGHT).data;
      const pixelCount = ANALYSIS_WIDTH * ANALYSIS_HEIGHT;
      let current = currentLumaRef.current;
      if (!current || current.length !== pixelCount) current = new Uint8Array(pixelCount);
      const previous = previousLumaRef.current;
      const step = 2;
      let sum = 0;
      let sumSquares = 0;
      let motionSum = 0;
      let edgeCount = 0;
      let comparisons = 0;
      let samples = 0;

      for (let y = 0; y < ANALYSIS_HEIGHT; y += step) {
        for (let x = 0; x < ANALYSIS_WIDTH; x += step) {
          const pixelIndex = y * ANALYSIS_WIDTH + x;
          const rgbaIndex = pixelIndex * 4;
          const luma = Math.round(
            pixels[rgbaIndex] * 0.299 +
              pixels[rgbaIndex + 1] * 0.587 +
              pixels[rgbaIndex + 2] * 0.114,
          );
          current[pixelIndex] = luma;
          sum += luma;
          sumSquares += luma * luma;
          samples += 1;

          if (previous) motionSum += Math.abs(luma - previous[pixelIndex]);
          if (x >= step) {
            if (Math.abs(luma - current[pixelIndex - step]) > 24) edgeCount += 1;
            comparisons += 1;
          }
          if (y >= step) {
            if (Math.abs(luma - current[pixelIndex - step * ANALYSIS_WIDTH]) > 24) {
              edgeCount += 1;
            }
            comparisons += 1;
          }
        }
      }

      previousLumaRef.current = current;
      currentLumaRef.current = previous ?? new Uint8Array(pixelCount);

      const mean = sum / samples;
      const variance = Math.max(0, sumSquares / samples - mean * mean);
      const motion = previous ? motionSum / samples : Number.POSITIVE_INFINITY;
      const edgeDensity = comparisons ? edgeCount / comparisons : 0;
      const hasUsableLight = mean > 42 && mean < 225;
      const hasCardDetails = hasUsableLight && variance > 260 && edgeDensity > 0.045;
      const isMotionStable = previous !== null && motion < 6.5;
      const isCandidate = hasCardDetails && isMotionStable;

      if (isCandidate) {
        stableFrameCountRef.current += 1;
        stableSinceRef.current ??= now;
      } else {
        stableFrameCountRef.current = 0;
        stableSinceRef.current = null;
      }

      const stableDuration = stableSinceRef.current === null ? 0 : now - stableSinceRef.current;
      const progress = Math.min(
        1,
        stableFrameCountRef.current / stableFrames,
        stableDuration / minimumStableMs,
      );
      const nextState: DetectionState = !hasCardDetails
        ? "searching"
        : isMotionStable
          ? "stable"
          : "hold-still";

      setDetectionState((currentState) =>
        currentState === nextState ? currentState : nextState,
      );
      // Metrics are UI/debug data; publishing at 5 fps avoids 15 React renders/sec.
      if (now - lastMetricsPublishAtRef.current >= 200 || progress === 1) {
        lastMetricsPublishAtRef.current = now;
        setMetrics({
          motion: Number.isFinite(motion) ? motion : 0,
          edgeDensity,
          lumaVariance: variance,
          progress,
        });
      }

      if (
        stableFrameCountRef.current >= stableFrames &&
        stableDuration >= minimumStableMs
      ) {
        capture();
      }
    },
    [capture, minimumStableMs, roiRef, stableFrames, videoRef],
  );

  const startDetectionLoop = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;

    const tick = (now: number) => {
      if (!runningRef.current) return;
      if (!capturedRef.current && now - lastSampleAtRef.current >= SAMPLE_INTERVAL_MS) {
        lastSampleAtRef.current = now;
        processSample(now);
      }
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
  }, [processSample]);

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

  const retryCapture = useCallback(() => {
    capturedRef.current = false;
    previousLumaRef.current = null;
    currentLumaRef.current = null;
    stableFrameCountRef.current = 0;
    stableSinceRef.current = null;
    setCapturedImage(null);
    setDetectionState("searching");
    setMetrics(EMPTY_METRICS);
  }, []);

  useEffect(() => {
    void startCamera();
    return stopCamera;
  }, [startCamera, stopCamera]);

  return {
    cameraState,
    cameraError,
    detectionState,
    metrics,
    capturedImage,
    retryCapture,
    retryCamera: startCamera,
    stopCamera,
  };
}
