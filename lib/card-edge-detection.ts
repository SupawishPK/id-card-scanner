// Include background around the guideline so edges remain measurable when the
// card is aligned exactly with the visible frame.
export const CARD_ANALYSIS_PADDING_RATIO = 0.08;
export const CARD_SHAPE_ENTER_CONFIDENCE = 0.56;
export const CARD_SHAPE_EXIT_CONFIDENCE = 0.46;
export const CARD_PRESENCE_ENTER_CONFIDENCE = 0.54;
export const CARD_PRESENCE_EXIT_CONFIDENCE = 0.44;

const EDGE_SCAN_INSET_RATIO = 0.14;
const CORNER_RADIUS_RATIO = 0.055;
const EDGE_LUMA_DELTA_THRESHOLD = 16;
const MIN_EDGE_SCORE = 0.38;
const MIN_CORNER_SCORE = 0.12;
// A visually 80% card measures about 79.8% after the 2px sampling grid.
const MIN_CAPTURE_SPAN_COVERAGE = 0.79;
const MIN_PRESENCE_EDGE_SCORE = 0.42;
const MIN_PRESENCE_CORNER_SCORE = 0.12;
// Presence is intentionally permissive; capture readiness remains at 80%.
const MIN_PRESENCE_SPAN_COVERAGE = 0.23;

type EdgeMeasurement = {
  score: number;
  position: number;
};

export type CardShapeMetrics = {
  edgeScores: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  cornerScores: {
    topLeft: number;
    topRight: number;
    bottomRight: number;
    bottomLeft: number;
  };
  interiorBackgroundContrast: number;
  aspectScore: number;
  coverageScore: number;
  cardShapeConfidence: number;
  meetsMinimumGeometry: boolean;
  meetsRelaxedGeometry: boolean;
};

export type CardPresenceMetrics = {
  cardPresenceConfidence: number;
  spanCoverage: number;
  aspectScore: number;
  minimumEdgeScore: number;
  minimumCornerScore: number;
  meetsMinimumCard: boolean;
  meetsRelaxedCard: boolean;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function alignUp(value: number, step: number) {
  return Math.ceil(value / step) * step;
}

function alignDown(value: number, step: number) {
  return Math.floor(value / step) * step;
}

function scoreEdgePositions(
  positionCount: number,
  positionSum: number,
  positionSquaredSum: number,
  positiveDirectionCount: number,
  scanlines: number,
  bandWidth: number,
  dimension: number,
): EdgeMeasurement {
  if (!positionCount || !scanlines) return { score: 0, position: 0 };

  const mean = positionSum / positionCount;
  const variance = Math.max(
    0,
    positionSquaredSum / positionCount - mean * mean,
  );
  const standardDeviation = Math.sqrt(variance);
  const support = positionCount / scanlines;
  const alignment = clamp01(1 - standardDeviation / Math.max(1, bandWidth * 0.45));
  const directionConsistency = Math.max(
    positiveDirectionCount,
    positionCount - positiveDirectionCount,
  ) / positionCount;
  const directionScore = clamp01((directionConsistency - 0.5) * 2);

  return {
    // Random texture can create edge pixels, but it will not align into one
    // continuous side. Weight alignment more heavily than raw support.
    score: support * (0.08 + alignment * 0.72 + directionScore * 0.2),
    position: mean / dimension,
  };
}

function measureVerticalEdge(
  luma: Uint8Array,
  width: number,
  height: number,
  bandStartRatio: number,
  bandEndRatio: number,
  step: number,
  scanStartRatio = EDGE_SCAN_INSET_RATIO,
  scanEndRatio = 1 - EDGE_SCAN_INSET_RATIO,
): EdgeMeasurement {
  const xStart = Math.max(step, alignUp(width * bandStartRatio, step));
  const xEnd = Math.min(
    width - step - 1,
    alignDown(width * bandEndRatio, step),
  );
  const yStart = Math.max(0, alignUp(height * scanStartRatio, step));
  const yEnd = Math.min(height - 1, alignDown(height * scanEndRatio, step));
  if (xEnd < xStart || yEnd < yStart) return { score: 0, position: 0 };
  let positionCount = 0;
  let positionSum = 0;
  let positionSquaredSum = 0;
  let positiveDirectionCount = 0;
  let scanlines = 0;

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
    }
    scanlines += 1;
  }

  return scoreEdgePositions(
    positionCount,
    positionSum,
    positionSquaredSum,
    positiveDirectionCount,
    scanlines,
    xEnd - xStart + step,
    width,
  );
}

