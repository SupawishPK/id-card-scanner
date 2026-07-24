import { type RefObject, useState } from "react";
import type { IDebugMetrics, IScannerStatus } from "./geometry";
import { ID_CARD_ASPECT_RATIO } from "./config";
import { CardGuideCanvas } from "./guide-canvas";
import { type IStatusUi } from "./theme";

const BACK_ARROW_ICON = (
  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

export type ICameraHeaderProps = {
  onBack: () => void;
};

export const CameraHeader = ({ onBack }: ICameraHeaderProps) => (
  <header className="relative z-10 flex items-center justify-center px-5 pt-[max(1rem,env(safe-area-inset-top))]">
    <button
      type="button"
      onClick={onBack}
      className="absolute left-4 grid size-10 place-items-center text-white transition-opacity active:opacity-60"
      aria-label="ย้อนกลับ"
    >
      {BACK_ARROW_ICON}
    </button>
    <h1 className="text-base font-semibold text-white">ถ่ายรูปบัตรประชาชน</h1>
  </header>
);

export type ICameraOverlayProps = {
  guideRef: RefObject<HTMLCanvasElement | null>;
  scannerStatus: IScannerStatus;
  autoProgress: number;
  statusUi: IStatusUi;
  isSuccessVerified?: boolean;
  isVerifying?: boolean;
  verificationError?: {
    title?: string;
    description?: string;
    hint?: string;
  } | null;
  onDismissError?: () => void;
  detectedAspect?: number;
  showDebug?: boolean;
  onToggleDebug?: () => void;
  metrics?: IDebugMetrics | null;
};

export const CameraOverlay = ({
  guideRef,
  scannerStatus,
  autoProgress,
  statusUi,
  isSuccessVerified,
  isVerifying,
  verificationError,
  onDismissError,
  detectedAspect,
  showDebug = true,
  onToggleDebug,
  metrics,
}: ICameraOverlayProps) => {
  const [copied, setCopied] = useState(false);

  const onCopyMetrics = async () => {
    if (!metrics) return;
    const f = (v: number | null | undefined, d = 3) => (v == null ? "null" : v.toFixed(d));
    const yn = (v: boolean | null | undefined) => (v ? "Y" : "N");
    const text = [
      `status=${scannerStatus}`,
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
      `--- Confidence ---`,
      `presenceConf=${f(metrics.presenceConfidence)}`,
      `alignmentConf=${f(metrics.alignmentConfidence)}`,
      `coverageScore=${f(metrics.coverageScore)}`,
      `aspectScore=${f(metrics.aspectScore)}`,
      `skewScore=${f(metrics.skewScore)}`,
      `parallelismScore=${f(metrics.parallelismScore)}`,
      `minEdge=${f(metrics.minEdgeScore)}`,
      `minCorner=${f(metrics.minCornerScore)}`,
      `avgEdge=${f(metrics.avgEdgeScore)}`,
      `avgCorner=${f(metrics.avgCornerScore)}`,
      `bgContrast=${f(metrics.interiorBgContrast, 1)}`,
      `meetsMinGeom=${yn(metrics.meetsMinimumGeometry)}`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative z-10 flex flex-1 flex-col items-center justify-between px-6 py-3">
      {/* Error Notification Toast Card */}
      {verificationError ? (
        <div className="absolute inset-x-4 top-2 z-30 flex flex-col gap-2 rounded-2xl border border-rose-500/40 bg-rose-950/95 p-4 text-white shadow-2xl backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-rose-500/20 text-rose-400">
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>

            <div className="flex flex-1 flex-col gap-0.5">
              <h3 className="text-sm font-semibold text-rose-200">
                {verificationError.title || "ตรวจสอบข้อมูลไม่สำเร็จ"}
              </h3>
              {verificationError.description ? (
                <p className="text-xs leading-relaxed text-rose-100/90">
                  {verificationError.description}
                </p>
              ) : null}
              {verificationError.hint ? (
                <p className="mt-1 text-[11px] font-medium text-rose-300/80">
                  💡 {verificationError.hint}
                </p>
              ) : null}
            </div>

            {onDismissError ? (
              <button
                type="button"
                onClick={onDismissError}
                className="shrink-0 rounded-lg bg-rose-500/20 px-2.5 py-1 text-xs font-medium text-rose-200 transition-colors hover:bg-rose-500/30 active:scale-95"
              >
                ลองใหม่
              </button>
            ) : null}
          </div>

          <div className="relative mt-1 h-1 w-full overflow-hidden rounded-full bg-rose-950/50">
            <div className="h-full bg-rose-500 animate-error-progress" />
          </div>
        </div>
      ) : null}

      {/* Top Fixed Height Container (Prevents frame guideline displacement) */}
      <div className="relative flex h-36 w-full max-w-sm shrink-0 items-center justify-center">
        {showDebug ? (
          <div className="flex w-full flex-col gap-1 rounded-2xl border border-white/10 bg-black/85 px-3.5 py-2.5 text-[11px] font-mono text-slate-300 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Detect:</span>
              <span className="font-semibold text-white uppercase">{scannerStatus}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Progress:</span>
              <div className="flex items-center gap-1.5">
                <div className="relative h-1 w-16 overflow-hidden rounded-full bg-white/20">
                  {isVerifying ? (
                    <div className="absolute inset-0 size-full bg-rose-950/80">
                      <div className="size-full bg-gradient-to-r from-transparent via-rose-400 to-transparent animate-progress-shimmer" />
                    </div>
                  ) : (
                    <div
                      className={`h-full transition-all duration-75 ${
                        isSuccessVerified
                          ? "bg-emerald-400"
                          : verificationError
                            ? "bg-rose-500 w-full"
                            : scannerStatus !== "searching"
                              ? "bg-rose-500 w-full"
                              : "w-0"
                      }`}
                    />
                  )}
                </div>
                <span
                  className={`w-7 text-right font-semibold text-[10px] ${
                    isSuccessVerified
                      ? "text-emerald-400"
                      : verificationError
                        ? "text-rose-400"
                        : isVerifying
                          ? "text-rose-400 animate-pulse"
                          : scannerStatus !== "searching"
                            ? "text-rose-400"
                            : "text-slate-500"
                  }`}
                >
                  {isSuccessVerified
                    ? "100%"
                    : verificationError
                      ? "FAIL"
                      : isVerifying
                        ? "BUSY"
                        : scannerStatus !== "searching"
                          ? "READY"
                          : "0%"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-1 border-t border-white/10 pt-1">
              <span className="shrink-0 text-slate-400">API:</span>
              <span
                className={`ml-auto text-right font-semibold text-[10px] ${
                  isSuccessVerified
                    ? "text-emerald-400"
                    : verificationError
                      ? "text-rose-400 font-semibold"
                      : isVerifying
                        ? "text-rose-400 animate-pulse"
                        : "text-slate-500"
                }`}
              >
                {isSuccessVerified
                  ? "SUCCESS (200)"
                  : verificationError
                    ? "FAIL (400)"
                    : isVerifying
                      ? "SENDING..."
                      : "IDLE"}
              </span>
            </div>

            {metrics ? (
              <button
                type="button"
                onClick={onCopyMetrics}
                className="mt-0.5 flex w-full items-center justify-center gap-1 rounded-lg border border-white/15 bg-white/10 py-1 text-[10px] font-medium text-white transition-all hover:bg-white/20 active:scale-[.98]"
              >
                {copied ? (
                  <span className="font-semibold text-emerald-400">✓ คัดลอก Debug เรียบร้อย</span>
                ) : (
                  <span>📋 คัดลอก Debug Data</span>
                )}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="w-full rounded-2xl bg-black/45 px-5 py-3.5 text-center backdrop-blur-sm">
            <p className="text-sm font-medium leading-6 text-white">
              กรุณาถ่ายรูปประชาชนด้านหน้า
              <br />
              โดยวางบัตรให้ตรงตามกรอบ
            </p>
          </div>
        )}
      </div>

      <div
        className="relative w-full max-w-sm shrink-0 rounded-2xl"
        style={{ aspectRatio: ID_CARD_ASPECT_RATIO }}
      >
        <CardGuideCanvas
          canvasRef={guideRef}
          scannerStatus={scannerStatus}
          autoProgress={autoProgress}
          isSuccessVerified={isSuccessVerified}
          isVerifying={isVerifying}
        />
      </div>

      <div className="flex h-24 w-full max-w-sm shrink-0 flex-col items-center justify-center gap-3">
        {/* Status Pill */}
        <div
          className="flex items-center gap-2.5 rounded-full border border-white/10 bg-black/60 px-4.5 py-2 text-xs font-medium text-white shadow-2xl backdrop-blur-xl transition-all"
          role="status"
          aria-live="polite"
        >
          <span
            className={`size-2 rounded-full transition-colors ${statusUi.dotColor}`}
            aria-hidden="true"
          />
          <span>{statusUi.label}</span>
          {detectedAspect && detectedAspect > 0 ? (
            <span className="border-l border-white/15 pl-2.5 font-mono text-[11px] text-white/50">
              Ratio {detectedAspect.toFixed(4)}
            </span>
          ) : null}
        </div>

        {/* Bottom Debug Toggle Button */}
        <button
          type="button"
          onClick={onToggleDebug}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-mono transition-all active:scale-95 ${
            showDebug
              ? "border border-amber-400/50 bg-amber-500/20 text-amber-300 shadow-lg"
              : "border border-white/15 bg-black/50 text-white/70 hover:bg-white/10 hover:text-white"
          }`}
          aria-label="ซ่อน/แสดง Debug Info"
        >
          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <span>{showDebug ? "ซ่อน Debug Info" : "⚙️ แสดง Debug Info"}</span>
        </button>
      </div>
    </div>
  );
};
