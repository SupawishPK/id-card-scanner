"use client";

import { useEffect, useRef, useState } from "react";
import { useIdCardScanner } from "@/hooks/use-id-card-scanner";
import { CameraHeader } from "./sub-components/camera-header";
import { CameraOverlay } from "./sub-components/camera-overlay";
import { CameraControls } from "./sub-components/camera-controls";
import { DebugOverlay } from "./sub-components/debug-overlay";
import { ValidationDialogs } from "./sub-components/validation-dialogs";
import { vibrate } from "./utils/haptics";
import {
  AUTO_CAPTURE_DURATION_MS,
  MOCK_VALIDATION_DELAY_MS,
  MOCK_VALIDATION_PASS_RATE,
  AUTO_STABLE_STATUS,
  STATUS_UI,
  TILTED_STATUS,
  type CaptureMode,
  type ValidationState,
} from "./constants/scanner-ui.config";

type IdCardScannerProps = {
  className?: string;
  onBack?: () => void;
};

export function IdCardScanner({ className = "", onBack }: IdCardScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const guideRef = useRef<HTMLCanvasElement>(null);
  const [captureMode, setCaptureMode] = useState<CaptureMode>("auto");
  const [autoProgress, setAutoProgress] = useState<number>(0);
  const [validationState, setValidationState] = useState<ValidationState>("idle");

  const {
    cameraState,
    cameraError,
    detectionState,
    capturedImage,
    torchAvailable,
    isTorchOn,
    debugMetrics,
    capturePhoto,
    toggleTorch,
    retryCapture,
    retryCamera,
  } = useIdCardScanner({ videoRef, roiRef: guideRef });

  // ── Derived state ─────────────────────────────────────────────────

  const isStable = detectionState === "stable";
  const canCapture = isStable && !capturedImage;

  const isTilted =
    detectionState === "card-detected" &&
    debugMetrics?.captureSkewScore != null &&
    debugMetrics.captureSkewScore < 0.70;

  const baseStatusUi =
    captureMode === "auto" && detectionState === "stable"
      ? AUTO_STABLE_STATUS
      : STATUS_UI[detectionState];

  const statusUi = isTilted
    ? TILTED_STATUS
    : autoProgress > 0
      ? AUTO_STABLE_STATUS
      : baseStatusUi;

  // ── Auto-capture progress ─────────────────────────────────────────

  useEffect(() => {
    if (captureMode !== "auto" || !canCapture) {
      setAutoProgress(0);
      return;
    }

    let startTime: number | null = null;
    let animFrameId: number;
    let lastVibrateStep = 0;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(1, elapsed / AUTO_CAPTURE_DURATION_MS);
      setAutoProgress(progress);

      const step = Math.floor(progress * 4);
      if (step > lastVibrateStep && step < 4) {
        lastVibrateStep = step;
        vibrate(35);
      }

      if (progress < 1) {
        animFrameId = requestAnimationFrame(animate);
      } else {
        setAutoProgress(0);
        vibrate([60, 40, 80]);
        const success = capturePhoto();
        if (success) setValidationState("checking");
      }
    };

    animFrameId = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(animFrameId);
      setAutoProgress(0);
    };
  }, [canCapture, captureMode, capturePhoto]);

  // ── Mock validation ───────────────────────────────────────────────

  useEffect(() => {
    if (!capturedImage) return;
    const timeoutId = window.setTimeout(() => {
      const passed = Math.random() < MOCK_VALIDATION_PASS_RATE;
      setValidationState(passed ? "success" : "error");
    }, MOCK_VALIDATION_DELAY_MS);
    return () => window.clearTimeout(timeoutId);
  }, [capturedImage]);

  // ── Actions ───────────────────────────────────────────────────────

  const handleCapture = () => {
    const success = capturePhoto();
    if (success) setValidationState("checking");
  };

  const handleRetry = () => {
    setValidationState("idle");
    retryCapture();
  };

  const handleCopyImage = async () => {
    if (!capturedImage) return;
    try {
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    } catch {
      window.open(capturedImage, "_blank");
    }
  };

  // ── Render ────────────────────────────────────────────────────────

  return (
    <section
      className={`relative isolate h-dvh w-full overflow-hidden bg-black sm:h-[min(840px,calc(100dvh-3rem))] sm:max-w-md sm:rounded-3xl sm:ring-1 sm:ring-white/10 ${className}`}
      aria-label="เครื่องสแกนบัตรประชาชน"
    >
      <video
        ref={videoRef}
        autoPlay muted playsInline disablePictureInPicture
        className="absolute inset-0 h-full w-full object-cover"
        aria-label="ภาพสดจากกล้อง"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/70" />

      <CameraHeader onBack={onBack} />

      <CameraOverlay
        guideRef={guideRef}
        detectionState={detectionState}
        autoProgress={autoProgress}
        statusUi={statusUi}
      />

      <DebugOverlay metrics={debugMetrics} detectionState={detectionState} />

      <CameraControls
        captureMode={captureMode}
        onModeChange={setCaptureMode}
        canCapture={canCapture}
        autoProgress={autoProgress}
        torchAvailable={torchAvailable}
        cameraState={cameraState}
        isTorchOn={isTorchOn}
        onCapture={handleCapture}
        onToggleTorch={() => void toggleTorch()}
      />

      <ValidationDialogs
        validationState={validationState}
        capturedImage={capturedImage}
        cameraState={cameraState}
        cameraError={cameraError}
        onRetry={handleRetry}
        onRetryCamera={() => void retryCamera()}
        onCopyImage={handleCopyImage}
      />
    </section>
  );
}
