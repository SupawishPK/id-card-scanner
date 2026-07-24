"use client";

import type { IScannerStatus } from "./geometry";

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
