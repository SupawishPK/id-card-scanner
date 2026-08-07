"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface IImageVariant {
  base64: string;
  sizeKb: string;
}

const resizeToExactMaxDim = (
  source: string,
  maxDim: number,
  fileType: string,
  quality: number,
): Promise<{ blob: Blob; dataUrl: string }> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = maxDim / Math.max(img.naturalWidth, img.naturalHeight);
      const width = Math.round(img.naturalWidth * scale);
      const height = Math.round(img.naturalHeight * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context not available"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to encode image"));
            return;
          }
          resolve({ blob, dataUrl: canvas.toDataURL(fileType, quality) });
        },
        fileType,
        quality,
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = source;
  });

const PreviewPage = () => {
  const router = useRouter();
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);

  const [detectionVariant, setDetectionVariant] = useState<IImageVariant | null>(null);
  const [analysisVariant, setAnalysisVariant] = useState<IImageVariant | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(true);

  const [copiedState, setCopiedState] = useState<string | null>(null);

  const [detectedRatio, setDetectedRatio] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem("captured_id_card");
    const ratio = sessionStorage.getItem("captured_id_card_ratio");
    if (!stored) {
      router.replace("/");
      return;
    }
    setOriginalImageUrl(stored);
    if (ratio) {
      setDetectedRatio(ratio);
    }

    const processCompression = async () => {
      try {
        setIsCompressing(true);

        // Set 1: Detection (imgSize: 1200 exact, compression: 50% JPEG)
        const { blob: detectionBlob, dataUrl: detectionBase64 } =
          await resizeToExactMaxDim(stored, 1200, "image/jpeg", 0.5);
        setDetectionVariant({
          base64: detectionBase64,
          sizeKb: (detectionBlob.size / 1024).toFixed(1),
        });

        // Set 2: Analysis (imgSize: 960 exact, compression: 80% JPEG)
        const { blob: analysisBlob, dataUrl: analysisBase64 } =
          await resizeToExactMaxDim(stored, 960, "image/jpeg", 0.8);
        setAnalysisVariant({
          base64: analysisBase64,
          sizeKb: (analysisBlob.size / 1024).toFixed(1),
        });
      } catch (err) {
        console.error("[Preview] Compression error:", err);
      } finally {
        setIsCompressing(false);
      }
    };

    void processCompression();
  }, [router]);

  const onBack = () => {
    sessionStorage.removeItem("captured_id_card");
    router.push("/");
  };

  const onCopyImage = async (base64Data: string, key: string) => {
    try {
      const mimeType = base64Data.slice(5, base64Data.indexOf(";"));
      const res = await fetch(base64Data);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [mimeType]: blob }),
      ]);
      setCopiedState(`${key}_png`);
      setTimeout(() => setCopiedState(null), 2000);
    } catch {
      window.open(base64Data, "_blank");
    }
  };

  const onCopyBase64 = async (base64Data: string, key: string) => {
    try {
      await navigator.clipboard.writeText(base64Data);
      setCopiedState(`${key}_base64`);
      setTimeout(() => setCopiedState(null), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = base64Data;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedState(`${key}_base64`);
      setTimeout(() => setCopiedState(null), 2000);
    }
  };

  if (!originalImageUrl) {
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
            className="grid size-10 place-items-center rounded-full bg-white/10 text-white transition-all hover:bg-white/15 active:scale-95"
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
          <div className="flex items-center justify-between rounded-xl bg-emerald-500/15 px-4 py-3 text-sm text-emerald-400">
            <div className="flex items-center gap-2">
              <svg className="size-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">ตรวจสอบข้อมูลบัตรสำเร็จ</span>
            </div>
            {detectedRatio ? (
              <span className="rounded-md border border-emerald-400/30 bg-emerald-500/20 px-2 py-0.5 text-xs font-mono font-semibold text-emerald-300">
                Ratio {detectedRatio}
              </span>
            ) : null}
          </div>
        </div>

        {/* Image preview */}
        <div className="px-5 pb-5">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl" style={{ aspectRatio: "85.6 / 53.98" }}>
            <img
              src={originalImageUrl}
              alt="ภาพบัตรประชาชนที่ถ่าย"
              className="size-full object-cover"
            />
          </div>
        </div>

        {/* Dual Compressed Image Sets */}
        <div className="flex flex-col gap-4 px-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
          {/* Spec 1: Detection */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div>
                <h2 className="text-sm font-semibold text-amber-300">🔍 Detection Format</h2>
                <p className="text-xs font-mono text-slate-400">
                  Size: 1200px (exact) • Compression: 50%
                  {detectionVariant ? ` (${detectionVariant.sizeKb} KB)` : ""}
                </p>
              </div>
              <span className="rounded-md border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-amber-300">
                JPEG
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-3">
              <button
                type="button"
                disabled={isCompressing || !detectionVariant}
                onClick={() => detectionVariant && void onCopyImage(detectionVariant.base64, "detection")}
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-medium transition-all hover:bg-white/10 active:scale-[.98] disabled:opacity-50"
              >
                {copiedState === "detection_png" ? (
                  <span className="truncate font-semibold text-emerald-400">✓ คัดลอกรูปแล้ว</span>
                ) : (
                  <span>คัดลอกรูป (JPEG)</span>
                )}
              </button>

              <button
                type="button"
                disabled={isCompressing || !detectionVariant}
                onClick={() => detectionVariant && void onCopyBase64(detectionVariant.base64, "detection")}
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-medium transition-all hover:bg-white/10 active:scale-[.98] disabled:opacity-50"
              >
                {copiedState === "detection_base64" ? (
                  <span className="truncate font-semibold text-emerald-400">✓ คัดลอก Base64 แล้ว</span>
                ) : (
                  <span>คัดลอก Base64</span>
                )}
              </button>
            </div>
          </div>

          {/* Spec 2: Analysis */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4 shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <div>
                <h2 className="text-sm font-semibold text-cyan-300">🔬 Analysis Format</h2>
                <p className="text-xs font-mono text-slate-400">
                  Size: 960px (exact) • Compression: 80%
                  {analysisVariant ? ` (${analysisVariant.sizeKb} KB)` : ""}
                </p>
              </div>
              <span className="rounded-md border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-cyan-300">
                JPEG
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-3">
              <button
                type="button"
                disabled={isCompressing || !analysisVariant}
                onClick={() => analysisVariant && void onCopyImage(analysisVariant.base64, "analysis")}
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-medium transition-all hover:bg-white/10 active:scale-[.98] disabled:opacity-50"
              >
                {copiedState === "analysis_png" ? (
                  <span className="truncate font-semibold text-emerald-400">✓ คัดลอกรูปแล้ว</span>
                ) : (
                  <span>คัดลอกรูป (JPEG)</span>
                )}
              </button>

              <button
                type="button"
                disabled={isCompressing || !analysisVariant}
                onClick={() => analysisVariant && void onCopyBase64(analysisVariant.base64, "analysis")}
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-medium transition-all hover:bg-white/10 active:scale-[.98] disabled:opacity-50"
              >
                {copiedState === "analysis_base64" ? (
                  <span className="truncate font-semibold text-emerald-400">✓ คัดลอก Base64 แล้ว</span>
                ) : (
                  <span>คัดลอก Base64</span>
                )}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="min-h-12 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition-all hover:bg-slate-100 active:scale-[.98]"
          >
            ถ่ายใหม่
          </button>
        </div>
      </div>
    </main>
  );
};

export default PreviewPage;
