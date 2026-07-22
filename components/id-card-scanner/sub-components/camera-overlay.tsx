"use client";

import type { RefObject } from "react";
import type { DetectionState } from "@/hooks/use-id-card-scanner";
import { CardGuideOverlay } from "@/components/card-guide-overlay";
import { ID_CARD_ASPECT_RATIO } from "@/lib/id-card-scanner-config";

type StatusInfo = { text: string; dotClassName: string };

export function CameraOverlay({
  guideRef,
  detectionState,
  autoProgress,
  statusUi,
}: {
  guideRef: RefObject<HTMLCanvasElement | null>;
  detectionState: DetectionState;
  autoProgress: number;
  statusUi: StatusInfo;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center px-5">
      <div
        className="relative shrink-0 rounded-xl"
        style={{
          width: "min(calc(100% - 1rem), 68dvh)",
          aspectRatio: ID_CARD_ASPECT_RATIO,
        }}
      >
        <CardGuideOverlay
          canvasRef={guideRef}
          detectionState={detectionState}
          autoProgress={autoProgress}
        />

        <div
          role="status"
          aria-live="polite"
          className="absolute -top-14 left-1/2 w-max max-w-[90vw] -translate-x-1/2 rounded-full bg-black/65 px-4 py-2 text-center text-sm font-medium text-white shadow-lg backdrop-blur-md"
        >
          <span className={`mr-2 inline-block size-2.5 rounded-full ${statusUi.dotClassName}`} />
          {statusUi.text}
        </div>
      </div>
    </div>
  );
}
