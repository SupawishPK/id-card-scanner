"use client";

import { useEffect, useRef, useState } from "react";
import {
  type DetectionDebugMetrics,
  type DetectionState,
  useIdCardScanner,
} from "@/hooks/use-id-card-scanner";
import { CardGuideOverlay } from "@/components/card-guide-overlay";
import { ID_CARD_ASPECT_RATIO } from "@/lib/id-card-scanner-config";

type IdCardScannerProps = {
  className?: string;
  onBack?: () => void;
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

const FLASH_ON_ICON = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-full"
    aria-hidden="true"
  >
    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
  </svg>
);

const FLASH_OFF_ICON = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="size-full"
    aria-hidden="true"
  >
    <path d="M10.513 4.856 13.12 2.17a.5.5 0 0 1 .86.46l-1.377 4.317" />
    <path d="M15.656 10H20a1 1 0 0 1 .78 1.63l-1.72 1.773" />
    <path d="M16.273 16.273 10.88 21.83a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14H4a1 1 0 0 1-.78-1.63l4.507-4.643" />
    <path d="m2 2 20 20" />
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
  text: "วางบัตรนิ่ง ๆ กำลังถ่ายอัตโนมัติ…",
} as const;

const AUTO_CAPTURE_DURATION_MS = 1800;
const MOCK_VALIDATION_DELAY_MS = 1800;
const MOCK_VALIDATION_PASS_RATE = 0.5;
type CaptureMode = "auto" | "manual";
type ValidationState = "idle" | "checking" | "success" | "error";

const safeVibrate = (pattern: number | number[]) => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Ignore vibration errors on unsupported or restricted environments
  }
};

