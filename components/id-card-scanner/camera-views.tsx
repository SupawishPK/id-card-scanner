"use client";

import type { RefObject } from "react";
import type { IScannerStatus } from "./geometry";
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
};

export const CameraOverlay = ({
  guideRef,
  scannerStatus,
  autoProgress,
  statusUi,
  isSuccessVerified,
  isVerifying,
  detectedAspect,
}: ICameraOverlayProps) => (
  <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-5 px-6">
    <div className="w-full max-w-sm rounded-2xl bg-black/45 px-5 py-4 text-center backdrop-blur-sm">
      <p className="text-base font-medium leading-7 text-white">
        กรุณาถ่ายรูปประชาชนด้านหน้า
        <br />
        โดยวางบัตรให้ตรงตามกรอบ
      </p>
    </div>

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
            Ratio {detectedAspect.toFixed(2)}
          </span>
        ) : null}
      </div>

      {/* Text Debug Box */}
      <div className="flex w-full flex-col gap-1.5 rounded-2xl border border-white/10 bg-black/75 p-3.5 text-xs font-mono text-slate-300 shadow-xl backdrop-blur-md">
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
                    isSuccessVerified ? "bg-emerald-400" : "bg-rose-500"
                  }`}
                  style={{
                    width: isSuccessVerified
                      ? "100%"
                      : `${Math.round(autoProgress * 100)}%`,
                  }}
                />
              )}
            </div>
            <span
              className={`w-9 text-right font-semibold ${
                isSuccessVerified
                  ? "text-emerald-400"
                  : isVerifying
                    ? "text-rose-400 animate-pulse"
                    : "text-rose-400"
              }`}
            >
              {isSuccessVerified
                ? "100%"
                : isVerifying
                  ? "BUSY"
                  : `${Math.round(autoProgress * 100)}%`}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 pt-1.5">
          <span className="text-slate-400">API Request:</span>
          <span
            className={`font-semibold ${
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
                ? "SENDING REQUEST..."
                : "IDLE"}
          </span>
        </div>
      </div>
    </div>
  </div>
);
