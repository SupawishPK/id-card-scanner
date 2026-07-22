"use client";

import { ID_CARD_ASPECT_RATIO } from "@/lib/id-card-scanner-config";
import { COPY_ICON, type ValidationState } from "../constants/scanner-ui.config";

export function ValidationDialogs({
  validationState,
  capturedImage,
  cameraState,
  cameraError,
  onRetry,
  onRetryCamera,
  onCopyImage,
}: {
  validationState: ValidationState;
  capturedImage: string | null;
  cameraState: string;
  cameraError: string | null;
  onRetry: () => void;
  onRetryCamera: () => void;
  onCopyImage: () => void;
}) {
  // Camera loading / error screens
  if (cameraState !== "ready") {
    return (
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

  // Checking overlay
  if (capturedImage && validationState === "checking") {
    return (
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
    );
  }

  // Error dialog
  if (capturedImage && validationState === "error") {
    return (
      <div
        className="absolute inset-0 z-30 grid place-items-center bg-black/45 px-6 text-white backdrop-blur-[1px]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="validation-error-title"
        aria-describedby="validation-error-description"
      >
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-950/95 p-6 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-rose-500/15 text-2xl font-semibold text-rose-400" aria-hidden="true">!</div>
          <h2 id="validation-error-title" className="mt-4 text-xl font-semibold">ข้อมูลบัตรไม่สมบูรณ์</h2>
          <p id="validation-error-description" className="mt-2 text-sm leading-6 text-slate-300">
            ภาพจางหรือมีแสงสะท้อน ทำให้ตรวจสอบข้อมูลบนบัตรได้ไม่ครบถ้วน
          </p>
          <p className="mt-3 text-xs leading-5 text-slate-400">
            เพิ่มแสงให้เพียงพอ และหลีกเลี่ยงเงาหรือแสงสะท้อนบนหน้าบัตร
          </p>
          <button
            type="button" onClick={onRetry} autoFocus
            className="mt-6 min-h-12 w-full rounded-xl bg-white px-5 py-3 font-semibold text-slate-950 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            ถ่ายใหม่
          </button>
        </div>
      </div>
    );
  }

  // Success dialog
  if (capturedImage && validationState === "success") {
    return (
      <div
        className="absolute inset-0 z-30 flex flex-col bg-slate-950 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-white"
        role="dialog" aria-modal="true"
        aria-labelledby="validation-success-title"
        aria-describedby="validation-success-description"
      >
        <div className="my-auto text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-400/15 text-2xl font-semibold text-emerald-400" aria-hidden="true">✓</div>
          <h2 id="validation-success-title" className="mt-4 text-xl font-semibold">ตรวจสอบข้อมูลสำเร็จ</h2>
          <p id="validation-success-description" className="mt-2 text-sm text-slate-400">
            ภาพบัตรชัดเจนและมีข้อมูลครบถ้วน
          </p>

          <div
            className="relative mx-auto mt-6 w-full max-w-sm overflow-hidden rounded-2xl border border-emerald-400/35 bg-black shadow-2xl"
            style={{ aspectRatio: ID_CARD_ASPECT_RATIO }}
          >
            <img src={capturedImage} alt="ภาพบัตรจากจังหวะที่กดถ่าย" className="absolute inset-0 size-full object-cover" />
          </div>

          <button
            type="button" onClick={() => void onCopyImage()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-medium text-white hover:bg-white/10 active:scale-95 transition-all"
          >
            {COPY_ICON}
            คัดลอกรูป (PNG)
          </button>
        </div>

        <button
          type="button" onClick={onRetry} autoFocus
          className="mt-6 min-h-12 w-full rounded-xl border border-white/20 bg-white/5 px-5 py-3 font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          ถ่ายใหม่
        </button>
      </div>
    );
  }

  return null;
}