function measureHorizontalEdge(
  luma: Uint8Array,
  width: number,
  height: number,
  bandStartRatio: number,
  bandEndRatio: number,
  step: number,
  scanStartRatio = EDGE_SCAN_INSET_RATIO,
  scanEndRatio = 1 - EDGE_SCAN_INSET_RATIO,
): EdgeMeasurement {
  const yStart = Math.max(step, alignUp(height * bandStartRatio, step));
  const yEnd = Math.min(
    height - step - 1,
    alignDown(height * bandEndRatio, step),
  );
  const xStart = Math.max(0, alignUp(width * scanStartRatio, step));
  const xEnd = Math.min(width - 1, alignDown(width * scanEndRatio, step));
  if (yEnd < yStart || xEnd < xStart) return { score: 0, position: 0 };
  let positionCount = 0;
  let positionSum = 0;
  let positionSquaredSum = 0;
  let positiveDirectionCount = 0;
  let scanlines = 0;

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
    }
    scanlines += 1;
  }

  return scoreEdgePositions(
    positionCount,
    positionSum,
    positionSquaredSum,
    positiveDirectionCount,
    scanlines,
    yEnd - yStart + step,
    height,
  );
}

function measureCorner(
  luma: Uint8Array,
  width: number,
  height: number,
  centerXRatio: number,
  centerYRatio: number,
  step: number,
) {
  const xRadius = width * CORNER_RADIUS_RATIO;
  const yRadius = height * CORNER_RADIUS_RATIO;
  const xStart = Math.max(step, alignUp(width * centerXRatio - xRadius, step));
  const xEnd = Math.min(
    width - step - 1,
    alignDown(width * centerXRatio + xRadius, step),
  );
  const yStart = Math.max(step, alignUp(height * centerYRatio - yRadius, step));
  const yEnd = Math.min(
    height - step - 1,
    alignDown(height * centerYRatio + yRadius, step),
  );
  let verticalSupports = 0;
  let horizontalSupports = 0;
  let verticalScanlines = 0;
  let horizontalScanlines = 0;

  for (let y = yStart; y <= yEnd; y += step) {
    let strongest = 0;
    for (let x = xStart; x <= xEnd; x += step) {
      strongest = Math.max(
        strongest,
        Math.abs(luma[y * width + x + step] - luma[y * width + x - step]),
      );
    }
    if (strongest >= EDGE_LUMA_DELTA_THRESHOLD) verticalSupports += 1;
    verticalScanlines += 1;
  }

  for (let x = xStart; x <= xEnd; x += step) {
    let strongest = 0;
    for (let y = yStart; y <= yEnd; y += step) {
      strongest = Math.max(
        strongest,
        Math.abs(luma[(y + step) * width + x] - luma[(y - step) * width + x]),
      );
    }
    if (strongest >= EDGE_LUMA_DELTA_THRESHOLD) horizontalSupports += 1;
    horizontalScanlines += 1;
  }

  const verticalScore = verticalScanlines ? verticalSupports / verticalScanlines : 0;
  const horizontalScore = horizontalScanlines
    ? horizontalSupports / horizontalScanlines
    : 0;
  return Math.sqrt(verticalScore * horizontalScore);
}

