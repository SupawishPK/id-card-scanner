import {
  EDGE_LUMA_DELTA_THRESHOLD,
  EDGE_SCAN_INSET_RATIO,
} from "./config";

export type IEdgeMeasurement = {
  score: number;
  position: number;
  slope: number;
};

export type ICardEdges = {
  top: IEdgeMeasurement;
  right: IEdgeMeasurement;
  bottom: IEdgeMeasurement;
  left: IEdgeMeasurement;
};

export type IEdgeScores = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type ICornerScores = {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
};

export const clamp01 = (value: number): number =>
  Math.max(0, Math.min(1, value));

export const alignUp = (value: number, step: number): number =>
  Math.ceil(value / step) * step;

export const alignDown = (value: number, step: number): number =>
  Math.floor(value / step) * step;

export type IAlignmentScoreParams = {
  positionCount: number;
  positionSum: number;
  positionSquaredSum: number;
  positiveDirectionCount: number;
  scanlines: number;
  bandWidth: number;
  dimension: number;
  positionScanlineCrossSum?: number;
  scanlineSum?: number;
  scanlineSquaredSum?: number;
};

export const calculateEdgeAlignmentScore = ({
  positionCount,
  positionSum,
  positionSquaredSum,
  positiveDirectionCount,
  scanlines,
  bandWidth,
  dimension,
  positionScanlineCrossSum,
  scanlineSum,
  scanlineSquaredSum,
}: IAlignmentScoreParams): IEdgeMeasurement => {
  if (!positionCount || !scanlines) return { score: 0, position: 0, slope: 0 };

  const mean = positionSum / positionCount;
  const variance = Math.max(
    0,
    positionSquaredSum / positionCount - mean * mean,
  );
  const support = positionCount / scanlines;
  const alignment = clamp01(
    1 - Math.sqrt(variance) / Math.max(1, bandWidth * 0.45),
  );
  const consistentDirections = Math.max(
    positiveDirectionCount,
    positionCount - positiveDirectionCount,
  );
  const directionScore = clamp01(
    (consistentDirections / positionCount - 0.5) * 2,
  );

  let slope = 0;
  if (
    positionScanlineCrossSum !== undefined &&
    scanlineSum !== undefined &&
    scanlineSquaredSum !== undefined &&
    positionCount > 2
  ) {
    const n = positionCount;
    const denominator = n * scanlineSquaredSum - scanlineSum * scanlineSum;
    if (Math.abs(denominator) > 1e-10) {
      const rawSlope =
        (n * positionScanlineCrossSum - positionSum * scanlineSum) / denominator;
      slope = Math.atan(rawSlope / Math.max(1, dimension));
    }
  }

  return {
    score: support * (0.08 + alignment * 0.72 + directionScore * 0.2),
    position: mean / dimension,
    slope,
  };
};

export type IMeasureEdgeParams = {
  luma: Uint8Array;
  width: number;
  height: number;
  bandStartRatio: number;
  bandEndRatio: number;
  step: number;
  scanStartRatio?: number;
  scanEndRatio?: number;
};

