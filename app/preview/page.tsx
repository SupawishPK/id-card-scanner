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

  const [copiedPng, setCopiedPng] = useState(false);
  const [copiedBase64, setCopiedBase64] = useState(false);

  const onBack = () => {
    sessionStorage.removeItem("captured_id_card");
    router.push("/");
  };

  const onCopyPng = async () => {
    if (!imageUrl) return;
    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type || "image/png"]: blob })]);
      setCopiedPng(true);
      setTimeout(() => setCopiedPng(false), 2000);
    } catch {
      window.open(imageUrl, "_blank");
    }
  };

  const onCopyBase64 = async () => {
    if (!imageUrl) return;
    try {
      await navigator.clipboard.writeText(imageUrl);
      setCopiedBase64(true);
      setTimeout(() => setCopiedBase64(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = imageUrl;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedBase64(true);
      setTimeout(() => setCopiedBase64(false), 2000);
    }
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
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onCopyPng}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium hover:bg-white/10 active:scale-[.98] transition-all"
            >
              {copiedPng ? (
                <>
                  <svg className="size-4 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-emerald-400 font-semibold truncate">คัดลอก PNG แล้ว</span>
                </>
              ) : (
                <>
                  <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>คัดลอกรูป (PNG)</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onCopyBase64}
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-medium hover:bg-white/10 active:scale-[.98] transition-all"
            >
              {copiedBase64 ? (
                <>
                  <svg className="size-4 text-emerald-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-emerald-400 font-semibold truncate">คัดลอก Base64 แล้ว</span>
                </>
              ) : (
                <>
                  <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>คัดลอก Base64</span>
                </>
              )}
            </button>
          </div>

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
