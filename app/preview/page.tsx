"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const PreviewPage = () => {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("captured_id_card");
    if (!stored) {
      router.replace("/");
      return;
    }
    setImageUrl(stored);
  }, [router]);

  const onBack = () => {
    sessionStorage.removeItem("captured_id_card");
    router.push("/");
  };

  const onCopy = async () => {
    if (!imageUrl) return;
    const img = new Image();
    img.src = imageUrl;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    canvas.getContext("2d")?.drawImage(img, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    }, "image/png");
  };


  if (!imageUrl) {
    return (
      <main className="grid min-h-dvh place-items-center bg-slate-950">
        <div className="size-9 animate-spin rounded-full border-2 border-white/25 border-t-white" />
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col bg-slate-950 text-white sm:grid sm:place-items-center sm:p-6">
      <div className="flex w-full max-w-md flex-1 flex-col sm:flex-none">
        {/* Header */}
        <header className="flex items-center gap-3 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-4">
          <button
            type="button"
            onClick={onBack}
            className="grid size-10 place-items-center rounded-full bg-white/10 text-white transition-all active:scale-95 hover:bg-white/15"
            aria-label="ย้อนกลับ"
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-base font-semibold">ตรวจสอบรูปบัตรประชาชน</h1>
        </header>

        {/* Success badge */}
        <div className="px-5 pb-4">
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500/15 px-4 py-3 text-sm text-emerald-400">
            <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">ตรวจสอบข้อมูลบัตรสำเร็จ</span>
          </div>
        </div>

        {/* Image preview */}
        <div className="px-5 pb-5">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl" style={{ aspectRatio: "85.6 / 53.98" }}>
            <img
              src={imageUrl}
              alt="ภาพบัตรประชาชนที่ถ่าย"
              className="size-full object-cover"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onCopy}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium hover:bg-white/10 active:scale-[.98] transition-all"
          >
            <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            คัดลอกรูป (PNG)
          </button>

          <button
            type="button"
            onClick={onBack}
            className="min-h-12 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-100 active:scale-[.98] transition-all"
          >
            ถ่ายใหม่
          </button>
        </div>
      </div>
    </main>
  );
};

export default PreviewPage;
