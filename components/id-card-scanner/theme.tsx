"use client";

import type { ReactNode } from "react";
import type { IScannerStatus } from "./geometry";

export type ICaptureMode = "auto" | "manual";
export type IValidationState = "idle" | "checking" | "success" | "error";

export type IStatusUi = {
  label: string;
  dotColor: string;
};

export const STATUS_UI: Record<IScannerStatus, IStatusUi> = {
  searching: {
    label: "วางบัตรประชาชนให้ตรงในกรอบ",
    dotColor: "bg-white/70",
  },
  detected: {
    label: "ตรวจพบบัตรแล้ว กรุณาขยับให้ตรงกรอบ",
    dotColor: "bg-rose-500",
  },
  aligning: {
    label: "บัตรตรงกรอบแล้ว ถือนิ่งๆ สักครู่",
    dotColor: "bg-rose-500",
  },
  stable: {
    label: "ถือนิ่งๆ กำลังบันทึกภาพ…",
    dotColor: "bg-rose-500",
  },
};

export const AUTO_STABLE_STATUS: IStatusUi = {
  label: "กำลังบันทึกภาพอัตโนมัติ…",
  dotColor: "bg-rose-500",
};

export const AUTO_CAPTURE_DURATION_MS = 600;

export const BACK_ARROW_ICON: ReactNode = (
  <svg
    className="size-6"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

export const CAMERA_ICON: ReactNode = (
  <svg
    className="size-7"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

export const FLASH_ON_ICON: ReactNode = (
  <svg
    className="size-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13 10V3L4 14h7v7l9-11h-7z"
    />
  </svg>
);

export const FLASH_OFF_ICON: ReactNode = (
  <svg
    className="size-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
    />
  </svg>
);

export const COPY_ICON: ReactNode = (
  <svg
    className="size-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
    />
  </svg>
);
