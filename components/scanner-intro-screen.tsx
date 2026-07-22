"use client";

type ScannerIntroScreenProps = {
  onStart: () => void;
  className?: string;
};

export function ScannerIntroScreen({ onStart, className = "" }: ScannerIntroScreenProps) {
  return (
    <section
      className={`relative isolate flex h-dvh w-full items-center justify-center bg-black px-6 text-white sm:h-[min(840px,calc(100dvh-3rem))] sm:max-w-md sm:rounded-3xl sm:ring-1 sm:ring-white/10 ${className}`}
      aria-label="เริ่มต้นสแกนบัตรประชาชน"
    >
      <button
        type="button"
        onClick={onStart}
        className="rounded-xl bg-white px-6 py-3 text-base font-semibold text-black hover:bg-white/90 active:scale-95 transition-transform"
      >
        เริ่มต้นสแกนบัตร
      </button>
    </section>
  );
}
