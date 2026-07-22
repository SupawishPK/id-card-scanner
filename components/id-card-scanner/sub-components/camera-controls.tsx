"use client";

import type { CameraState } from "@/hooks/use-id-card-scanner";
import { CAMERA_ICON, FLASH_ON_ICON, FLASH_OFF_ICON, type CaptureMode } from "../constants/scanner-ui.config";

export function CameraControls({
  captureMode,
  onModeChange,
  canCapture,
  autoProgress,
  torchAvailable,
  cameraState,
  isTorchOn,
  onCapture,
  onToggleTorch,
}: {
  captureMode: CaptureMode;
  onModeChange: (mode: CaptureMode) => void;
  canCapture: boolean;
  autoProgress: number;
  torchAvailable: boolean;
  cameraState: CameraState;
  isTorchOn: boolean;
  onCapture: () => void;
  onToggleTorch: () => void;
}) {
  return (
    <div className="absolute inset-x-5 bottom-[max(1.25rem,env(safe-area-inset-bottom))] z-10 flex flex-col items-center">
      {/* Mode selector */}
      <fieldset
        className="mb-3 grid grid-cols-2 rounded-full bg-black/60 p-1 text-sm font-medium text-white shadow-lg backdrop-blur-md"
        aria-label="เลือกโหมดถ่ายภาพ"
      >
        <legend className="sr-only">เลือกโหมดถ่ายภาพ</legend>
        <label
          className={`grid min-h-10 cursor-pointer place-items-center rounded-full px-4 transition-colors focus-within:outline-2 focus-within:outline-white ${
            captureMode === "auto" ? "bg-white text-slate-950" : "text-white/70 hover:text-white"
          }`}
        >
          <input type="radio" name="captureMode" value="auto" checked={captureMode === "auto"} onChange={() => onModeChange("auto")} className="sr-only" />
          อัตโนมัติ
        </label>
        <label
          className={`grid min-h-10 cursor-pointer place-items-center rounded-full px-4 transition-colors focus-within:outline-2 focus-within:outline-white ${
            captureMode === "manual" ? "bg-white text-slate-950" : "text-white/70 hover:text-white"
          }`}
        >
          <input type="radio" name="captureMode" value="manual" checked={captureMode === "manual"} onChange={() => onModeChange("manual")} className="sr-only" />
          กดถ่ายเอง
        </label>
      </fieldset>

      {/* Capture button + torch */}
      <div className="relative flex w-full items-center justify-center">
        {captureMode === "manual" ? (
          <button
            type="button"
            onClick={onCapture}
            disabled={!canCapture}
            aria-label={canCapture ? "ถ่ายรูปบัตรประชาชน" : "ยังไม่พร้อมถ่าย กรุณาจัดบัตรให้นิ่ง"}
            className={`size-16 shrink-0 rounded-full transition-[box-shadow,opacity,transform] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${
              canCapture
                ? "shadow-[0_0_0_3px_rgba(52,211,153,0.65),0_0_24px_rgba(52,211,153,0.55)] active:scale-95 cursor-pointer"
                : "cursor-not-allowed opacity-45"
            }`}
          >
            {CAMERA_ICON}
          </button>
        ) : (
          <div
            className={`grid size-16 shrink-0 place-items-center rounded-full border shadow-lg backdrop-blur-md transition-all duration-150 ${
              autoProgress > 0
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
            onClick={onToggleTorch}
            aria-label={isTorchOn ? "ปิดไฟฉาย" : "เปิดไฟฉาย"}
            className={`absolute right-4 top-1/2 -translate-y-1/2 grid size-12 place-items-center rounded-full border shadow-xl backdrop-blur-md transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
              isTorchOn
                ? "border-amber-400/80 bg-amber-400 text-slate-950 shadow-[0_0_18px_rgba(251,191,36,0.6)]"
                : "border-white/15 bg-black/60 text-white shadow-lg hover:border-white/30 hover:bg-black/80"
            }`}
          >
            <span className="size-5">{isTorchOn ? FLASH_ON_ICON : FLASH_OFF_ICON}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
