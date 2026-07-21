"use client";

import { useEffect, useRef, useState } from "react";
import {
  type DetectionState,
  useIdCardScanner,
} from "@/hooks/use-id-card-scanner";
import { CardGuideOverlay } from "@/components/card-guide-overlay";
import { ID_CARD_ASPECT_RATIO } from "@/lib/id-card-scanner-config";

type IdCardScannerProps = {
  className?: string;
};

const CAMERA_ICON = (
  <svg
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="size-full"
    aria-hidden="true"
  >
    <circle cx="32" cy="32" r="32" fill="white" />
    <circle cx="32" cy="32" r="29" fill="#0E1329" />
    <circle cx="32" cy="32" r="27" fill="white" />
    <path
      d="M34.472 23.8333L36.607 26.1667H41.332V40.1667H22.6654V26.1667H27.3904L29.5254 23.8333H34.472ZM35.4987 21.5H28.4987L26.3637 23.8333H22.6654C21.382 23.8333 20.332 24.8833 20.332 26.1667V40.1667C20.332 41.45 21.382 42.5 22.6654 42.5H41.332C42.6154 42.5 43.6654 41.45 43.6654 40.1667V26.1667C43.6654 24.8833 42.6154 23.8333 41.332 23.8333H37.6337L35.4987 21.5ZM31.9987 29.6667C33.9237 29.6667 35.4987 31.2417 35.4987 33.1667C35.4987 35.0917 33.9237 36.6667 31.9987 36.6667C30.0737 36.6667 28.4987 35.0917 28.4987 33.1667C28.4987 31.2417 30.0737 29.6667 31.9987 29.6667ZM31.9987 27.3333C28.7787 27.3333 26.1654 29.9467 26.1654 33.1667C26.1654 36.3867 28.7787 39 31.9987 39C35.2187 39 37.832 36.3867 37.832 33.1667C37.832 29.9467 35.2187 27.3333 31.9987 27.3333Z"
      fill="#565A69"
    />
  </svg>
);

const TORCH_ON_ICON = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="size-full"
    aria-hidden="true"
  >
    <path
      d="M12 2v1m0 18v1m10-10h-1M3 12H2m17.07-7.07l-.39.39M5.32 18.68l-.39.39m13.14-.39l.39.39M5.32 5.32l-.39-.39M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
  </svg>
);

const TORCH_OFF_ICON = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="size-full"
    aria-hidden="true"
  >
    <path
      d="M12 2v1m0 18v1m10-10h-1M3 12H2m17.07-7.07l-.39.39M5.32 18.68l-.39.39m13.14-.39l.39.39M5.32 5.32l-.39-.39M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      fill="none"
    />
    <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const STATUS_UI: Record<
  DetectionState,
  { text: string; dotClassName: string }
> = {
  searching: {
    text: "วางบัตรให้ตรงกรอบ",
    dotClassName: "bg-white shadow-[0_0_8px_rgba(255,255,255,0.75)]",
  },
  "card-detected": {
    text: "จัดบัตรให้พอดีกรอบ",
    dotClassName: "bg-rose-400 shadow-[0_0_8px_#fb7185]",
  },
  "hold-still": {
    text: "ถือบัตรให้นิ่งสักครู่",
    dotClassName: "bg-rose-400 shadow-[0_0_8px_#fb7185]",
  },
  stable: {
    text: "ตำแหน่งดีแล้ว กดปุ่มถ่ายรูป",
    dotClassName: "bg-emerald-400 shadow-[0_0_8px_#34d399]",
  },
};

const AUTO_STABLE_STATUS_UI = {
  ...STATUS_UI.stable,
  text: "ตำแหน่งดีแล้ว กำลังถ่ายอัตโนมัติ…",
} as const;

const AUTO_CAPTURE_DELAY_MS = 700;
const MOCK_VALIDATION_DELAY_MS = 1800;
const MOCK_VALIDATION_PASS_RATE = 0.5;
type CaptureMode = "auto" | "manual";
type ValidationState = "idle" | "checking" | "success" | "error";

