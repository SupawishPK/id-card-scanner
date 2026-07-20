"use client";

import { useEffect, useRef, useState } from "react";
import {
  type DetectionState,
  useIdCardScanner,
} from "@/hooks/use-id-card-scanner";
import { CardGuideOverlay } from "@/components/card-guide-overlay";
import { ID_CARD_ASPECT_RATIO } from "@/lib/id-card";

type IdCardScannerProps = {
  className?: string;
};

const STATUS_TEXT: Record<DetectionState, string> = {
  searching: "นำบัตรเข้ากรอบให้พอดี",
  "hold-still": "พบบัตรแล้ว กรุณาถือให้นิ่ง",
  stable: "ตำแหน่งดีแล้ว กดปุ่มถ่ายรูป",
};

const MOCK_VALIDATION_DELAY_MS = 1800;
const MOCK_VALIDATION_PASS_RATE = 0.5;
type ValidationState = "idle" | "checking" | "success" | "error";

export function IdCardScanner({ className = "" }: IdCardScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const guideRef = useRef<HTMLCanvasElement>(null);
  const [validationState, setValidationState] = useState<ValidationState>("idle");
  const {
    cameraState,
    cameraError,
    detectionState,
    capturedImage,
    capturePhoto,
    retryCapture,
    retryCamera,
  } = useIdCardScanner({ videoRef, roiRef: guideRef });

  const isStable = detectionState === "stable";
  const canCapture = isStable && !capturedImage;

  useEffect(() => {
    if (!capturedImage) return;

    const timeoutId = window.setTimeout(() => {
      // Runs only after hydration; it cannot alter the server-rendered HTML.
      const passed = Math.random() < MOCK_VALIDATION_PASS_RATE;
      setValidationState(passed ? "success" : "error");
    }, MOCK_VALIDATION_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [capturedImage]);

  const handleCapture = () => {
    setValidationState("checking");
    capturePhoto();
  };

  const handleRetry = () => {
    setValidationState("idle");
    retryCapture();
  };

  return (
    <section
      className={`relative isolate h-dvh w-full overflow-hidden bg-black sm:h-[min(840px,calc(100dvh-3rem))] sm:max-w-md sm:rounded-3xl sm:ring-1 sm:ring-white/10 ${className}`}
      aria-label="เครื่องสแกนบัตรประชาชน"
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        disablePictureInPicture
        className="absolute inset-0 h-full w-full object-cover"
        aria-label="ภาพสดจากกล้อง"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/70" />

      <header className="absolute inset-x-0 top-0 z-10 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] text-center text-white">
        <h1 className="text-lg font-semibold">ถ่ายภาพบัตรประชาชน</h1>
        <p className="mt-1 text-sm text-white/75">จัดบัตรให้อยู่ในกรอบ แล้วกดถ่ายเมื่อกรอบเป็นสีเขียว</p>
      </header>

      <div className="absolute inset-0 flex items-center justify-center px-5">
        <div
          className="relative shrink-0 rounded-xl"
          style={{
            // Enlarged responsively while retaining the exact ID-1 ratio.
            // After the 90° visual rotation this becomes a portrait ROI.
            width: "min(112vw, 68dvh, 500px)",
            aspectRatio: ID_CARD_ASPECT_RATIO,
          }}
        >
          <CardGuideOverlay canvasRef={guideRef} detectionState={detectionState} />

          <div className="absolute -top-14 left-1/2 w-max max-w-[90vw] -translate-x-1/2 rounded-full bg-black/65 px-4 py-2 text-center text-sm font-medium text-white shadow-lg backdrop-blur-md">
            <span
              className={`mr-2 inline-block size-2.5 rounded-full ${
                isStable ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-rose-400"
              }`}
            />
            {STATUS_TEXT[detectionState]}
          </div>

        </div>
      </div>

      <div className="absolute inset-x-5 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-10 flex flex-col items-center">
        <p className="mb-3 text-center text-xs leading-5 text-white/70">
          ตรวจจับและประมวลผลบนอุปกรณ์ของคุณ ภาพจะไม่ถูกอัปโหลดอัตโนมัติ
        </p>
        <button
          type="button"
          onClick={handleCapture}
          disabled={!canCapture}
          aria-label={canCapture ? "ถ่ายรูปบัตรประชาชน" : "ยังไม่พร้อมถ่าย กรุณาจัดบัตรให้นิ่ง"}
          className={`group grid size-20 shrink-0 place-items-center rounded-full border-4 p-1.5 transition-[border-color,box-shadow,transform] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${
            canCapture
              ? "border-white bg-black/25 shadow-[0_0_0_3px_rgba(52,211,153,0.65),0_0_24px_rgba(52,211,153,0.55)] active:scale-95"
              : "cursor-not-allowed border-white/30 bg-black/20"
          }`}
        >
          <span
            className={`block size-full rounded-full transition-[background-color,transform] ${
              canCapture
                ? "bg-white group-active:scale-90"
                : "bg-white/25"
            }`}
            aria-hidden="true"
          />
        </button>
      </div>

      {cameraState !== "ready" ? (
        <div className="absolute inset-0 z-20 grid place-items-center bg-slate-950 px-8 text-center text-white">
          {cameraState === "error" ? (
            <div>
              <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-rose-500/15 text-2xl" aria-hidden>
                !
              </div>
              <h2 className="text-lg font-semibold">ไม่สามารถเปิดกล้องได้</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">{cameraError}</p>
              <button
                type="button"
                onClick={() => void retryCamera()}
                className="mt-6 min-h-11 rounded-xl bg-white px-6 py-2.5 font-semibold text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                ลองเปิดกล้องอีกครั้ง
              </button>
            </div>
          ) : (
            <div role="status">
              <div className="mx-auto size-9 animate-spin rounded-full border-2 border-white/25 border-t-white" />
              <p className="mt-4 text-sm text-slate-300">กำลังเปิดกล้อง…</p>
            </div>
          )}
        </div>
      ) : null}

      {capturedImage && validationState === "checking" ? (
        <div
          className="absolute inset-0 z-20 grid place-items-center bg-black/25 px-6 text-center text-white backdrop-blur-[1px]"
          role="status"
          aria-live="polite"
        >
          <div className="rounded-2xl bg-black/70 px-7 py-6 shadow-2xl backdrop-blur-md">
            <div className="mx-auto size-11 animate-spin rounded-full border-2 border-white/25 border-t-emerald-400" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold">กำลังตรวจสอบข้อมูลบัตร</h2>
            <p className="mt-1 text-sm text-white/70">กำลังตรวจสอบความชัดเจนแบบเรียลไทม์…</p>
          </div>
        </div>
      ) : null}

      {capturedImage && validationState === "error" ? (
        <div
          className="absolute inset-0 z-30 grid place-items-center bg-black/45 px-6 text-white backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="validation-error-title"
          aria-describedby="validation-error-description"
        >
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-950/95 p-6 text-center shadow-2xl backdrop-blur-xl">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-rose-500/15 text-2xl font-semibold text-rose-400" aria-hidden="true">
              !
            </div>
            <h2 id="validation-error-title" className="mt-4 text-xl font-semibold">
              ข้อมูลบัตรไม่สมบูรณ์
            </h2>
            <p id="validation-error-description" className="mt-2 text-sm leading-6 text-slate-300">
              ภาพจางหรือมีแสงสะท้อน ทำให้ตรวจสอบข้อมูลบนบัตรได้ไม่ครบถ้วน
            </p>
            <p className="mt-3 text-xs leading-5 text-slate-400">
              เพิ่มแสงให้เพียงพอ และหลีกเลี่ยงเงาหรือแสงสะท้อนบนหน้าบัตร
            </p>
            <button
              type="button"
              onClick={handleRetry}
              autoFocus
              className="mt-6 min-h-12 w-full rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              ถ่ายใหม่
            </button>
          </div>
        </div>
      ) : null}

      {capturedImage && validationState === "success" ? (
        <div
          className="absolute inset-0 z-30 flex flex-col bg-slate-950 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-white"
          role="dialog"
          aria-modal="true"
          aria-labelledby="validation-success-title"
        >
          <div className="my-auto text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-400/15 text-2xl font-semibold text-emerald-400" aria-hidden="true">
              ✓
            </div>
            <h2 id="validation-success-title" className="mt-4 text-xl font-semibold">
              ตรวจสอบข้อมูลสำเร็จ
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              ภาพบัตรชัดเจนและมีข้อมูลครบถ้วน
            </p>

            <img
              src={capturedImage}
              alt="ภาพบัตรจากจังหวะที่กดถ่าย"
              className="mx-auto mt-6 max-h-[56dvh] w-full max-w-sm rounded-2xl border border-emerald-400/35 bg-black object-contain shadow-2xl"
              style={{ aspectRatio: 1 / ID_CARD_ASPECT_RATIO }}
            />
          </div>

          <button
            type="button"
            onClick={handleRetry}
            className="mt-6 min-h-12 w-full rounded-xl border border-white/20 bg-white/5 px-5 py-3 font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            ถ่ายใหม่
          </button>
        </div>
      ) : null}
    </section>
  );
}
