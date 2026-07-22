"use client";

import { BACK_ARROW_ICON } from "../constants/scanner-ui.config";

export function CameraHeader({ onBack }: { onBack?: () => void }) {
  return (
    <header className="absolute inset-x-0 top-0 z-10 flex flex-col px-5 pt-[max(1.25rem,env(safe-area-inset-top))] text-white">
      <div className="relative flex items-center justify-center py-2">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="ย้อนกลับ"
            className="absolute left-0 grid size-9 place-items-center rounded-full text-white/90 hover:bg-white/10"
          >
            {BACK_ARROW_ICON}
          </button>
        ) : null}
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
  );
}
