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
  detectedAspect,
  showDebug = false,
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
    <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-5 px-6">
      {/* Top Banner: Instruction or Debug Panel Swap */}
      {showDebug ? (
        <div className="flex w-full max-w-sm flex-col gap-1.5 rounded-2xl border border-white/10 bg-black/80 p-3.5 text-xs font-mono text-slate-300 shadow-xl backdrop-blur-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Detect Status:</span>
            <span className="font-semibold text-white uppercase">{scannerStatus}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Progress:</span>
            <div className="flex items-center gap-2">
              <div className="relative h-1.5 w-24 overflow-hidden rounded-full bg-white/20">
                {isVerifying ? (
                  <div className="absolute inset-0 size-full bg-rose-950/80">
                    <div className="size-full bg-gradient-to-r from-transparent via-rose-400 to-transparent animate-progress-shimmer" />
                  </div>
                ) : (
                  <div
                    className={`h-full transition-all duration-75 ${
                      isSuccessVerified
                        ? "bg-emerald-400"
                        : scannerStatus !== "searching"
                          ? "bg-rose-500 w-full"
                          : "w-0"
                    }`}
                  />
                )}
              </div>
              <span
                className={`w-9 text-right font-semibold ${
                  isSuccessVerified
                    ? "text-emerald-400"
                    : isVerifying
                      ? "text-rose-400 animate-pulse"
                      : scannerStatus !== "searching"
                        ? "text-rose-400"
                        : "text-slate-500"
                }`}
              >
                {isSuccessVerified
                  ? "100%"
                  : isVerifying
                    ? "BUSY"
                    : scannerStatus !== "searching"
                      ? "READY"
                      : "0%"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-1.5">
            <span className="shrink-0 text-slate-400">API Request:</span>
            <span
              className={`ml-auto text-right font-semibold ${
                isSuccessVerified
                  ? "text-emerald-400"
                  : isVerifying
                    ? "text-rose-400 animate-pulse"
                    : "text-slate-500"
              }`}
            >
              {isSuccessVerified
                ? "SUCCESS (200)"
                : isVerifying
                  ? "SENDING..."
                  : "IDLE"}
            </span>
          </div>

          {metrics ? (
            <button
              type="button"
              onClick={onCopyMetrics}
              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/10 py-1.5 text-[11px] font-medium text-white transition-all hover:bg-white/20 active:scale-[.98]"
            >
              {copied ? (
                <span className="font-semibold text-emerald-400">✓ คัดลอก Debug Data เรียบร้อย!</span>
              ) : (
                <span>📋 คัดลอก Debug Data</span>
              )}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="w-full max-w-sm rounded-2xl bg-black/45 px-5 py-4 text-center backdrop-blur-sm">
          <p className="text-base font-medium leading-7 text-white">
            กรุณาถ่ายรูปประชาชนด้านหน้า
            <br />
            โดยวางบัตรให้ตรงตามกรอบ
          </p>
        </div>
      )}

      <div
        className="relative w-full max-w-sm rounded-2xl"
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

      <div className="flex w-full max-w-sm flex-col items-center gap-3">
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
