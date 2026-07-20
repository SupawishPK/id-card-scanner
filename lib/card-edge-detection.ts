export const CARD_DETECTION_CONFIG = {
  // Background padding keeps edges measurable when the card matches the guide.
  analysisPaddingRatio: 0.08,
  presenceConfidence: { enter: 0.54, exit: 0.44 },
  captureConfidence: { enter: 0.56, exit: 0.46 },
} as const;

const EDGE_SCAN_INSET_RATIO = 0.14;
const CORNER_RADIUS_RATIO = 0.055;
const EDGE_LUMA_DELTA_THRESHOLD = 16;

const PRESENCE_RULES = {
  minEdgeScore: 0.42,
  minCornerScore: 0.12,
  minAspectScore: 0.48,
  minSpanCoverage: 0.23,
  maxSpanCoverage: 1.08,
} as const;

const RELAXED_PRESENCE_RULES = {
  minEdgeScore: 0.4,
  minCornerScore: 0.08,
  minAspectScore: 0.38,
  minSpanCoverage: 0.2,
  maxSpanCoverage: 1.12,
} as const;

const CAPTURE_RULES = {
  minEdgeScore: 0.38,
  minCornerScore: 0.12,
  minAspectScore: 0.5,
  // A visually 80% card measures about 79.8% on the 2px sampling grid.
  minSpanCoverage: 0.79,
  maxSpanCoverage: 1.04,
  outerTolerance: 0.02,
} as const;

const RELAXED_CAPTURE_RULES = {
  minEdgeScore: 0.36,
  minCornerScore: 0.1,
  minAspectScore: 0.4,
  minSpanCoverage: 0.74,
  maxSpanCoverage: 1.08,
  outerTolerance: 0.035,
} as const;

type EdgeMeasurement = {
  score: number;
  position: number;
};

type CardEdges = {
  top: EdgeMeasurement;
  right: EdgeMeasurement;
  bottom: EdgeMeasurement;
  left: EdgeMeasurement;
};

type EdgeScores = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type CornerScores = {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
};

