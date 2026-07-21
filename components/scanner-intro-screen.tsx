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
      <jelly-theme mode="auto">
        <jelly-button variant="mint" onClick={onStart}>
          เริ่มต้นสแกนบัตร
        </jelly-button>
      </jelly-theme>
    </section>
  );
}
