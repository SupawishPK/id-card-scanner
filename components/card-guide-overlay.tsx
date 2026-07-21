"use client";

import { type RefObject, useEffect } from "react";
import type { DetectionState } from "@/hooks/use-id-card-scanner";

// Landscape frame supplied by the design (321 x 200 viewBox).
const FRAME_VIEWBOX_WIDTH = 321;
const FRAME_VIEWBOX_HEIGHT = 200;

const FRAME_PATHS = [
  "M315.905 3.40426C316.839 3.40426 317.603 4.17022 317.603 5.10639L317.603 194.894C317.603 195.83 316.839 196.596 315.905 196.596L5.09524 196.596C4.16111 196.596 3.39683 195.83 3.39683 194.894L3.39682 5.10639C3.39682 4.17022 4.16111 3.40427 5.09524 3.40427L315.905 3.40426ZM315.905 1.00332e-05L5.09524 1.06329e-05C2.28436 1.06327e-05 -2.41581e-07 2.28937 -2.41312e-07 5.10639L-2.23207e-07 194.894C-2.22939e-07 197.711 2.28436 200 5.09524 200L315.905 200C318.716 200 321 197.711 321 194.894L321 5.10639C321 2.28937 318.716 1.00335e-05 315.905 1.00332e-05Z",
  "M275.763 105.838C285.724 105.838 293.825 113.957 293.825 123.94C293.825 133.923 285.724 142.043 275.763 142.043C265.802 142.043 257.7 133.923 257.7 123.94C257.7 113.957 265.802 105.838 275.763 105.838ZM275.763 102.434C263.908 102.434 254.303 112.06 254.303 123.94C254.303 135.821 263.908 145.447 275.763 145.447C287.618 145.447 297.222 135.821 297.222 123.94C297.222 112.06 287.618 102.434 275.763 102.434Z",
  "M275.763 143.745C294.248 143.745 309.484 158.33 313.115 177.452C313.29 178.376 312.685 179.266 311.764 179.442C310.843 179.618 309.953 179.012 309.778 178.088C306.395 160.274 292.333 147.149 275.763 147.149C259.191 147.149 245.229 160.176 241.78 177.892C241.6 178.814 240.709 179.417 239.788 179.237C238.867 179.057 238.267 178.163 238.446 177.24C242.148 158.224 257.28 143.745 275.763 143.745Z",
  "M308.219 97.0298C309.154 97.0298 309.918 97.7958 309.918 98.7319L309.918 177.123C309.918 178.06 309.154 178.826 308.219 178.826L243.298 178.826C242.363 178.826 241.599 178.06 241.599 177.123L241.599 98.7319C241.599 97.7957 242.363 97.0298 243.298 97.0298L308.219 97.0298ZM308.219 93.6255L243.298 93.6255C240.487 93.6255 238.202 95.9149 238.202 98.7319L238.202 177.123C238.202 179.94 240.487 182.23 243.298 182.23L308.219 182.23C311.03 182.23 313.315 179.94 313.315 177.123L313.315 98.7319C313.315 95.9149 311.03 93.6255 308.219 93.6255Z",
] as const;

// Outer rounded rectangle border path for progress stroke
const OUTER_BORDER_PATH_DATA = "M 5 3.4 H 315.9 A 1.7 1.7 0 0 1 317.6 5.1 V 194.9 A 1.7 1.7 0 0 1 315.9 196.6 H 5 A 1.7 1.7 0 0 1 3.4 194.9 V 5.1 A 1.7 1.7 0 0 1 5 3.4 Z";

let cachedCompiledPaths: Path2D[] | null = null;
let cachedOuterPath: Path2D | null = null;

function getCompiledFramePaths(): Path2D[] {
  if (!cachedCompiledPaths) {
    if (typeof Path2D !== "undefined") {
      cachedCompiledPaths = FRAME_PATHS.map((pathData) => new Path2D(pathData));
    } else {
      return [];
    }
  }
  return cachedCompiledPaths;
}

function getCompiledOuterPath(): Path2D | null {
  if (!cachedOuterPath && typeof Path2D !== "undefined") {
    cachedOuterPath = new Path2D(OUTER_BORDER_PATH_DATA);
  }
  return cachedOuterPath;
}

const FRAME_COLOR: Record<DetectionState, string> = {
  searching: "rgba(255, 255, 255, 0.85)",
  "card-detected": "rgba(244, 63, 94, 0.9)",
  "hold-still": "rgba(244, 63, 94, 0.9)",
  // Base frame when stable is semi-transparent green so active laser beam pops out sharply!
  stable: "rgba(52, 211, 153, 0.35)",
};

type CardGuideOverlayProps = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  detectionState: DetectionState;
  autoProgress?: number;
};

export function CardGuideOverlay({ canvasRef, detectionState, autoProgress = 0 }: CardGuideOverlayProps) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const drawGuide = () => {
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

      const compiledPaths = getCompiledFramePaths();
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);
      context.save();
      context.scale(width / FRAME_VIEWBOX_WIDTH, height / FRAME_VIEWBOX_HEIGHT);
      context.fillStyle = FRAME_COLOR[detectionState];
      for (const path of compiledPaths) {
        context.fill(path);
      }

      // Render soft, elegant progress stroke line (Emerald Green Glow)
      if (autoProgress > 0) {
        const outerPath = getCompiledOuterPath();
        if (outerPath) {
          const totalPerimeter = 1012;
          const progressLength = Math.min(1, Math.max(0, autoProgress)) * totalPerimeter;

          // Pass 1: Soft Emerald Glow
          context.strokeStyle = "rgba(52, 211, 153, 0.85)";
          context.lineWidth = 3.5;
          context.lineCap = "round";
          context.shadowColor = "rgba(52, 211, 153, 0.5)";
          context.shadowBlur = 8;
          context.setLineDash([progressLength, totalPerimeter]);
          context.stroke(outerPath);

          // Pass 2: Soft Mint Line
          context.strokeStyle = "rgba(209, 250, 229, 0.9)";
          context.lineWidth = 1.8;
          context.shadowBlur = 0;
          context.setLineDash([progressLength, totalPerimeter]);
          context.stroke(outerPath);
        }
      }

      context.restore();
    };

    drawGuide();

    if (typeof ResizeObserver !== "undefined") {
      const resizeObserver = new ResizeObserver(drawGuide);
      resizeObserver.observe(canvas);
      return () => resizeObserver.disconnect();
    }
  }, [autoProgress, canvasRef, detectionState]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 size-full rounded-xl transition-[box-shadow,background-color] duration-200 ${
        detectionState === "stable"
          ? "bg-emerald-400/5 shadow-[0_0_0_9999px_rgba(2,6,23,0.42),0_0_14px_rgba(52,211,153,0.35)]"
          : "bg-transparent shadow-[0_0_0_9999px_rgba(2,6,23,0.5)]"
      }`}
      aria-hidden="true"
    />
  );
}
