"use client";

import { useEffect, useRef, useState } from "react";
import { useIdCardScanner } from "./use-scanner";
import { CameraGuide, CameraHeader, CaptureButton } from "./camera-views";
import { DebugOverlay, ValidationDialogs } from "./dialog-views";
import {
  AUTO_CAPTURE_DURATION_MS,
  type IValidationState,
} from "./theme";

const vibrate = (pattern: number | number[]) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Ignore vibration errors
  }
};

export type ICustomErrorDetails = {
  title?: string;
  description?: string;
  hint?: string;
};

export type IVerifyResult = {
  success: boolean;
  error?: ICustomErrorDetails;
} | void;

export type IIdCardScannerProps = {
  onBack: () => void;
  onVerify: (capturedImage: string) => Promise<IVerifyResult> | IVerifyResult;
};

export const IdCardScanner = ({ onBack, onVerify }: IIdCardScannerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const guideRef = useRef<HTMLCanvasElement>(null);
  const [autoProgress, setAutoProgress] = useState<number>(0);
  const [validationState, setValidationState] = useState<IValidationState>("idle");
  const [customError, setCustomError] = useState<ICustomErrorDetails | null>(null);

  const {
    cameraState,
    cameraError,
    scannerStatus,
    capturedImage,
    debugMetrics,
    capturePhoto,
    retryCapture,
    retryCamera,
  } = useIdCardScanner({ videoRef, roiRef: guideRef });

  const isStable = scannerStatus === "stable";
  const canCapture = isStable && !capturedImage;

  // Auto-capture when stable
  useEffect(() => {
    if (!canCapture) {
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
  }, [canCapture, capturePhoto]);

  useEffect(() => {
    if (!capturedImage) {
      setCustomError(null);
      return;
    }

    let isCurrent = true;
    setValidationState("checking");
    setCustomError(null);

    const runVerification = async () => {
      try {
        const res = await onVerify(capturedImage);
        if (!isCurrent) return;

        if (res && typeof res === "object" && "success" in res) {
          if (res.success) {
            setValidationState("success");
          } else {
            setCustomError(res.error || null);
            setValidationState("error");
          }
        } else {
          setValidationState("success");
        }
      } catch (err: unknown) {
        if (!isCurrent) return;
        const errorObj = err as Record<string, string | undefined>;
        setCustomError({
          title: errorObj?.title,
          description: errorObj?.message || errorObj?.description,
          hint: errorObj?.hint,
        });
        setValidationState("error");
      }
    };

    void runVerification();

    return () => {
      isCurrent = false;
    };
  }, [capturedImage, onVerify]);

  const onCaptureCard = () => {
    const success = capturePhoto();
    if (success) setValidationState("checking");
  };

  const onRetryCard = () => {
    setCustomError(null);
    setValidationState("idle");
    retryCapture();
  };

  const onCopyImage = async () => {
    if (!capturedImage) return;
    try {
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    } catch {
      window.open(capturedImage, "_blank");
    }
  };

  return (
    <section className="relative isolate flex h-dvh w-full flex-col overflow-hidden bg-black sm:h-[min(840px,calc(100dvh-3rem))] sm:max-w-md sm:rounded-3xl sm:ring-1 sm:ring-white/10">
      <video
        ref={videoRef}
        autoPlay muted playsInline disablePictureInPicture
        className="absolute inset-0 h-full w-full object-cover"
        aria-label="ภาพสดจากกล้อง"
      />

      <div className="pointer-events-none absolute inset-0 bg-black/30" />

      <CameraHeader onBack={onBack} />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-8 px-6 py-4">
        <CameraGuide
          guideRef={guideRef}
          scannerStatus={scannerStatus}
          autoProgress={autoProgress}
        />
      </div>

      <DebugOverlay metrics={debugMetrics} scannerStatus={scannerStatus} />

      <CaptureButton
        canCapture={canCapture}
        autoProgress={autoProgress}
        onCapture={onCaptureCard}
      />

      <ValidationDialogs
        validationState={validationState}
        capturedImage={capturedImage}
        cameraState={cameraState}
        cameraError={cameraError}
        customError={customError}
        onRetry={onRetryCard}
        onRetryCamera={() => void retryCamera()}
        onCopyImage={onCopyImage}
      />
    </section>
  );
};