function measureInteriorBackgroundContrast(
  luma: Uint8Array,
  width: number,
  height: number,
  leftEdge: number,
  rightEdge: number,
  topEdge: number,
  bottomEdge: number,
  step: number,
) {
  const interiorInset = 0.025;
  const backgroundInset = 0.012;
  let interiorSum = 0;
  let interiorSamples = 0;
  let backgroundSum = 0;
  let backgroundSamples = 0;

  for (let y = 0; y < height; y += step) {
    const yRatio = y / height;
    for (let x = 0; x < width; x += step) {
      const xRatio = x / width;
      const value = luma[y * width + x];
      const isInterior =
        xRatio > leftEdge + interiorInset &&
        xRatio < rightEdge - interiorInset &&
        yRatio > topEdge + interiorInset &&
        yRatio < bottomEdge - interiorInset;
      const isBackground =
        xRatio < leftEdge - backgroundInset ||
        xRatio > rightEdge + backgroundInset ||
        yRatio < topEdge - backgroundInset ||
        yRatio > bottomEdge + backgroundInset;

      if (isInterior) {
        interiorSum += value;
        interiorSamples += 1;
      } else if (isBackground) {
        backgroundSum += value;
        backgroundSamples += 1;
      }
    }
  }

  if (!interiorSamples || !backgroundSamples) return 0;
  return Math.abs(
    interiorSum / interiorSamples - backgroundSum / backgroundSamples,
  );
}

/** Detects a plausible ID-1 rectangle anywhere inside the guideline. */
export function detectCardPresence(
  luma: Uint8Array,
  width: number,
  height: number,
  step = 2,
): CardPresenceMetrics {
  const guidelineNearEdge =
    CARD_ANALYSIS_PADDING_RATIO / (1 + CARD_ANALYSIS_PADDING_RATIO * 2);
  const guidelineFarEdge = 1 - guidelineNearEdge;
  const searchOuterEdge = Math.max(0.02, guidelineNearEdge - 0.025);

  const coarseLeft = measureVerticalEdge(
    luma,
    width,
    height,
    searchOuterEdge,
    0.46,
    step,
  );
  const coarseRight = measureVerticalEdge(
    luma,
    width,
    height,
    0.54,
    1 - searchOuterEdge,
    step,
  );
  const coarseTop = measureHorizontalEdge(
    luma,
    width,
    height,
    searchOuterEdge,
    0.46,
    step,
  );
  const coarseBottom = measureHorizontalEdge(
    luma,
    width,
    height,
    0.54,
    1 - searchOuterEdge,
    step,
  );

  // The coarse pass finds approximate bounds over the whole ROI. Re-score each
  // side only across the detected card span so a small but continuous edge is
  // not penalized merely because it occupies fewer global scanlines.
  const refinementBand = 0.04;
  const spanInset = 0.018;
  const left = measureVerticalEdge(
    luma,
    width,
    height,
    coarseLeft.position - refinementBand,
    coarseLeft.position + refinementBand,
    step,
    coarseTop.position + spanInset,
    coarseBottom.position - spanInset,
  );
  const right = measureVerticalEdge(
    luma,
    width,
    height,
    coarseRight.position - refinementBand,
    coarseRight.position + refinementBand,
    step,
    coarseTop.position + spanInset,
    coarseBottom.position - spanInset,
  );
  const top = measureHorizontalEdge(
    luma,
    width,
    height,
    coarseTop.position - refinementBand,
    coarseTop.position + refinementBand,
    step,
    coarseLeft.position + spanInset,
    coarseRight.position - spanInset,
  );
  const bottom = measureHorizontalEdge(
    luma,
    width,
    height,
    coarseBottom.position - refinementBand,
    coarseBottom.position + refinementBand,
    step,
    coarseLeft.position + spanInset,
    coarseRight.position - spanInset,
  );

  const detectedWidth = Math.max(0, right.position - left.position) * width;
  const detectedHeight = Math.max(0, bottom.position - top.position) * height;
  const detectedAspect = detectedHeight ? detectedWidth / detectedHeight : 0;
  const expectedAspect = width / height;
  const aspectError = detectedAspect
    ? Math.abs(Math.log(detectedAspect / expectedAspect))
    : Number.POSITIVE_INFINITY;
  const aspectScore = clamp01(1 - aspectError / 0.18);
  const guidelineSpan = guidelineFarEdge - guidelineNearEdge;
  const widthCoverage = detectedWidth / (width * guidelineSpan);
  const heightCoverage = detectedHeight / (height * guidelineSpan);
  const spanCoverage = Math.min(widthCoverage, heightCoverage);

  const topLeft = measureCorner(
    luma,
    width,
    height,
    left.position,
    top.position,
    step,
  );
  const topRight = measureCorner(
    luma,
    width,
    height,
    right.position,
    top.position,
    step,
  );
  const bottomRight = measureCorner(
    luma,
    width,
    height,
    right.position,
    bottom.position,
    step,
  );
  const bottomLeft = measureCorner(
    luma,
    width,
    height,
    left.position,
    bottom.position,
    step,
  );
  const interiorBackgroundContrast = measureInteriorBackgroundContrast(
    luma,
    width,
    height,
    left.position,
    right.position,
    top.position,
    bottom.position,
    step,
  );
  const contrastScore = clamp01((interiorBackgroundContrast - 4) / 20);
  const averageEdgeScore = (top.score + right.score + bottom.score + left.score) / 4;
  const averageCornerScore =
    (topLeft + topRight + bottomRight + bottomLeft) / 4;
  const coverageConfidence = clamp01(
    (spanCoverage - MIN_PRESENCE_SPAN_COVERAGE) / 0.35,
  );
  const cardPresenceConfidence = clamp01(
    averageEdgeScore * 0.42 +
      averageCornerScore * 0.23 +
      aspectScore * 0.18 +
      contrastScore * 0.1 +
      coverageConfidence * 0.07,
  );
  const minimumEdgeScore = Math.min(
    top.score,
    right.score,
    bottom.score,
    left.score,
  );
  const minimumCornerScore = Math.min(
    topLeft,
    topRight,
    bottomRight,
    bottomLeft,
  );

  return {
    cardPresenceConfidence,
    spanCoverage,
    aspectScore,
    minimumEdgeScore,
    minimumCornerScore,
    meetsMinimumCard:
      minimumEdgeScore >= MIN_PRESENCE_EDGE_SCORE &&
      minimumCornerScore >= MIN_PRESENCE_CORNER_SCORE &&
      aspectScore >= 0.48 &&
      spanCoverage >= MIN_PRESENCE_SPAN_COVERAGE &&
      widthCoverage <= 1.08 &&
      heightCoverage <= 1.08,
    meetsRelaxedCard:
      minimumEdgeScore >= 0.4 &&
      minimumCornerScore >= 0.08 &&
      aspectScore >= 0.38 &&
      spanCoverage >= 0.2 &&
      widthCoverage <= 1.12 &&
      heightCoverage <= 1.12,
  };
}

