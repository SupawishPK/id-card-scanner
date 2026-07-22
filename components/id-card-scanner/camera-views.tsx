"use client";

import type { RefObject } from "react";
import type { IScannerStatus } from "./geometry";
import { ID_CARD_ASPECT_RATIO } from "./config";
import { CardGuideCanvas } from "./guide-canvas";

const BACK_ARROW_ICON = (
  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const CAMERA_ICON = (
  <svg className="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" strokeLinecap="round" strokeLinejoin="round" />
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
      className="absolute left-5 grid size-10 place-items-center text-white transition-opacity active:opacity-60"
      aria-label="ย้อนกลับ"
    >
      {BACK_ARROW_ICON}
    </button>
    <h1 className="text-base font-semibold text-white">ถ่ายรูปบัตรประชาชน</h1>
  </header>
);

export type ICameraGuideProps = {
  guideRef: RefObject<HTMLCanvasElement | null>;
  scannerStatus: IScannerStatus;
  autoProgress: number;
};

export const CameraGuide = ({
  guideRef,
  scannerStatus,
  autoProgress,
}: ICameraGuideProps) => (
  <div className="relative z-10 flex flex-col items-center gap-6 px-6">
    <div className="w-full max-w-sm rounded-xl bg-black/50 px-5 py-3 text-center backdrop-blur-sm">
      <p className="text-sm leading-6 text-white">
        กรุณาถ่ายรูปประชาชนด้านหน้า
        <br />
        โดยวางบัตรให้ตรงตามกรอบ
      </p>
    </div>

    <div
      className="relative w-full max-w-sm"
      style={{ aspectRatio: ID_CARD_ASPECT_RATIO }}
    >
      <CardGuideCanvas
        canvasRef={guideRef}
        scannerStatus={scannerStatus}
        autoProgress={autoProgress}
      />
    </div>
  </div>
);

export type ICaptureButtonProps = {
  canCapture: boolean;
  autoProgress: number;
  onCapture: () => void;
};

export const CaptureButton = ({
  canCapture,
  autoProgress,
  onCapture,
}: ICaptureButtonProps) => (
  <div className="relative z-10 flex flex-col items-center gap-2 pb-[max(2rem,env(safe-area-inset-bottom))]">
    <button
      type="button"
      onClick={onCapture}
      disabled={!canCapture || autoProgress > 0}
      className="grid size-16 place-items-center rounded-full border-2 border-white/60 bg-white/10 text-white backdrop-blur-sm transition-all active:scale-95 disabled:pointer-events-none disabled:opacity-40"
      aria-label="ถ่ายภาพบัตร"
    >
      {CAMERA_ICON}
    </button>
    <span className="text-sm text-white/80">ถ่ายรูป</span>
  </div>
);