export function IdCardScanner({ className = "" }: IdCardScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const guideRef = useRef<HTMLCanvasElement>(null);
  const [captureMode, setCaptureMode] = useState<CaptureMode>("auto");
  const [validationState, setValidationState] = useState<ValidationState>("idle");
  const {
    cameraState,
    cameraError,
    detectionState,
    capturedImage,
    torchAvailable,
    isTorchOn,
    capturePhoto,
    toggleTorch,
    retryCapture,
    retryCamera,
  } = useIdCardScanner({ videoRef, roiRef: guideRef });

  const isStable = detectionState === "stable";
  const canCapture = isStable && !capturedImage;
  const statusUi =
    captureMode === "auto" && detectionState === "stable"
      ? AUTO_STABLE_STATUS_UI
      : STATUS_UI[detectionState];

  useEffect(() => {
    if (captureMode !== "auto" || !canCapture) return;

    const timeoutId = window.setTimeout(() => {
      setValidationState("checking");
      capturePhoto();
    }, AUTO_CAPTURE_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [canCapture, captureMode, capturePhoto]);

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
        <p className="mt-1 text-sm text-white/75">
          {captureMode === "auto"
            ? "ระบบจะถ่ายอัตโนมัติเมื่อบัตรอยู่ในตำแหน่งที่เหมาะสม"
            : "จัดบัตรให้อยู่ในกรอบ แล้วกดถ่ายเมื่อกรอบเป็นสีเขียว"}
        </p>
      </header>

      {torchAvailable && cameraState === "ready" ? (
        <button
          type="button"
          onClick={() => void toggleTorch()}
          aria-label={isTorchOn ? "ปิดไฟฉาย" : "เปิดไฟฉาย"}
          aria-pressed={isTorchOn}
          className={`absolute right-4 top-[max(1.25rem,env(safe-area-inset-top))] z-10 grid size-10 place-items-center rounded-full shadow-lg backdrop-blur-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
            isTorchOn
              ? "bg-amber-400/90 text-slate-950"
              : "bg-black/55 text-white/80 hover:text-white"
          }`}
        >
          <span className="size-5">
            {isTorchOn ? TORCH_ON_ICON : TORCH_OFF_ICON}
          </span>
        </button>
      ) : null}

      <div className="absolute inset-0 flex items-center justify-center px-5">
        <div
          className="relative shrink-0 rounded-xl"
          style={{
            // The parent already contributes 20px horizontal padding; subtract
            // another 16px so the guideline sits 28px from each scanner edge.
            width: "min(calc(100% - 1rem), 68dvh)",
            aspectRatio: ID_CARD_ASPECT_RATIO,
          }}
        >
          <CardGuideOverlay canvasRef={guideRef} detectionState={detectionState} />

          <div className="absolute -top-14 left-1/2 w-max max-w-[90vw] -translate-x-1/2 rounded-full bg-black/65 px-4 py-2 text-center text-sm font-medium text-white shadow-lg backdrop-blur-md">
            <span
              className={`mr-2 inline-block size-2.5 rounded-full ${statusUi.dotClassName}`}
            />
            {statusUi.text}
          </div>

        </div>
      </div>

      <div className="absolute inset-x-5 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-10 flex flex-col items-center">
        <fieldset
          className="mb-3 grid grid-cols-2 rounded-full bg-black/60 p-1 text-sm font-medium text-white shadow-lg backdrop-blur-md"
          aria-label="เลือกโหมดถ่ายภาพ"
        >
          <legend className="sr-only">เลือกโหมดถ่ายภาพ</legend>
          <label
            className={`grid min-h-10 cursor-pointer place-items-center rounded-full px-4 transition-colors focus-within:outline-2 focus-within:outline-white ${
              captureMode === "auto"
                ? "bg-white text-slate-950"
                : "text-white/70 hover:text-white"
            }`}
          >
            <input
              type="radio"
              name="captureMode"
              value="auto"
              checked={captureMode === "auto"}
              onChange={() => setCaptureMode("auto")}
              className="sr-only"
            />
            อัตโนมัติ
          </label>
          <label
            className={`grid min-h-10 cursor-pointer place-items-center rounded-full px-4 transition-colors focus-within:outline-2 focus-within:outline-white ${
              captureMode === "manual"
                ? "bg-white text-slate-950"
                : "text-white/70 hover:text-white"
            }`}
          >
            <input
              type="radio"
              name="captureMode"
              value="manual"
              checked={captureMode === "manual"}
              onChange={() => setCaptureMode("manual")}
              className="sr-only"
            />
            กดถ่ายเอง
          </label>
        </fieldset>
        <p className="mb-3 text-center text-xs leading-5 text-white/70">
          ตรวจจับและประมวลผลบนอุปกรณ์ของคุณ ภาพจะไม่ถูกอัปโหลดอัตโนมัติ
        </p>
        {captureMode === "manual" ? (
          <button
            type="button"
            onClick={handleCapture}
            disabled={!canCapture}
            aria-label={canCapture ? "ถ่ายรูปบัตรประชาชน" : "ยังไม่พร้อมถ่าย กรุณาจัดบัตรให้นิ่ง"}
            className={`size-16 shrink-0 rounded-full transition-[box-shadow,opacity,transform] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${
              canCapture
                ? "shadow-[0_0_0_3px_rgba(52,211,153,0.65),0_0_24px_rgba(52,211,153,0.55)] active:scale-95"
                : "cursor-not-allowed opacity-45"
            }`}
          >
            {CAMERA_ICON}
          </button>
        ) : (
          <div
            className="grid size-16 shrink-0 place-items-center rounded-full border border-white/25 bg-black/35 text-[11px] font-semibold tracking-wider text-white shadow-lg backdrop-blur-md"
            aria-hidden="true"
          >
            AUTO
          </div>
        )}
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
          aria-describedby="validation-success-description"
        >
          <div className="my-auto text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-400/15 text-2xl font-semibold text-emerald-400" aria-hidden="true">
              ✓
            </div>
            <h2 id="validation-success-title" className="mt-4 text-xl font-semibold">
              ตรวจสอบข้อมูลสำเร็จ
            </h2>
            <p id="validation-success-description" className="mt-2 text-sm text-slate-400">
              ภาพบัตรชัดเจนและมีข้อมูลครบถ้วน
            </p>

            <div
              className="relative mx-auto mt-6 w-full max-w-sm overflow-hidden rounded-2xl border border-emerald-400/35 bg-black shadow-2xl"
              style={{ aspectRatio: ID_CARD_ASPECT_RATIO }}
            >
              <img
                src={capturedImage}
                alt="ภาพบัตรจากจังหวะที่กดถ่าย"
                className="absolute inset-0 size-full object-cover"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleRetry}
            autoFocus
            className="mt-6 min-h-12 w-full rounded-xl border border-white/20 bg-white/5 px-5 py-3 font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            ถ่ายใหม่
          </button>
        </div>
      ) : null}
    </section>
  );
}
