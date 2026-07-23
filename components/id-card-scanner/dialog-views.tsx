"use client";

import type { IDebugMetrics, IScannerStatus } from "./use-scanner";
import { ID_CARD_ASPECT_RATIO } from "./config";
import { COPY_ICON, type IValidationState } from "./theme";

export type IDebugOverlayProps = {
  metrics: IDebugMetrics | null;
  scannerStatus: IScannerStatus;
};

export const DebugOverlay = ({
  metrics,
  scannerStatus,
}: IDebugOverlayProps) => {
  if (!metrics) return null;

  const buildText = () => {
    const f = (v: number | null | undefined, d = 3) =>
      v == null ? "null" : v.toFixed(d);
    const yn = (v: boolean | null | undefined) => (v ? "Y" : "N");

    return [
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
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildText());
    } catch {
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
      onClick={onCopy}
      className="absolute right-3 top-3 z-20 rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white/80 backdrop-blur-sm hover:bg-white/20 active:scale-95"
    >
      📋 Copy Debug
    </button>
  );
};

export type IValidationDialogsProps = {
  cameraState: string;
  cameraError: string | null;
  onRetryCamera: () => void;
};

export const ValidationDialogs = ({
  cameraState,
  cameraError,
  onRetryCamera,
}: IValidationDialogsProps) => {
  if (cameraState !== "ready") {
    return (
      <div className="absolute inset-0 z-20 grid place-items-center bg-slate-950 px-8 text-center text-white">
        {cameraState === "error" ? (
          <div>
            <div
              className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-rose-500/15 text-2xl"
              aria-hidden
            >
              !
            </div>
            <h2 className="text-lg font-semibold">ไม่สามารถเปิดกล้องได้</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">{cameraError}</p>
            <button
              type="button"
              onClick={() => void onRetryCamera()}
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
    );
  }

  return null;
};
