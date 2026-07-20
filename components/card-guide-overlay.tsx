"use client";

import { type RefObject, useEffect } from "react";
import type { DetectionState } from "@/hooks/use-id-card-scanner";
// Paths ported from drawCardOverlay.ts. The source coordinate system is portrait;
// it is rotated counter-clockwise below so the guideline renders horizontally.
const SOURCE_VIEWBOX_WIDTH = 235;
const SOURCE_VIEWBOX_HEIGHT = 378;
const LANDSCAPE_VIEWBOX_WIDTH = SOURCE_VIEWBOX_HEIGHT;
const LANDSCAPE_VIEWBOX_HEIGHT = SOURCE_VIEWBOX_WIDTH;

const FRAME_PATHS = [
  "M231 372C231 373.1 230.1 374 229 374L6 374C4.9 374 4 373.1 4 372L4.00002 6C4.00002 4.9 4.90002 4 6.00002 4L229 4.00001C230.1 4.00001 231 4.90001 231 6.00001L231 372ZM235 372L235 6.00001C235 2.69001 232.31 9.89232e-06 229 9.74764e-06L6.00002 0C2.69002 -1.44684e-07 1.61431e-05 2.69 1.59984e-05 6L0 372C-1.44685e-07 375.31 2.69 378 6 378L229 378C232.31 378 235 375.31 235 372Z",
  "M110.64 324.73C110.64 336.46 101.1 346 89.37 346C77.64 346 68.1 336.46 68.1 324.73C68.1 313 77.64 303.46 89.37 303.46C101.1 303.46 110.64 313 110.64 324.73ZM114.64 324.73C114.64 310.77 103.33 299.46 89.37 299.46C75.41 299.46 64.1 310.77 64.1 324.73C64.1 338.69 75.41 350 89.37 350C103.33 350 114.64 338.69 114.64 324.73Z",
  "M66.1 324.73C66.0998 346.498 48.962 364.439 26.4936 368.715C25.4087 368.921 24.3623 368.209 24.1557 367.124C23.9492 366.039 24.6614 364.992 25.7465 364.785C46.6775 360.801 62.0998 344.242 62.1 324.73C62.1 305.216 46.7933 288.774 25.977 284.713C24.893 284.501 24.1855 283.451 24.3969 282.367C24.6084 281.283 25.6586 280.576 26.7426 280.787C49.0862 285.146 66.1 302.965 66.1 324.73Z",
  "M120.99 362.95C120.99 364.05 120.09 364.95 118.99 364.95H26.88C25.78 364.95 24.88 364.05 24.88 362.95L24.88 286.5C24.88 285.4 25.78 284.5 26.88 284.5H118.99C120.09 284.5 120.99 285.4 120.99 286.5L120.99 362.95ZM124.99 362.95L124.99 286.5C124.99 283.19 122.3 280.5 118.99 280.5H26.88C23.57 280.5 20.88 283.19 20.88 286.5L20.88 362.95C20.88 366.26 23.57 368.95 26.88 368.95H118.99C122.3 368.95 124.99 366.26 124.99 362.95Z",
] as const;

const FRAME_COLOR: Record<DetectionState, string> = {
  searching: "rgba(255, 255, 255, 1)",
  "card-detected": "rgba(244, 63, 94, 1)",
  "hold-still": "rgba(244, 63, 94, 1)",
  stable: "rgba(52, 211, 153, 1)",
};

type CardGuideOverlayProps = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  detectionState: DetectionState;
};

export function CardGuideOverlay({ canvasRef, detectionState }: CardGuideOverlayProps) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const draw = () => {
      // Use the untransformed layout size; getBoundingClientRect includes the
      // visual 45° rotation and would distort the backing-store dimensions.
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width || !height) return;

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
      const outputWidth = Math.round(width * pixelRatio);
      const outputHeight = Math.round(height * pixelRatio);
      if (canvas.width !== outputWidth || canvas.height !== outputHeight) {
        canvas.width = outputWidth;
        canvas.height = outputHeight;
      }

      const context = canvas.getContext("2d");
      if (!context) return;

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.save();
      context.scale(
        width / LANDSCAPE_VIEWBOX_WIDTH,
        height / LANDSCAPE_VIEWBOX_HEIGHT,
      );
      // Rotate left 90°: (x, y) -> (y, sourceWidth - x).
      context.translate(0, SOURCE_VIEWBOX_WIDTH);
      context.rotate(-Math.PI / 2);
      context.fillStyle = FRAME_COLOR[detectionState];
      for (const pathData of FRAME_PATHS) {
        context.fill(new Path2D(pathData));
      }
      context.restore();
    };

    draw();
    const resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, [detectionState]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 size-full rotate-90 rounded-xl transition-[box-shadow,background-color] duration-200 ${
        detectionState === "stable"
          ? "bg-emerald-400/5 shadow-[0_0_0_9999px_rgba(2,6,23,0.42),0_0_28px_rgba(52,211,153,0.7)]"
          : "bg-transparent shadow-[0_0_0_9999px_rgba(2,6,23,0.5)]"
      }`}
      aria-hidden="true"
    />
  );
}