export const measureVerticalEdgeScore = ({
  luma,
  width,
  height,
  bandStartRatio,
  bandEndRatio,
  step,
  scanStartRatio = EDGE_SCAN_INSET_RATIO,
  scanEndRatio = 1 - EDGE_SCAN_INSET_RATIO,
}: IMeasureEdgeParams): IEdgeMeasurement => {
  const xStart = Math.max(step, alignUp(width * bandStartRatio, step));
  const xEnd = Math.min(
    width - step - 1,
    alignDown(width * bandEndRatio, step),
  );
  const yStart = Math.max(0, alignUp(height * scanStartRatio, step));
  const yEnd = Math.min(height - 1, alignDown(height * scanEndRatio, step));
  if (xEnd < xStart || yEnd < yStart) return { score: 0, position: 0, slope: 0 };

  let positionCount = 0;
  let positionSum = 0;
  let positionSquaredSum = 0;
  let positiveDirectionCount = 0;
  let scanlines = 0;
  let positionScanlineCrossSum = 0;
  let scanlineSum = 0;
  let scanlineSquaredSum = 0;

  for (let y = yStart; y <= yEnd; y += step) {
    let strongestDelta = 0;
    let strongestSignedDelta = 0;
    let strongestPosition = xStart;

    for (let x = xStart; x <= xEnd; x += step) {
      const signedDelta =
        luma[y * width + x + step] - luma[y * width + x - step];
      const delta = Math.abs(signedDelta);
      if (delta > strongestDelta) {
        strongestDelta = delta;
        strongestSignedDelta = signedDelta;
        strongestPosition = x;
      }
    }

    if (strongestDelta >= EDGE_LUMA_DELTA_THRESHOLD) {
      positionCount += 1;
      positionSum += strongestPosition;
      positionSquaredSum += strongestPosition * strongestPosition;
      if (strongestSignedDelta >= 0) positiveDirectionCount += 1;
      positionScanlineCrossSum += strongestPosition * y;
      scanlineSum += y;
      scanlineSquaredSum += y * y;
    }
    scanlines += 1;
  }

  return calculateEdgeAlignmentScore({
    positionCount,
    positionSum,
    positionSquaredSum,
    positiveDirectionCount,
    scanlines,
    bandWidth: xEnd - xStart + step,
    dimension: width,
    positionScanlineCrossSum,
    scanlineSum,
    scanlineSquaredSum,
  });
};

export const measureHorizontalEdgeScore = ({
  luma,
  width,
  height,
  bandStartRatio,
  bandEndRatio,
  step,
  scanStartRatio = EDGE_SCAN_INSET_RATIO,
  scanEndRatio = 1 - EDGE_SCAN_INSET_RATIO,
}: IMeasureEdgeParams): IEdgeMeasurement => {
  const yStart = Math.max(step, alignUp(height * bandStartRatio, step));
  const yEnd = Math.min(
    height - step - 1,
    alignDown(height * bandEndRatio, step),
  );
  const xStart = Math.max(0, alignUp(width * scanStartRatio, step));
  const xEnd = Math.min(width - 1, alignDown(width * scanEndRatio, step));
  if (yEnd < yStart || xEnd < xStart) return { score: 0, position: 0, slope: 0 };

  let positionCount = 0;
  let positionSum = 0;
  let positionSquaredSum = 0;
  let positiveDirectionCount = 0;
  let scanlines = 0;
  let positionScanlineCrossSum = 0;
  let scanlineSum = 0;
  let scanlineSquaredSum = 0;

  for (let x = xStart; x <= xEnd; x += step) {
    let strongestDelta = 0;
    let strongestSignedDelta = 0;
    let strongestPosition = yStart;

    for (let y = yStart; y <= yEnd; y += step) {
      const signedDelta =
        luma[(y + step) * width + x] - luma[(y - step) * width + x];
      const delta = Math.abs(signedDelta);
      if (delta > strongestDelta) {
        strongestDelta = delta;
        strongestSignedDelta = signedDelta;
        strongestPosition = y;
      }
    }

    if (strongestDelta >= EDGE_LUMA_DELTA_THRESHOLD) {
      positionCount += 1;
      positionSum += strongestPosition;
      positionSquaredSum += strongestPosition * strongestPosition;
      if (strongestSignedDelta >= 0) positiveDirectionCount += 1;
      positionScanlineCrossSum += strongestPosition * x;
      scanlineSum += x;
      scanlineSquaredSum += x * x;
    }
    scanlines += 1;
  }

  return calculateEdgeAlignmentScore({
    positionCount,
    positionSum,
    positionSquaredSum,
    positiveDirectionCount,
    scanlines,
    bandWidth: yEnd - yStart + step,
    dimension: height,
    positionScanlineCrossSum,
    scanlineSum,
    scanlineSquaredSum,
  });
};