type GeometryMetrics = {
  edgeScores: EdgeScores;
  cornerScores: CornerScores;
  interiorBackgroundContrast: number;
  contrastScore: number;
  aspectScore: number;
  widthCoverage: number;
  heightCoverage: number;
  spanCoverage: number;
  averageEdgeScore: number;
  averageCornerScore: number;
  minimumEdgeScore: number;
  minimumCornerScore: number;
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

export type CaptureAlignmentMetrics = {
  edgeScores: EdgeScores;
  cornerScores: CornerScores;
  interiorBackgroundContrast: number;
  aspectScore: number;
  coverageScore: number;
  captureConfidence: number;
  meetsMinimumGeometry: boolean;
  meetsRelaxedGeometry: boolean;
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
  const support = positionCount / scanlines;
  const alignment = clamp01(
    1 - Math.sqrt(variance) / Math.max(1, bandWidth * 0.45),
  );
  const consistentDirections = Math.max(
    positiveDirectionCount,
    positionCount - positiveDirectionCount,
  );
  const directionScore = clamp01((consistentDirections / positionCount - 0.5) * 2);

  return {
    // Random texture creates gradients, but not one straight, consistent side.
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

function measureCorners(
  luma: Uint8Array,
  width: number,
  height: number,
  edges: CardEdges,
  step: number,
): CornerScores {
  const { top, right, bottom, left } = edges;
  return {
    topLeft: measureCorner(luma, width, height, left.position, top.position, step),
    topRight: measureCorner(luma, width, height, right.position, top.position, step),
    bottomRight: measureCorner(
      luma,
      width,
      height,
      right.position,
      bottom.position,
      step,
    ),
    bottomLeft: measureCorner(
      luma,
      width,
      height,
      left.position,
      bottom.position,
      step,
    ),
  };
}

function measureInteriorBackgroundContrast(
  luma: Uint8Array,
  width: number,
  height: number,
  edges: CardEdges,
  step: number,
) {
  const interiorInset = 0.025;
  const backgroundInset = 0.012;
  const { top, right, bottom, left } = edges;
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
        xRatio > left.position + interiorInset &&
        xRatio < right.position - interiorInset &&
        yRatio > top.position + interiorInset &&
        yRatio < bottom.position - interiorInset;
      const isBackground =
        xRatio < left.position - backgroundInset ||
        xRatio > right.position + backgroundInset ||
        yRatio < top.position - backgroundInset ||
        yRatio > bottom.position + backgroundInset;

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

function analyzeGeometry(
  luma: Uint8Array,
  width: number,
  height: number,
  edges: CardEdges,
  expectedSpan: number,
  aspectTolerance: number,
  step: number,
): GeometryMetrics {
  const edgeScores = {
    top: edges.top.score,
    right: edges.right.score,
    bottom: edges.bottom.score,
    left: edges.left.score,
  };
  const cornerScores = measureCorners(luma, width, height, edges, step);
  const detectedWidth = Math.max(0, edges.right.position - edges.left.position) *
    width;
  const detectedHeight = Math.max(0, edges.bottom.position - edges.top.position) *
    height;
  const detectedAspect = detectedHeight ? detectedWidth / detectedHeight : 0;
  const expectedAspect = width / height;
  const aspectError = detectedAspect
    ? Math.abs(Math.log(detectedAspect / expectedAspect))
    : Number.POSITIVE_INFINITY;
  const interiorBackgroundContrast = measureInteriorBackgroundContrast(
    luma,
    width,
    height,
    edges,
    step,
  );

  return {
    edgeScores,
    cornerScores,
    interiorBackgroundContrast,
    contrastScore: clamp01((interiorBackgroundContrast - 4) / 20),
    aspectScore: clamp01(1 - aspectError / aspectTolerance),
    widthCoverage: detectedWidth / (width * expectedSpan),
    heightCoverage: detectedHeight / (height * expectedSpan),
    spanCoverage: Math.min(
      detectedWidth / (width * expectedSpan),
      detectedHeight / (height * expectedSpan),
    ),
    averageEdgeScore:
      (edgeScores.top + edgeScores.right + edgeScores.bottom + edgeScores.left) /
      4,
    averageCornerScore:
      (cornerScores.topLeft +
        cornerScores.topRight +
        cornerScores.bottomRight +
        cornerScores.bottomLeft) /
      4,
    minimumEdgeScore: Math.min(
      edgeScores.top,
      edgeScores.right,
      edgeScores.bottom,
      edgeScores.left,
    ),
    minimumCornerScore: Math.min(
      cornerScores.topLeft,
      cornerScores.topRight,
      cornerScores.bottomRight,
      cornerScores.bottomLeft,
    ),
  };
}

function passesCoverageRules(
  metrics: GeometryMetrics,
  rules: {
    minEdgeScore: number;
    minCornerScore: number;
    minAspectScore: number;
    minSpanCoverage: number;
    maxSpanCoverage: number;
  },
) {
  return (
    metrics.minimumEdgeScore >= rules.minEdgeScore &&
    metrics.minimumCornerScore >= rules.minCornerScore &&
    metrics.aspectScore >= rules.minAspectScore &&
    metrics.widthCoverage >= rules.minSpanCoverage &&
    metrics.heightCoverage >= rules.minSpanCoverage &&
    metrics.widthCoverage <= rules.maxSpanCoverage &&
    metrics.heightCoverage <= rules.maxSpanCoverage
  );
}

function guidelineEdges() {
  const near =
    CARD_DETECTION_CONFIG.analysisPaddingRatio /
    (1 + CARD_DETECTION_CONFIG.analysisPaddingRatio * 2);
  return { near, far: 1 - near, span: 1 - near * 2 };
}

/** Detects a plausible ID-1 rectangle anywhere inside the guideline. */
export function detectCardPresence(
  luma: Uint8Array,
  width: number,
  height: number,
  step = 2,
): CardPresenceMetrics {
  const guide = guidelineEdges();
  const searchOuterEdge = Math.max(0.02, guide.near - 0.025);
  const coarseEdges: CardEdges = {
    left: measureVerticalEdge(luma, width, height, searchOuterEdge, 0.46, step),
    right: measureVerticalEdge(
      luma,
      width,
      height,
      0.54,
      1 - searchOuterEdge,
      step,
    ),
    top: measureHorizontalEdge(luma, width, height, searchOuterEdge, 0.46, step),
    bottom: measureHorizontalEdge(
      luma,
      width,
      height,
      0.54,
      1 - searchOuterEdge,
      step,
    ),
  };

  // Re-score each side only over the detected card span. This lets a small,
  // continuous side score well without making random full-frame texture pass.
  const refinementBand = 0.04;
  const spanInset = 0.018;
  const edges: CardEdges = {
    left: measureVerticalEdge(
      luma,
      width,
      height,
      coarseEdges.left.position - refinementBand,
      coarseEdges.left.position + refinementBand,
      step,
      coarseEdges.top.position + spanInset,
      coarseEdges.bottom.position - spanInset,
    ),
    right: measureVerticalEdge(
      luma,
      width,
      height,
      coarseEdges.right.position - refinementBand,
      coarseEdges.right.position + refinementBand,
      step,
      coarseEdges.top.position + spanInset,
      coarseEdges.bottom.position - spanInset,
    ),
    top: measureHorizontalEdge(
      luma,
      width,
      height,
      coarseEdges.top.position - refinementBand,
      coarseEdges.top.position + refinementBand,
      step,
      coarseEdges.left.position + spanInset,
      coarseEdges.right.position - spanInset,
    ),
    bottom: measureHorizontalEdge(
      luma,
      width,
      height,
      coarseEdges.bottom.position - refinementBand,
      coarseEdges.bottom.position + refinementBand,
      step,
      coarseEdges.left.position + spanInset,
      coarseEdges.right.position - spanInset,
    ),
  };
  const metrics = analyzeGeometry(luma, width, height, edges, guide.span, 0.18, step);
  const coverageConfidence = clamp01(
    (metrics.spanCoverage - PRESENCE_RULES.minSpanCoverage) / 0.35,
  );
  const cardPresenceConfidence = clamp01(
    metrics.averageEdgeScore * 0.42 +
      metrics.averageCornerScore * 0.23 +
      metrics.aspectScore * 0.18 +
      metrics.contrastScore * 0.1 +
      coverageConfidence * 0.07,
  );

  return {
    cardPresenceConfidence,
    spanCoverage: metrics.spanCoverage,
    aspectScore: metrics.aspectScore,
    minimumEdgeScore: metrics.minimumEdgeScore,
    minimumCornerScore: metrics.minimumCornerScore,
    meetsMinimumCard: passesCoverageRules(metrics, PRESENCE_RULES),
    meetsRelaxedCard: passesCoverageRules(metrics, RELAXED_PRESENCE_RULES),
  };
}

function isInsideGuide(
  edges: CardEdges,
  near: number,
  far: number,
  tolerance: number,
) {
  return (
    edges.left.position >= near - tolerance &&
    edges.right.position <= far + tolerance &&
    edges.top.position >= near - tolerance &&
    edges.bottom.position <= far + tolerance
  );
}

/** Scores whether a detected card is large and aligned enough to capture. */
export function detectCaptureAlignment(
  luma: Uint8Array,
  width: number,
  height: number,
  step = 2,
): CaptureAlignmentMetrics {
  const guide = guidelineEdges();
  const innerSearchAllowance = guide.span * 0.12;
  const nearStart = Math.max(0, guide.near - CAPTURE_RULES.outerTolerance);
  const nearEnd = guide.near + innerSearchAllowance;
  const farStart = guide.far - innerSearchAllowance;
  const farEnd = Math.min(1, guide.far + CAPTURE_RULES.outerTolerance);
  const edges: CardEdges = {
    top: measureHorizontalEdge(luma, width, height, nearStart, nearEnd, step),
    right: measureVerticalEdge(luma, width, height, farStart, farEnd, step),
    bottom: measureHorizontalEdge(luma, width, height, farStart, farEnd, step),
    left: measureVerticalEdge(luma, width, height, nearStart, nearEnd, step),
  };
  const metrics = analyzeGeometry(luma, width, height, edges, guide.span, 0.14, step);
  const captureConfidence = clamp01(
    metrics.averageEdgeScore * 0.42 +
      metrics.averageCornerScore * 0.18 +
      metrics.contrastScore * 0.15 +
      metrics.aspectScore * 0.15 +
      clamp01(metrics.spanCoverage) * 0.1,
  );

  return {
    edgeScores: metrics.edgeScores,
    cornerScores: metrics.cornerScores,
    interiorBackgroundContrast: metrics.interiorBackgroundContrast,
    aspectScore: metrics.aspectScore,
    coverageScore: clamp01(metrics.spanCoverage),
    captureConfidence,
    meetsMinimumGeometry:
      passesCoverageRules(metrics, CAPTURE_RULES) &&
      isInsideGuide(
        edges,
        guide.near,
        guide.far,
        CAPTURE_RULES.outerTolerance,
      ),
    meetsRelaxedGeometry:
      passesCoverageRules(metrics, RELAXED_CAPTURE_RULES) &&
      isInsideGuide(
        edges,
        guide.near,
        guide.far,
        RELAXED_CAPTURE_RULES.outerTolerance,
      ),
  };
}