// ──── Debug Overlay ────
function DebugOverlay({
  metrics,
  detectionState,
}: {
  metrics: DetectionDebugMetrics | null;
  detectionState: DetectionState;
}) {
  if (!metrics) return null;

  const buildText = () => {
    const f = (v: number | null | undefined, d = 3) =>
      v == null ? "null" : v.toFixed(d);
    const yn = (v: boolean | null | undefined) => (v ? "Y" : "N");

    return [
      `state=${detectionState}`,
      ``,
      `--- Frame ---`,
      `mean=${f(metrics.mean, 1)}`,
      `variance=${f(metrics.variance, 1)}`,
      `motion=${metrics.motion < 0 ? "null" : f(metrics.motion, 2)}`,
      `edgeDensity=${f(metrics.edgeDensity, 4)}`,
      `usableLight=${yn(metrics.hasUsableLight)}`,
      `cardDetails=${yn(metrics.hasCardDetails)}`,
      `presenceDetails=${yn(metrics.hasPresenceDetails)}`,
      ``,
      `--- Presence ---`,
      `conf=${f(metrics.cardPresenceConfidence)}`,
      `spanCoverage=${f(metrics.presenceSpanCoverage)}`,
      `aspectScore=${f(metrics.presenceAspectScore)}`,
      `minEdge=${f(metrics.presenceMinEdgeScore)}`,
      `minCorner=${f(metrics.presenceMinCornerScore)}`,
      `avgEdge=${f(metrics.presenceAvgEdgeScore)}`,
      `avgCorner=${f(metrics.presenceAvgCornerScore)}`,
      `edge(T/R/B/L)=${f(metrics.presenceEdgeTop)} ${f(metrics.presenceEdgeRight)} ${f(metrics.presenceEdgeBottom)} ${f(metrics.presenceEdgeLeft)}`,
      `corner(TL/TR/BR/BL)=${f(metrics.presenceCornerTL)} ${f(metrics.presenceCornerTR)} ${f(metrics.presenceCornerBR)} ${f(metrics.presenceCornerBL)}`,
      `meetsMin=${yn(metrics.meetsMinimumCard)}`,
      `meetsRelaxed=${yn(metrics.meetsRelaxedCard)}`,
      ``,
      `--- Capture ---`,
      `conf=${f(metrics.captureConfidence)}`,
      `aspectScore=${f(metrics.captureAspectScore)}`,
      `coverageScore=${f(metrics.captureCoverageScore)}`,
      `minEdge=${f(metrics.captureMinEdgeScore)}`,
      `minCorner=${f(metrics.captureMinCornerScore)}`,
      `avgEdge=${f(metrics.captureAvgEdgeScore)}`,
      `avgCorner=${f(metrics.captureAvgCornerScore)}`,
      `bgContrast=${f(metrics.captureInteriorBgContrast, 1)}`,
      `edge(T/R/B/L)=${f(metrics.captureEdgeTop)} ${f(metrics.captureEdgeRight)} ${f(metrics.captureEdgeBottom)} ${f(metrics.captureEdgeLeft)}`,
      `corner(TL/TR/BR/BL)=${f(metrics.captureCornerTL)} ${f(metrics.captureCornerTR)} ${f(metrics.captureCornerBR)} ${f(metrics.captureCornerBL)}`,
      `meetsMinGeom=${yn(metrics.meetsMinimumGeometry)}`,
      `meetsRelaxGeom=${yn(metrics.meetsRelaxedGeometry)}`,
      ``,
      `--- Skew ---`,
      `presSkewScore=${f(metrics.presenceSkewScore)}`,
      `presParallelism=${f(metrics.presenceParallelismScore)}`,
      `presSlopes(T/R/B/L)=${f(metrics.presenceEdgeSlopeTop, 4)} ${f(metrics.presenceEdgeSlopeRight, 4)} ${f(metrics.presenceEdgeSlopeBottom, 4)} ${f(metrics.presenceEdgeSlopeLeft, 4)}`,
      `capSkewScore=${f(metrics.captureSkewScore)}`,
      `capParallelism=${f(metrics.captureParallelismScore)}`,
      `capSlopes(T/R/B/L)=${f(metrics.captureEdgeSlopeTop, 4)} ${f(metrics.captureEdgeSlopeRight, 4)} ${f(metrics.captureEdgeSlopeBottom, 4)} ${f(metrics.captureEdgeSlopeLeft, 4)}`,
    ].join("\n");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildText());
    } catch {
      // fallback
      const ta = document.createElement("textarea");
      ta.value = buildText();
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="absolute right-3 top-3 z-20 rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white/80 backdrop-blur-sm hover:bg-white/20 active:scale-95"
    >
      📋 Copy Debug
    </button>
  );
}

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
    distanceHint,
    capturedImage,
    torchAvailable,
    isTorchOn,
    debugMetrics,
    capturePhoto,
    toggleTorch,
    retryCapture,
    retryCamera,
  } = useIdCardScanner({ videoRef, roiRef: guideRef });

  const isStable = detectionState === "stable";
  const canCapture = isStable && !capturedImage;

  // Surface tilt guidance when card is detected but noticeably skewed
  const isTilted =
    detectionState === "card-detected" &&
    debugMetrics?.captureSkewScore != null &&
    debugMetrics.captureSkewScore < 0.70;

  const baseStatusUi =
    captureMode === "auto" && detectionState === "stable"
      ? AUTO_STABLE_STATUS_UI
      : STATUS_UI[detectionState];

  const statusUi = isTilted
    ? {
        text: "จัดบัตรให้ตรง ไม่เอียง",
        dotClassName: "bg-amber-400 shadow-[0_0_8px_#fbbf24]",
      }
    : autoProgress > 0
      ? AUTO_STABLE_STATUS_UI
      : baseStatusUi;

  // Smooth Auto-capture progress: 0.0 → 1.0 over 1,800ms
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

      // Subtle haptic feedback pulses at 25%, 50%, 75%
      const step = Math.floor(progress * 4);
      if (step > lastVibrateStep && step < 4) {
        lastVibrateStep = step;
        safeVibrate(35);
      }

      if (progress < 1) {
        animFrameId = requestAnimationFrame(animate);
      } else {
        setAutoProgress(0);
        safeVibrate([60, 40, 80]);
        const success = capturePhoto();
        if (success) {
          setValidationState("checking");
        }
      }
    };

    animFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameId);
      setAutoProgress(0);
    };
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
    const success = capturePhoto();
    if (success) {
      setValidationState("checking");
    }
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
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
    } catch {
      // Fallback: open in new tab for manual copy
      window.open(capturedImage, "_blank");
    }
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

      <header className="absolute inset-x-0 top-0 z-10 flex flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] text-white">
        <div className="relative flex items-center justify-center py-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="ย้อนกลับ"
            className="absolute left-0 grid size-9 place-items-center rounded-full text-white/90 hover:bg-white/10"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-6">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold tracking-wide">ถ่ายรูปบัตรประชาชน</h1>
        </div>

        <div className="mt-2 rounded-2xl border border-white/10 bg-black/50 px-5 py-3.5 text-center backdrop-blur-md shadow-lg">
          <p className="text-base font-semibold leading-snug text-white">
            กรุณาถ่ายรูปประชาชนด้านหน้า
          </p>
          <p className="mt-1 text-xs leading-relaxed text-white/80">
            โดยวางบัตรให้ตรงตามกรอบ
          </p>
        </div>
      </header>

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
          <CardGuideOverlay
            canvasRef={guideRef}
            detectionState={detectionState}
            autoProgress={autoProgress}
          />

          <div
            role="status"
            aria-live="polite"
            className="absolute -top-14 left-1/2 w-max max-w-[90vw] -translate-x-1/2 rounded-full bg-black/65 px-4 py-2 text-center text-sm font-medium text-white shadow-lg backdrop-blur-md"
          >
            <span
              className={`mr-2 inline-block size-2.5 rounded-full ${statusUi.dotClassName}`}
            />
            {statusUi.text}
          </div>

        </div>
      </div>

      {/* ──── DEBUG OVERLAY ──── */}
      <DebugOverlay metrics={debugMetrics} detectionState={detectionState} />

      <div className="absolute inset-x-5 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-10 flex flex-col items-center">
        <fieldset
          className="mb-3 grid grid-cols-2 rounded-full bg-black/60 p-1 text-sm font-medium text-white shadow-lg backdrop-blur-md"
          aria-label="เลือกโหมดถ่ายภาพ"
        >
          <legend className="sr-only">เลือกโหมดถ่ายภาพ</legend>
          <label
            className={`grid min-h-10 cursor-pointer place-items-center rounded-full px-4 transition-colors focus-within:outline-2 focus-within:outline-white ${captureMode === "auto"
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
            className={`grid min-h-10 cursor-pointer place-items-center rounded-full px-4 transition-colors focus-within:outline-2 focus-within:outline-white ${captureMode === "manual"
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

        <div className="relative flex w-full items-center justify-center">
          {captureMode === "manual" ? (
            <button
              type="button"
              onClick={handleCapture}
              disabled={!canCapture}
              aria-label={canCapture ? "ถ่ายรูปบัตรประชาชน" : "ยังไม่พร้อมถ่าย กรุณาจัดบัตรให้นิ่ง"}
              className={`size-16 shrink-0 rounded-full transition-[box-shadow,opacity,transform] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${canCapture
                ? "shadow-[0_0_0_3px_rgba(52,211,153,0.65),0_0_24px_rgba(52,211,153,0.55)] active:scale-95 cursor-pointer"
                : "cursor-not-allowed opacity-45"
                }`}
            >
              {CAMERA_ICON}
            </button>
          ) : (
            <div
              className={`grid size-16 shrink-0 place-items-center rounded-full border shadow-lg backdrop-blur-md transition-all duration-150 ${autoProgress > 0
                ? "border-emerald-400/60 bg-emerald-400/15 text-xs font-bold text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.25)]"
                : "border-white/25 bg-black/35 text-[11px] font-semibold tracking-wider text-white"
                }`}
              aria-hidden="true"
            >
              {autoProgress > 0 ? `${Math.round(autoProgress * 100)}%` : "AUTO"}
            </div>
          )}

          {torchAvailable && cameraState === "ready" ? (
            <button
              type="button"
              onClick={() => void toggleTorch()}
              aria-label={isTorchOn ? "ปิดไฟฉาย" : "เปิดไฟฉาย"}
              className={`absolute right-4 top-1/2 -translate-y-1/2 grid size-12 place-items-center rounded-full border shadow-xl backdrop-blur-md transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${isTorchOn
                ? "border-amber-400/80 bg-amber-400 text-slate-950 shadow-[0_0_18px_rgba(251,191,36,0.6)]"
                : "border-white/15 bg-black/60 text-white shadow-lg hover:border-white/30 hover:bg-black/80"
                }`}
            >
              <span className="size-5">
                {isTorchOn ? FLASH_ON_ICON : FLASH_OFF_ICON}
              </span>
            </button>
          ) : null}
        </div>
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

            <button
              type="button"
              onClick={() => void handleCopyImage()}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10 active:scale-95 transition-all"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              คัดลอกรูป (PNG)
            </button>
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