/** Produces a model-free confidence score for a card aligned to the ROI. */
export function detectCardShape(
  luma: Uint8Array,
  width: number,
  height: number,
  step = 2,
): CardShapeMetrics {
  const expectedNearEdge =
    CARD_ANALYSIS_PADDING_RATIO / (1 + CARD_ANALYSIS_PADDING_RATIO * 2);
  const expectedFarEdge = 1 - expectedNearEdge;
  const expectedSpan = expectedFarEdge - expectedNearEdge;
  const outerTolerance = 0.02;
  const innerSearchAllowance = expectedSpan * 0.12;
  // Search inward far enough to accept a centered card covering 80% of the
  // guideline, but only slightly outside so oversized cards remain rejected.
  const nearStart = Math.max(0, expectedNearEdge - outerTolerance);
  const nearEnd = expectedNearEdge + innerSearchAllowance;
  const farStart = expectedFarEdge - innerSearchAllowance;
  const farEnd = Math.min(1, expectedFarEdge + outerTolerance);

  const top = measureHorizontalEdge(
    luma,
    width,
    height,
    nearStart,
    nearEnd,
    step,
  );
  const right = measureVerticalEdge(
    luma,
    width,
    height,
    farStart,
    farEnd,
    step,
  );
  const bottom = measureHorizontalEdge(
    luma,
    width,
    height,
    farStart,
    farEnd,
    step,
  );
  const left = measureVerticalEdge(
    luma,
    width,
    height,
    nearStart,
    nearEnd,
    step,
  );

  const topLeft = measureCorner(
    luma,
    width,
    height,
    left.position,
    top.position,
    step,
  );
  const topRight = measureCorner(
    luma,
    width,
    height,
    right.position,
    top.position,
    step,
  );
  const bottomRight = measureCorner(
    luma,
    width,
    height,
    right.position,
    bottom.position,
    step,
  );
  const bottomLeft = measureCorner(
    luma,
    width,
    height,
    left.position,
    bottom.position,
    step,
  );

  const detectedWidth = Math.max(0, right.position - left.position) * width;
  const detectedHeight = Math.max(0, bottom.position - top.position) * height;
  const detectedAspect = detectedHeight ? detectedWidth / detectedHeight : 0;
  const expectedAspect = width / height;
  const aspectError = detectedAspect
    ? Math.abs(Math.log(detectedAspect / expectedAspect))
    : Number.POSITIVE_INFINITY;
  const aspectScore = clamp01(1 - aspectError / 0.14);

  const widthCoverage = detectedWidth / (width * expectedSpan);
  const heightCoverage = detectedHeight / (height * expectedSpan);
  const coverageScore = clamp01(Math.min(widthCoverage, heightCoverage));
  const isInsideGuideline =
    left.position >= expectedNearEdge - outerTolerance &&
    right.position <= expectedFarEdge + outerTolerance &&
    top.position >= expectedNearEdge - outerTolerance &&
    bottom.position <= expectedFarEdge + outerTolerance;

  const interiorBackgroundContrast = measureInteriorBackgroundContrast(
    luma,
    width,
    height,
    left.position,
    right.position,
    top.position,
    bottom.position,
    step,
  );
  // A small contrast still contributes, while strong separation saturates so
  // dark tables and bright tables are treated equally.
  const contrastScore = clamp01((interiorBackgroundContrast - 4) / 20);
  const edgeScores = {
    top: top.score,
    right: right.score,
    bottom: bottom.score,
    left: left.score,
  };
  const cornerScores = { topLeft, topRight, bottomRight, bottomLeft };
  const averageEdgeScore =
    (edgeScores.top + edgeScores.right + edgeScores.bottom + edgeScores.left) /
    4;
  const averageCornerScore =
    (topLeft + topRight + bottomRight + bottomLeft) / 4;
  const cardShapeConfidence = clamp01(
    averageEdgeScore * 0.42 +
      averageCornerScore * 0.18 +
      contrastScore * 0.15 +
      aspectScore * 0.15 +
      coverageScore * 0.1,
  );
  const minimumEdgeScore = Math.min(
    edgeScores.top,
    edgeScores.right,
    edgeScores.bottom,
    edgeScores.left,
  );
  const minimumCornerScore = Math.min(
    cornerScores.topLeft,
    cornerScores.topRight,
    cornerScores.bottomRight,
    cornerScores.bottomLeft,
  );

  return {
    edgeScores,
    cornerScores,
    interiorBackgroundContrast,
    aspectScore,
    coverageScore,
    cardShapeConfidence,
    meetsMinimumGeometry:
      minimumEdgeScore >= MIN_EDGE_SCORE &&
      minimumCornerScore >= MIN_CORNER_SCORE &&
      aspectScore >= 0.5 &&
      widthCoverage >= MIN_CAPTURE_SPAN_COVERAGE &&
      heightCoverage >= MIN_CAPTURE_SPAN_COVERAGE &&
      widthCoverage <= 1.04 &&
      heightCoverage <= 1.04 &&
      isInsideGuideline,
    meetsRelaxedGeometry:
      minimumEdgeScore >= 0.36 &&
      minimumCornerScore >= 0.1 &&
      aspectScore >= 0.4 &&
      widthCoverage >= 0.74 &&
      heightCoverage >= 0.74 &&
      widthCoverage <= 1.08 &&
      heightCoverage <= 1.08 &&
      left.position >= expectedNearEdge - 0.035 &&
      right.position <= expectedFarEdge + 0.035 &&
      top.position >= expectedNearEdge - 0.035 &&
      bottom.position <= expectedFarEdge + 0.035,
  };
}
