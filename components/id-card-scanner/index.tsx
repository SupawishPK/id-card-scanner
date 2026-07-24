"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useIdCardScanner } from "./use-scanner";
import { CameraHeader, CameraOverlay } from "./camera-views";
import { DebugOverlay, ValidationDialogs } from "./dialog-views";
import { STATUS_UI } from "./theme";

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
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isSuccessVerified, setIsSuccessVerified] = useState<boolean>(false);
  const [showDebug, setShowDebug] = useState<boolean>(true);
  const [verificationError, setVerificationError] = useState<ICustomErrorDetails | null>(null);
  const errorTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  const clearErrorTimer = () => {
    if (errorTimerRef.current) {
      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
  };

  const handleDismissError = useCallback(() => {
    clearErrorTimer();
    setVerificationError(null);
    verifyingImageRef.current = null;
    retryCapture();
  }, [retryCapture]);

  useEffect(() => {
    return () => {
      clearErrorTimer();
    };
  }, []);

  const isStable = scannerStatus === "stable";
  const canCapture = isStable && !capturedImage && !isVerifying && !isSuccessVerified && !verificationError;

  const statusUi = isSuccessVerified
    ? { label: "ตรวจสอบข้อมูลสำเร็จ", dotColor: "bg-emerald-400" }
    : verificationError
      ? { label: verificationError.title || "ตรวจสอบข้อมูลไม่สำเร็จ", dotColor: "bg-rose-500 animate-pulse" }
      : isVerifying || scannerStatus === "stable"
        ? { label: isVerifying ? "กำลังตรวจสอบข้อมูล…" : "กำลังบันทึกภาพ…", dotColor: "bg-rose-500" }
        : STATUS_UI[scannerStatus];

  // Instant auto-capture as soon as card ratio & geometry match
  useEffect(() => {
    if (!canCapture) return;
    vibrate(40);
    capturePhoto();
  }, [canCapture, capturePhoto]);

  const verifyingImageRef = useRef<string | null>(null);

  // Background verification effect
  useEffect(() => {
    if (!capturedImage || verifyingImageRef.current === capturedImage || isSuccessVerified) {
      return;
    }

    verifyingImageRef.current = capturedImage;
    setIsVerifying(true);
    console.log("[Scanner] 📸 ID Card photo captured. Verifying data with API...");

    let canceled = false;

    const runVerification = async () => {
      try {
        const res = await onVerify(capturedImage);
        if (canceled) return;

        if (res && typeof res === "object" && "success" in res && !res.success) {
          const errDetails: ICustomErrorDetails = res.error || {
            title: "ภาพไม่ชัดเจน",
            description: "ระบบไม่สามารถอ่านข้อมูลบนบัตรได้ครบถ้วน กรุณาถ่ายใหม่",
          };
          console.log("[Scanner] ⚠️ Verification failed:", errDetails);
          setVerificationError(errDetails);
          setIsVerifying(false);

          // Keep error message visible for 2.5s so customer has ample time to read
          clearErrorTimer();
          errorTimerRef.current = setTimeout(() => {
            setVerificationError(null);
            verifyingImageRef.current = null;
            retryCapture();
          }, 2500);
        } else {
          console.log("[Scanner] ✅ Verification successful! Saving verified image to sessionStorage...");
          sessionStorage.setItem("captured_id_card", capturedImage);
          if (debugMetrics?.detectedAspect) {
            sessionStorage.setItem("captured_id_card_ratio", debugMetrics.detectedAspect.toFixed(4));
          }
          setIsVerifying(false);
          setIsSuccessVerified(true);
          vibrate([60, 40, 80]);
          setTimeout(() => {
            router.push("/preview");
          }, 150);
        }
      } catch (err) {
        if (canceled) return;
        console.log("[Scanner] ❌ Verification threw error:", err);
        const errDetails: ICustomErrorDetails = {
          title: "ระบบขัดข้อง",
          description: "ไม่สามารถเชื่อมต่อระบบตรวจสอบข้อมูลได้ กรุณาลองใหม่อีกครั้ง",
        };
        setVerificationError(errDetails);
        setIsVerifying(false);

        clearErrorTimer();
        errorTimerRef.current = setTimeout(() => {
          setVerificationError(null);
          verifyingImageRef.current = null;
          retryCapture();
        }, 2500);
      }
    };

    void runVerification();

    return () => {
      canceled = true;
    };
  }, [capturedImage, onVerify, isSuccessVerified, retryCapture, router, debugMetrics]);

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
        statusUi={statusUi}
        isSuccessVerified={isSuccessVerified}
        isVerifying={isVerifying}
        verificationError={verificationError}
        onDismissError={handleDismissError}
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
