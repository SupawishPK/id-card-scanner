"use client";

import { useRef } from "react";
import {
  type DetectionState,
  useIdCardScanner,
} from "@/hooks/use-id-card-scanner";

type IdCardScannerProps = {
  onConfirm?: (base64Jpeg: string) => void;
  className?: string;
};

const STATUS_TEXT: Record<DetectionState, string> = {
  searching: "นำบัตรเข้ากรอบให้พอดี",
  "hold-still": "พบบัตรแล้ว กรุณาถือให้นิ่ง",
  stable: "ตำแหน่งดีมาก ถือไว้นิ่ง ๆ",
};

export function IdCardScanner({ onConfirm, className = "" }: IdCardScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const roiRef = useRef<HTMLDivElement>(null);
  const {
    cameraState,
    cameraError,
    detectionState,
    metrics,
    capturedImage,
    retryCapture,
    retryCamera,
    stopCamera,
  } = useIdCardScanner({ videoRef, roiRef });

  const isStable = detectionState === "stable";

  return (
    <section
      className={`relative isolate h-dvh w-full overflow-hidden bg-black sm:h-[min(840px,calc(100dvh-3rem))] sm:max-w-md sm:rounded-3xl sm:ring-1 sm:ring-white/10 ${className}`}
      aria-label="เครื่องสแกนบัตรประชาชน"
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        disablePictureInPicture
        className="absolute inset-0 h-full w-full object-cover"
        aria-label="ภาพสดจากกล้อง"
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/70" />

      <header className="absolute inset-x-0 top-0 z-10 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] text-center text-white">
        <h1 className="text-lg font-semibold">ถ่ายภาพบัตรประชาชน</h1>
        <p className="mt-1 text-sm text-white/75">จัดบัตรให้อยู่ในกรอบ ระบบจะถ่ายให้อัตโนมัติ</p>
      </header>

      <div className="absolute inset-0 flex items-center justify-center px-5">
        <div
          ref={roiRef}
          className={`relative aspect-[1.586/1] w-[min(88vw,380px)] rounded-xl border-2 transition-[border-color,box-shadow,background-color] duration-200 sm:w-[88%] ${
            isStable
              ? "border-emerald-400 bg-emerald-400/5 shadow-[0_0_0_9999px_rgba(2,6,23,0.42),0_0_28px_rgba(52,211,153,0.7)]"
              : "border-rose-400 bg-transparent shadow-[0_0_0_9999px_rgba(2,6,23,0.5)]"
          }`}
        >
          <span className="absolute -left-1 -top-1 h-8 w-8 rounded-tl-xl border-l-4 border-t-4 border-current" />
          <span className="absolute -right-1 -top-1 h-8 w-8 rounded-tr-xl border-r-4 border-t-4 border-current" />
          <span className="absolute -bottom-1 -left-1 h-8 w-8 rounded-bl-xl border-b-4 border-l-4 border-current" />
          <span className="absolute -bottom-1 -right-1 h-8 w-8 rounded-br-xl border-b-4 border-r-4 border-current" />

          <div className="absolute -top-14 left-1/2 w-max max-w-[90vw] -translate-x-1/2 rounded-full bg-black/65 px-4 py-2 text-center text-sm font-medium text-white shadow-lg backdrop-blur-md">
            <span
              className={`mr-2 inline-block size-2.5 rounded-full ${
                isStable ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-rose-400"
              }`}
            />
            {STATUS_TEXT[detectionState]}
          </div>

          {isStable ? (
            <div className="absolute -bottom-8 left-0 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-emerald-400 transition-[width] duration-75"
                style={{ width: `${Math.round(metrics.progress * 100)}%` }}
              />
            </div>
          ) : null}
        </div>
      </div>

      <p className="absolute inset-x-6 bottom-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-xs leading-5 text-white/70">
        ตรวจจับและประมวลผลบนอุปกรณ์ของคุณ ภาพจะไม่ถูกอัปโหลดอัตโนมัติ
      </p>

      {cameraState !== "ready" ? (
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
                onClick={() => void retryCamera()}
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
      ) : null}

      {capturedImage ? (
        <div
          className="absolute inset-0 z-30 flex flex-col bg-slate-950 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-white"
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-title"
        >
          <div className="my-auto">
            <h2 id="preview-title" className="text-center text-xl font-semibold">ตรวจสอบภาพบัตร</h2>
            <p className="mt-1 text-center text-sm text-slate-400">ตรวจสอบว่าข้อมูลชัดเจนและบัตรอยู่ครบทั้งใบ</p>
            {/* A data URL is intentionally rendered directly; next/image cannot optimize it. */}
            <img
              src={capturedImage}
              alt="ภาพบัตรประชาชนที่ถ่ายแล้ว"
              className="mt-6 aspect-[1.586/1] w-full rounded-xl border border-white/15 bg-black object-contain shadow-2xl"
            />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={retryCapture}
              className="min-h-12 rounded-xl border border-white/20 bg-white/5 px-4 py-3 font-semibold hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              ถ่ายใหม่
            </button>
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onConfirm?.(capturedImage);
              }}
              className="min-h-12 rounded-xl bg-emerald-500 px-4 py-3 font-semibold text-white hover:bg-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
            >
              ใช้รูปนี้
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
