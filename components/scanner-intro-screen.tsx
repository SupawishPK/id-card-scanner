"use client";

type ScannerIntroScreenProps = {
  onStart: () => void;
  className?: string;
};

export function ScannerIntroScreen({ onStart, className = "" }: ScannerIntroScreenProps) {
  return (
    <section
      className={`relative isolate flex h-dvh w-full flex-col justify-between overflow-y-auto bg-slate-950 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-white sm:h-[min(840px,calc(100dvh-3rem))] sm:max-w-md sm:rounded-3xl sm:ring-1 sm:ring-white/10 ${className}`}
      aria-label="คำแนะนำการสแกนบัตรประชาชน"
    >
      {/* Background ambient glow effects */}
      <div className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-emerald-500/15 blur-[80px]" />
      <div className="pointer-events-none absolute -bottom-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-teal-500/10 blur-[80px]" />

      {/* Header section */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3.5 py-1 text-xs font-semibold text-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.2)]">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          AI Smart Scanner 2.0
        </div>

        <h1 className="mt-5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          ถ่ายรูปบัตรประชาชน
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          เพื่อความรวดเร็วและแม่นยำ กรุณาจัดเตรียมบัตรประชาชนด้านหน้าให้อยู่ในสภาพสมบูรณ์
        </p>
      </div>

      {/* Hero Card Graphic with Animated Scan Line */}
      <div className="relative z-10 my-auto py-6">
        <div className="relative mx-auto w-full max-w-[280px] rounded-2xl border border-white/15 bg-slate-900/80 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          {/* Simulated Card Content */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <div className="size-4 rounded-full bg-sky-400/80" />
              <span className="text-[10px] font-bold tracking-wider text-slate-300">
                THAI NATIONAL ID CARD
              </span>
            </div>
            <div className="size-5 rounded-md border border-amber-400/60 bg-amber-400/20" />
          </div>

          <div className="mt-4 flex gap-3">
            <div className="size-16 shrink-0 rounded-xl bg-slate-800 border border-white/10 grid place-items-center text-slate-500">
              <svg viewBox="0 0 24 24" fill="currentColor" className="size-8 opacity-60">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
            <div className="flex flex-1 flex-col justify-center gap-2">
              <div className="h-2.5 w-3/4 rounded-full bg-slate-700" />
              <div className="h-2 w-full rounded-full bg-slate-800" />
              <div className="h-2 w-2/3 rounded-full bg-slate-800" />
            </div>
          </div>

          {/* Animated Glowing Laser Scanline */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 animate-[scan_2.5s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#34d399]" />
        </div>
      </div>

      {/* Instructions list */}
      <div className="relative z-10 space-y-3">
        <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 text-left backdrop-blur-md">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">ถ่ายให้อัตโนมัติ</h2>
            <p className="mt-0.5 text-xs text-slate-300">
              เพียงวางบัตรให้ตรงกรอบและถือนิ่ง ๆ ระบบจะถ่ายภาพให้ทันที
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 text-left backdrop-blur-md">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">หลีกเลี่ยงเงาและแสงสะท้อน</h2>
            <p className="mt-0.5 text-xs text-slate-300">
              จัดให้อยู่ในพื้นที่ที่มีแสงสว่างเพียงพอ เพื่อความชัดเจนของข้อมูล
            </p>
          </div>
        </div>
      </div>

      {/* CTA Button & Security Badge */}
      <div className="relative z-10 mt-6 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={onStart}
          className="group relative flex min-h-13 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 p-3.5 font-bold text-slate-950 shadow-[0_0_24px_rgba(52,211,153,0.35)] transition-all duration-200 hover:shadow-[0_0_32px_rgba(52,211,153,0.55)] active:scale-[0.98]"
        >
          <span>เริ่มต้นสแกนบัตร</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-5 transition-transform group-hover:translate-x-1">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>

        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5 text-emerald-400">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          <span>ประมวลผลอย่างปลอดภัยบนอุปกรณ์ (On-Device Security)</span>
        </div>
      </div>
    </section>
  );
}
