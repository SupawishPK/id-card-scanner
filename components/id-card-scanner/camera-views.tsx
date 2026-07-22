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
};

export const CameraOverlay = ({
  guideRef,
  scannerStatus,
  autoProgress,
  statusUi,
}: ICameraOverlayProps) => (
  <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-6">
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
      />
    </div>

    <div
      className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-xs font-medium text-white shadow-xl backdrop-blur-md"
      role="status"
      aria-live="polite"
    >
      <span
        className={`size-2 rounded-full transition-colors ${statusUi.dotColor}`}
        aria-hidden="true"
      />
      <span>{statusUi.label}</span>
    </div>
  </div>
);
