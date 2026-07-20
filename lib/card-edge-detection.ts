// Include background around the guideline so edges remain measurable when the
// card is aligned exactly with the visible frame.
export const CARD_ANALYSIS_PADDING_RATIO = 0.08;
export const CARD_SHAPE_ENTER_CONFIDENCE = 0.62;
export const CARD_SHAPE_EXIT_CONFIDENCE = 0.5;

const EDGE_BAND_TOLERANCE_RATIO = 0.035;
const EDGE_SCAN_INSET_RATIO = 0.14;
const CORNER_RADIUS_RATIO = 0.055;
const EDGE_LUMA_DELTA_THRESHOLD = 16;
const MIN_EDGE_SCORE = 0.42;
const MIN_CORNER_SCORE = 0.16;

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

  return {
    // Random texture can create edge pixels, but it will not align into one
    // continuous side. Weight alignment more heavily than raw support.
    score: support * (0.1 + alignment * 0.9),
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
): EdgeMeasurement {
  const xStart = Math.max(step, alignUp(width * bandStartRatio, step));
  const xEnd = Math.min(
    width - step - 1,
    alignDown(width * bandEndRatio, step),
  );
  const yStart = alignUp(height * EDGE_SCAN_INSET_RATIO, step);
  const yEnd = alignDown(height * (1 - EDGE_SCAN_INSET_RATIO), step);
  let positionCount = 0;
  let positionSum = 0;
  let positionSquaredSum = 0;
  let scanlines = 0;

  for (let y = yStart; y <= yEnd; y += step) {
    let strongestDelta = 0;
    let strongestPosition = xStart;
    for (let x = xStart; x <= xEnd; x += step) {
      const delta = Math.abs(
        luma[y * width + x + step] - luma[y * width + x - step],
      );
      if (delta > strongestDelta) {
        strongestDelta = delta;
        strongestPosition = x;
      }
    }
    if (strongestDelta >= EDGE_LUMA_DELTA_THRESHOLD) {
      positionCount += 1;
      positionSum += strongestPosition;
      positionSquaredSum += strongestPosition * strongestPosition;
    }
    scanlines += 1;
  }

  return scoreEdgePositions(
    positionCount,
    positionSum,
    positionSquaredSum,
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
): EdgeMeasurement {
  const yStart = Math.max(step, alignUp(height * bandStartRatio, step));
  const yEnd = Math.min(
    height - step - 1,
    alignDown(height * bandEndRatio, step),
  );
  const xStart = alignUp(width * EDGE_SCAN_INSET_RATIO, step);
  const xEnd = alignDown(width * (1 - EDGE_SCAN_INSET_RATIO), step);
  let positionCount = 0;
  let positionSum = 0;
  let positionSquaredSum = 0;
  let scanlines = 0;

  for (let x = xStart; x <= xEnd; x += step) {
    let strongestDelta = 0;
    let strongestPosition = yStart;
    for (let y = yStart; y <= yEnd; y += step) {
      const delta = Math.abs(
        luma[(y + step) * width + x] - luma[(y - step) * width + x],
      );
      if (delta > strongestDelta) {
        strongestDelta = delta;
        strongestPosition = y;
      }
    }
    if (strongestDelta >= EDGE_LUMA_DELTA_THRESHOLD) {
      positionCount += 1;
      positionSum += strongestPosition;
      positionSquaredSum += strongestPosition * strongestPosition;
    }
    scanlines += 1;
  }

  return scoreEdgePositions(
    positionCount,
    positionSum,
    positionSquaredSum,
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
  expectedNearEdge: number,
  expectedFarEdge: number,
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
        xRatio > expectedNearEdge + interiorInset &&
        xRatio < expectedFarEdge - interiorInset &&
        yRatio > expectedNearEdge + interiorInset &&
        yRatio < expectedFarEdge - interiorInset;
      const isBackground =
        xRatio < expectedNearEdge - backgroundInset ||
        xRatio > expectedFarEdge + backgroundInset ||
        yRatio < expectedNearEdge - backgroundInset ||
        yRatio > expectedFarEdge + backgroundInset;

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
  const nearStart = Math.max(
    0,
    expectedNearEdge - EDGE_BAND_TOLERANCE_RATIO,
  );
  const nearEnd = expectedNearEdge + EDGE_BAND_TOLERANCE_RATIO;
  const farStart = 1 - nearEnd;
  const farEnd = Math.min(1, 1 - nearStart);

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
    expectedNearEdge,
    expectedNearEdge,
    step,
  );
  const topRight = measureCorner(
    luma,
    width,
    height,
    expectedFarEdge,
    expectedNearEdge,
    step,
  );
  const bottomRight = measureCorner(
    luma,
    width,
    height,
    expectedFarEdge,
    expectedFarEdge,
    step,
  );
  const bottomLeft = measureCorner(
    luma,
    width,
    height,
    expectedNearEdge,
    expectedFarEdge,
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

  const expectedSpan = expectedFarEdge - expectedNearEdge;
  const widthCoverage = detectedWidth / (width * expectedSpan);
  const heightCoverage = detectedHeight / (height * expectedSpan);
  const coverageScore =
    (clamp01(1 - Math.abs(widthCoverage - 1) / 0.18) +
      clamp01(1 - Math.abs(heightCoverage - 1) / 0.18)) /
    2;

  const interiorBackgroundContrast = measureInteriorBackgroundContrast(
    luma,
    width,
    height,
    expectedNearEdge,
    expectedFarEdge,
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
      coverageScore >= 0.5,
  };
}
