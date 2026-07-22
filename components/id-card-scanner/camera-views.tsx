"use client";

import type { RefObject } from "react";
import type { IScannerStatus } from "./use-scanner";
import { ID_CARD_ASPECT_RATIO } from "./config";
import { CardGuideCanvas } from "./guide-canvas";
import {
  BACK_ARROW_ICON,
  CAMERA_ICON,
  FLASH_OFF_ICON,
  FLASH_ON_ICON,
  type ICaptureMode,
  type IStatusUi,
} from "./theme";

export type ICameraHeaderProps = {
  onBack: () => void;
};

export const CameraHeader = ({ onBack }: ICameraHeaderProps) => (
  <header className="relative z-10 flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))]">
    <button
      type="button"
      onClick={onBack}
      className="grid size-11 place-items-center rounded-full bg-slate-900/60 text-white shadow-lg backdrop-blur-md transition-all hover:bg-slate-900/80 active:scale-95"
      aria-label="ย้อนกลับ"
    >
      {BACK_ARROW_ICON}
    </button>
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
  <div className="relative z-10 my-auto flex flex-col items-center justify-center px-6">
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
      className="mt-6 flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-xs font-medium text-white shadow-xl backdrop-blur-md"
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

export type ICameraControlsProps = {
  captureMode: ICaptureMode;
  onModeChange: (mode: ICaptureMode) => void;
  canCapture: boolean;
  autoProgress: number;
  torchAvailable: boolean;
  cameraState: string;
  isTorchOn: boolean;
  onCapture: () => void;
  onToggleTorch: () => void;
};

export const CameraControls = ({
  captureMode,
  onModeChange,
  canCapture,
  autoProgress,
  torchAvailable,
  cameraState,
  isTorchOn,
  onCapture,
  onToggleTorch,
}: ICameraControlsProps) => (
  <footer className="relative z-10 flex flex-col items-center gap-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-2">
    <div className="flex items-center gap-1 rounded-full bg-slate-900/60 p-1 backdrop-blur-md">
      <button
        type="button"
        onClick={() => onModeChange("auto")}
        className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
          captureMode === "auto"
            ? "bg-white text-slate-950 shadow-sm"
            : "text-slate-300 hover:text-white"
        }`}
      >
        อัตโนมัติ
      </button>
      <button
        type="button"
        onClick={() => onModeChange("manual")}
        className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all ${
          captureMode === "manual"
            ? "bg-white text-slate-950 shadow-sm"
            : "text-slate-300 hover:text-white"
        }`}
      >
        กดถ่ายเอง
      </button>
    </div>

    <div className="flex w-full items-center justify-around px-8">
      <div className="size-12" />

      <button
        type="button"
        onClick={onCapture}
        disabled={!canCapture || autoProgress > 0}
        className="group relative grid size-20 place-items-center rounded-full bg-white/20 p-1.5 transition-transform active:scale-95 disabled:pointer-events-none disabled:opacity-40"
        aria-label="ถ่ายภาพบัตร"
      >
        <div className="grid size-full place-items-center rounded-full bg-white text-slate-950 shadow-2xl transition-transform group-hover:scale-105">
          {CAMERA_ICON}
        </div>
      </button>

      {torchAvailable && cameraState === "ready" ? (
        <button
          type="button"
          onClick={onToggleTorch}
          className={`grid size-12 place-items-center rounded-full text-white backdrop-blur-md transition-all active:scale-95 ${
            isTorchOn
              ? "bg-amber-400 text-slate-950 shadow-lg"
              : "bg-slate-900/60 hover:bg-slate-900/80"
          }`}
          aria-label={isTorchOn ? "ปิดแฟลช" : "เปิดแฟลช"}
        >
          {isTorchOn ? FLASH_ON_ICON : FLASH_OFF_ICON}
        </button>
      ) : (
        <div className="size-12" />
      )}
    </div>
  </footer>
);
