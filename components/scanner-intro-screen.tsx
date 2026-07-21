"use client";

type ScannerIntroScreenProps = {
  onStart: () => void;
  className?: string;
};

export function ScannerIntroScreen({ onStart, className = "" }: ScannerIntroScreenProps) {
  return (
    <section
      className={`relative isolate flex h-dvh w-full flex-col justify-between overflow-y-auto bg-black px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-white sm:h-[min(840px,calc(100dvh-3rem))] sm:max-w-md sm:rounded-3xl sm:ring-1 sm:ring-white/10 ${className}`}
      aria-label="คำแนะนำการสแกนบัตรประชาชน"
    >
      {/* Header section */}
      <div className="relative z-10 flex flex-col items-center text-center pt-6">
        <span className="text-[10px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
          VERIFICATION STEP
        </span>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          ถ่ายรูปบัตรประชาชน
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-zinc-400 max-w-xs">
          จัดวางบัตรประชาชนด้านหน้าให้อยู่ในกรอบ และหลีกเลี่ยงเงาหรือแสงสะท้อน
        </p>
      </div>

      {/* Seamless Monochrome ID Card Graphic */}
      <div className="relative z-10 my-auto py-4">
        <div className="relative mx-auto w-full max-w-[250px] rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <div className="size-2.5 rounded-full bg-zinc-400" />
              <span className="text-[9px] font-medium tracking-widest text-zinc-400 uppercase">
                THAI NATIONAL ID
              </span>
            </div>
            <div className="size-3.5 rounded border border-zinc-700 bg-zinc-800/50" />
          </div>

          <div className="mt-4 flex gap-3">
            <div className="size-14 shrink-0 rounded-lg bg-zinc-900 border border-zinc-800 grid place-items-center text-zinc-500">
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-7 opacity-30">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
            <div className="flex flex-1 flex-col justify-center gap-1.5">
              <div className="h-2 w-3/4 rounded-full bg-zinc-800" />
              <div className="h-1.5 w-full rounded-full bg-zinc-900" />
              <div className="h-1.5 w-1/2 rounded-full bg-zinc-900" />
            </div>
          </div>

          {/* Minimalist White Micro Scanline */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 animate-[scan_3s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        </div>
      </div>

      {/* Minimal Instruction List */}
      <div className="relative z-10 space-y-2">
        <div className="flex items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 text-left">
          <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-zinc-800 text-zinc-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xs font-medium text-white">ระบบถ่ายภาพให้อัตโนมัติ</h2>
            <p className="text-[11px] text-zinc-400">เมื่อวางบัตรนิ่งและตรงกรอบ</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-4 py-3 text-left">
          <div className="grid size-7 shrink-0 place-items-center rounded-lg bg-zinc-800 text-zinc-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          </div>
          <div>
            <h2 className="text-xs font-medium text-white">หลีกเลี่ยงเงาและแสงสะท้อน</h2>
            <p className="text-[11px] text-zinc-400">เพื่อให้ตัวหนังสือชัดเจน</p>
          </div>
        </div>
      </div>

      {/* High-Contrast Minimal White Button & On-Device Badge */}
      <div className="relative z-10 mt-6 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onStart}
          className="group relative flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 font-semibold text-black hover:bg-zinc-200 active:scale-[0.99] transition-all shadow-lg"
        >
          <span className="text-sm">เริ่มต้นสแกนบัตร</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 transition-transform group-hover:translate-x-0.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>

        <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="size-3 text-zinc-400">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>ประมวลผลอย่างปลอดภัยบนอุปกรณ์ (On-Device Security)</span>
        </div>
      </div>
    </section>
  );
}
