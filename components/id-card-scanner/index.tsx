"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useIdCardScanner } from "./use-scanner";
import { CameraHeader, CameraOverlay } from "./camera-views";
import { DebugOverlay, ValidationDialogs } from "./dialog-views";
import {
  AUTO_CAPTURE_DURATION_MS,
  AUTO_STABLE_STATUS,
  STATUS_UI,
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
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const guideRef = useRef<HTMLCanvasElement>(null);
  const [autoProgress, setAutoProgress] = useState<number>(0);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isSuccessVerified, setIsSuccessVerified] = useState<boolean>(false);
  const [showDebug, setShowDebug] = useState<boolean>(false);

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
  const canCapture = isStable && !capturedImage && !isVerifying && !isSuccessVerified;

  const statusUi = isSuccessVerified
    ? { label: "ตรวจสอบข้อมูลสำเร็จ", dotColor: "bg-emerald-400" }
    : isVerifying || autoProgress > 0 || scannerStatus === "stable"
      ? { label: isVerifying ? "กำลังตรวจสอบข้อมูล…" : "กำลังบันทึกภาพ…", dotColor: "bg-rose-500" }
      : STATUS_UI[scannerStatus];

  // Instant auto-capture as soon as card ratio & geometry match
  useEffect(() => {
    if (!canCapture) return;
    vibrate(40);
    capturePhoto();
  }, [canCapture, capturePhoto]);

  const verifyingImageRef = useRef<string | null>(null);

  // Secret background verification effect
  useEffect(() => {
    if (!capturedImage || verifyingImageRef.current === capturedImage || isSuccessVerified) {
      return;
    }

    verifyingImageRef.current = capturedImage;
    setIsVerifying(true);
    console.log("[Scanner] 📸 ID Card photo captured. Secretly verifying data with API in background...");

    let canceled = false;

    const runVerification = async () => {
      try {
        const res = await onVerify(capturedImage);
        if (canceled) return;

        if (res && typeof res === "object" && "success" in res && !res.success) {
          console.log("[Scanner] ⚠️ Verification failed silently. Resetting scanner for next scan...");
          verifyingImageRef.current = null;
          setIsVerifying(false);
          retryCapture();
        } else {
          console.log("[Scanner] ✅ Verification successful! Saving verified image to sessionStorage...");
          sessionStorage.setItem("captured_id_card", capturedImage);
          setIsVerifying(false);
          setIsSuccessVerified(true);
          vibrate([60, 40, 80]);
          setTimeout(() => {
            router.push("/preview");
          }, 150);
        }
      } catch (err) {
        if (canceled) return;
        console.log("[Scanner] ❌ Verification threw error silently:", err);
        verifyingImageRef.current = null;
        setIsVerifying(false);
        retryCapture();
      }
    };

    void runVerification();

    return () => {
      canceled = true;
    };
  }, [capturedImage, onVerify, isSuccessVerified, retryCapture, router]);

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

      <CameraOverlay
        guideRef={guideRef}
        scannerStatus={scannerStatus}
        autoProgress={autoProgress}
        statusUi={statusUi}
        isSuccessVerified={isSuccessVerified}
        isVerifying={isVerifying}
        detectedAspect={debugMetrics?.detectedAspect}
        showDebug={showDebug}
        onToggleDebug={() => setShowDebug((prev) => !prev)}
        metrics={debugMetrics}
      />

      <DebugOverlay
        metrics={debugMetrics}
        scannerStatus={scannerStatus}
        showDebug={showDebug}
      />

      <div className="relative z-10 pb-[max(2rem,env(safe-area-inset-bottom))]" />

      <ValidationDialogs
        cameraState={cameraState}
        cameraError={cameraError}
        onRetryCamera={() => void retryCamera()}
      />
    </section>
  );
};
