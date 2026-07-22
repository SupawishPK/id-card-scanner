import type { DetectionState } from "@/hooks/use-id-card-scanner";

// ── Status text & indicator ──────────────────────────────────────────

export const STATUS_UI: Record<
  DetectionState,
  { text: string; dotClassName: string }
> = {
  searching: {
    text: "วางบัตรให้ตรงกรอบ",
    dotClassName: "bg-white shadow-[0_0_8px_rgba(255,255,255,0.75)]",
  },
  "card-detected": {
    text: "จัดบัตรให้พอดีกรอบ",
    dotClassName: "bg-rose-400 shadow-[0_0_8px_#fb7185]",
  },
  "hold-still": {
    text: "ถือบัตรให้นิ่งสักครู่",
    dotClassName: "bg-rose-400 shadow-[0_0_8px_#fb7185]",
  },
  stable: {
    text: "ตำแหน่งดีแล้ว กดปุ่มถ่ายรูป",
    dotClassName: "bg-emerald-400 shadow-[0_0_8px_#34d399]",
  },
} as const;

export const AUTO_STABLE_STATUS = {
  ...STATUS_UI.stable,
  text: "วางบัตรนิ่ง ๆ กำลังถ่ายอัตโนมัติ…",
} as const;

export const TILTED_STATUS = {
  text: "จัดบัตรให้ตรง ไม่เอียง",
  dotClassName: "bg-amber-400 shadow-[0_0_8px_#fbbf24]",
} as const;

// ── Timing ───────────────────────────────────────────────────────────

export const AUTO_CAPTURE_DURATION_MS = 1800;
export const MOCK_VALIDATION_DELAY_MS = 1800;
export const MOCK_VALIDATION_PASS_RATE = 0.5;

// ── Types ────────────────────────────────────────────────────────────

export type CaptureMode = "auto" | "manual";
export type ValidationState = "idle" | "checking" | "success" | "error";

// ── Icons ────────────────────────────────────────────────────────────

export const CAMERA_ICON = (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="size-full" aria-hidden="true">
    <circle cx="32" cy="32" r="32" fill="white" />
    <circle cx="32" cy="32" r="29" fill="#0E1329" />
    <circle cx="32" cy="32" r="27" fill="white" />
    <path d="M34.472 23.8333L36.607 26.1667H41.332V40.1667H22.6654V26.1667H27.3904L29.5254 23.8333H34.472ZM35.4987 21.5H28.4987L26.3637 23.8333H22.6654C21.382 23.8333 20.332 24.8833 20.332 26.1667V40.1667C20.332 41.45 21.382 42.5 22.6654 42.5H41.332C42.6154 42.5 43.6654 41.45 43.6654 40.1667V26.1667C43.6654 24.8833 42.6154 23.8333 41.332 23.8333H37.6337L35.4987 21.5ZM31.9987 29.6667C33.9237 29.6667 35.4987 31.2417 35.4987 33.1667C35.4987 35.0917 33.9237 36.6667 31.9987 36.6667C30.0737 36.6667 28.4987 35.0917 28.4987 33.1667C28.4987 31.2417 30.0737 29.6667 31.9987 29.6667ZM31.9987 27.3333C28.7787 27.3333 26.1654 29.9467 26.1654 33.1667C26.1654 36.3867 28.7787 39 31.9987 39C35.2187 39 37.832 36.3867 37.832 33.1667C37.832 29.9467 35.2187 27.3333 31.9987 27.3333Z" fill="#565A69" />
  </svg>
);

export const FLASH_ON_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-full" aria-hidden="true">
    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
  </svg>
);

export const FLASH_OFF_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-full" aria-hidden="true">
    <path d="M10.513 4.856 13.12 2.17a.5.5 0 0 1 .86.46l-1.377 4.317" />
    <path d="M15.656 10H20a1 1 0 0 1 .78 1.63l-1.72 1.773" />
    <path d="M16.273 16.273 10.88 21.83a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14H4a1 1 0 0 1-.78-1.63l4.507-4.643" />
    <path d="m2 2 20 20" />
  </svg>
);

export const COPY_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

export const BACK_ARROW_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-6">
    <path d="m15 18-6-6 6-6" />
  </svg>
);
