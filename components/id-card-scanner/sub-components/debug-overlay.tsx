"use client";

import type { DetectionDebugMetrics, DetectionState } from "@/hooks/use-id-card-scanner";

export function DebugOverlay({
  metrics,
  detectionState,
}: {
  metrics: DetectionDebugMetrics | null;
  detectionState: DetectionState;
}) {
  if (!metrics) return null;

  const buildText = () => {
    const f = (v: number | null | undefined, d = 3) =>
      v == null ? "null" : v.toFixed(d);
    const yn = (v: boolean | null | undefined) => (v ? "Y" : "N");

    return [
      `state=${detectionState}`,
      ``,
      `--- Frame ---`,
      `mean=${f(metrics.mean, 1)}`,
      `variance=${f(metrics.variance, 1)}`,
      `motion=${metrics.motion < 0 ? "null" : f(metrics.motion, 2)}`,
      `edgeDensity=${f(metrics.edgeDensity, 4)}`,
      `usableLight=${yn(metrics.hasUsableLight)}`,
      `cardDetails=${yn(metrics.hasCardDetails)}`,
      `presenceDetails=${yn(metrics.hasPresenceDetails)}`,
      ``,
      `--- Presence ---`,
      `conf=${f(metrics.cardPresenceConfidence)}`,
      `spanCoverage=${f(metrics.presenceSpanCoverage)}`,
      `aspectScore=${f(metrics.presenceAspectScore)}`,
      `minEdge=${f(metrics.presenceMinEdgeScore)}`,
      `minCorner=${f(metrics.presenceMinCornerScore)}`,
      `avgEdge=${f(metrics.presenceAvgEdgeScore)}`,
      `avgCorner=${f(metrics.presenceAvgCornerScore)}`,
      `edge(T/R/B/L)=${f(metrics.presenceEdgeTop)} ${f(metrics.presenceEdgeRight)} ${f(metrics.presenceEdgeBottom)} ${f(metrics.presenceEdgeLeft)}`,
      `corner(TL/TR/BR/BL)=${f(metrics.presenceCornerTL)} ${f(metrics.presenceCornerTR)} ${f(metrics.presenceCornerBR)} ${f(metrics.presenceCornerBL)}`,
      `meetsMin=${yn(metrics.meetsMinimumCard)}`,
      `meetsRelaxed=${yn(metrics.meetsRelaxedCard)}`,
      ``,
      `--- Capture ---`,
      `conf=${f(metrics.captureConfidence)}`,
      `aspectScore=${f(metrics.captureAspectScore)}`,
      `coverageScore=${f(metrics.captureCoverageScore)}`,
      `minEdge=${f(metrics.captureMinEdgeScore)}`,
      `minCorner=${f(metrics.captureMinCornerScore)}`,
      `avgEdge=${f(metrics.captureAvgEdgeScore)}`,
      `avgCorner=${f(metrics.captureAvgCornerScore)}`,
      `bgContrast=${f(metrics.captureInteriorBgContrast, 1)}`,
      `edge(T/R/B/L)=${f(metrics.captureEdgeTop)} ${f(metrics.captureEdgeRight)} ${f(metrics.captureEdgeBottom)} ${f(metrics.captureEdgeLeft)}`,
      `corner(TL/TR/BR/BL)=${f(metrics.captureCornerTL)} ${f(metrics.captureCornerTR)} ${f(metrics.captureCornerBR)} ${f(metrics.captureCornerBL)}`,
      `meetsMinGeom=${yn(metrics.meetsMinimumGeometry)}`,
      `meetsRelaxGeom=${yn(metrics.meetsRelaxedGeometry)}`,
      ``,
      `--- Skew ---`,
      `presSkewScore=${f(metrics.presenceSkewScore)}`,
      `presParallelism=${f(metrics.presenceParallelismScore)}`,
      `presSlopes(T/R/B/L)=${f(metrics.presenceEdgeSlopeTop, 4)} ${f(metrics.presenceEdgeSlopeRight, 4)} ${f(metrics.presenceEdgeSlopeBottom, 4)} ${f(metrics.presenceEdgeSlopeLeft, 4)}`,
      `capSkewScore=${f(metrics.captureSkewScore)}`,
      `capParallelism=${f(metrics.captureParallelismScore)}`,
      `capSlopes(T/R/B/L)=${f(metrics.captureEdgeSlopeTop, 4)} ${f(metrics.captureEdgeSlopeRight, 4)} ${f(metrics.captureEdgeSlopeBottom, 4)} ${f(metrics.captureEdgeSlopeLeft, 4)}`,
    ].join("\n");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildText());
    } catch {
      const ta = document.createElement("textarea");
      ta.value = buildText();
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="absolute right-3 top-3 z-20 rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white/80 backdrop-blur-sm hover:bg-white/20 active:scale-95"
    >
      📋 Copy Debug
    </button>
  );
}
