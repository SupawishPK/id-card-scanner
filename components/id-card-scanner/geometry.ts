import {
  CARD_DETECTION_CONFIG,
  GEOMETRY_RULES,
  ID_CARD_ASPECT_RATIO,
  MAX_EDGE_SLOPE,
  MAX_PARALLELISM_ERROR,
  SCANNER_CONFIG,
} from "./config";
import {
  clamp01,
  measureHorizontalEdgeScore,
  measureVerticalEdgeScore,
  type ICardEdges,
  type ICornerScores,
  type IEdgeScores,
} from "./edge";
import {
  calculateInteriorBackgroundContrast,
  measureAllCornersScores,
} from "./corner";
import {
  analyzeFramePixels,
  updateReadinessState,
  type IReadinessConfig,
  type IReadinessState,
} from "./analysis";

export type IScannerStatus = "searching" | "detected" | "aligning" | "stable";

export type IDebugMetrics = {
  mean: number;
  variance: number;
  motion: number;
  edgeDensity: number;
  hasUsableLight: boolean;
  hasCardDetails: boolean;
  hasPresenceDetails: boolean;
  presenceConfidence: number;
  alignmentConfidence: number;
  coverageScore: number;
  aspectScore: number;
  detectedAspect: number;
  skewScore: number;
  parallelismScore: number;
  minEdgeScore: number;
  minCornerScore: number;
  avgEdgeScore: number;
  avgCornerScore: number;
  interiorBgContrast: number;
  meetsMinimumGeometry: boolean;
};

export type IDistanceHint = "too-far" | "too-close" | "fit" | null;

export type ICardEvaluationResult = {
  edgeScores: IEdgeScores;
  cornerScores: ICornerScores;
  interiorBackgroundContrast: number;
  aspectScore: number;
  detectedAspect: number;
  coverageScore: number;
  presenceConfidence: number;
  captureConfidence: number;
  meetsMinimumGeometry: boolean;
  meetsRelaxedGeometry: boolean;
  skewScore: number;
  parallelismScore: number;
  minimumEdgeScore: number;
  minimumCornerScore: number;
  averageEdgeScore: number;
  averageCornerScore: number;
};

export const GUIDELINE_EDGES = (() => {
  const near =
    CARD_DETECTION_CONFIG.analysisPaddingRatio /
    (1 + CARD_DETECTION_CONFIG.analysisPaddingRatio * 2);
  return { near, far: 1 - near, span: 1 - near * 2 };
})();

export type IEvaluateFrameParams = {
  luma: Uint8Array;
  width: number;
  height: number;
  step?: number;
};

export const evaluateCardFrame = ({
  luma,
  width,
  height,
  step = 2,
}: IEvaluateFrameParams): ICardEvaluationResult => {
  const guide = GUIDELINE_EDGES;
  const innerSearchAllowance = guide.span * 0.12;
  const nearStart = Math.max(0, guide.near - GEOMETRY_RULES.outerTolerance);
  const nearEnd = guide.near + innerSearchAllowance;
  const farStart = guide.far - innerSearchAllowance;
  const farEnd = Math.min(1, guide.far + GEOMETRY_RULES.outerTolerance);

  const edges: ICardEdges = {
    top: measureHorizontalEdgeScore({
      luma,
      width,
      height,
      bandStartRatio: nearStart,
      bandEndRatio: nearEnd,
      step,
    }),
    right: measureVerticalEdgeScore({
      luma,
      width,
      height,
      bandStartRatio: farStart,
      bandEndRatio: farEnd,
      step,
    }),
    bottom: measureHorizontalEdgeScore({
      luma,
      width,
      height,
      bandStartRatio: farStart,
      bandEndRatio: farEnd,
      step,
    }),
    left: measureVerticalEdgeScore({
      luma,
      width,
      height,
      bandStartRatio: nearStart,
      bandEndRatio: nearEnd,
      step,
    }),
  };

  const edgeScores = {
    top: edges.top.score,
    right: edges.right.score,
    bottom: edges.bottom.score,
    left: edges.left.score,
  };
  const cornerScores = measureAllCornersScores({
    luma,
    width,
    height,
    edges,
    step,
  });
  const detectedWidth =
    Math.max(0, edges.right.position - edges.left.position) * width;
  const detectedHeight =
    Math.max(0, edges.bottom.position - edges.top.position) * height;
  const detectedAspect = detectedHeight ? detectedWidth / detectedHeight : 0;
  const expectedAspect = ID_CARD_ASPECT_RATIO;
  const aspectError = detectedAspect
    ? Math.abs(Math.log(detectedAspect / expectedAspect))
    : Number.POSITIVE_INFINITY;
  const interiorBackgroundContrast = calculateInteriorBackgroundContrast({
    luma,
    width,
    height,
    edges,
    step,
  });

  const topSlope = edges.top.slope;
  const rightSlope = edges.right.slope;
  const bottomSlope = edges.bottom.slope;
  const leftSlope = edges.left.slope;

  const straightness = (s: number) => clamp01(1 - Math.abs(s) / MAX_EDGE_SLOPE);
  const parallelismScore = Math.min(
    clamp01(1 - Math.abs(topSlope - bottomSlope) / MAX_PARALLELISM_ERROR),
    clamp01(1 - Math.abs(leftSlope - rightSlope) / MAX_PARALLELISM_ERROR),
  );

  const skewScore = clamp01(
    straightness(topSlope) * 0.2 +
      straightness(bottomSlope) * 0.2 +
      straightness(leftSlope) * 0.2 +
      straightness(rightSlope) * 0.2 +
      parallelismScore * 0.2,
  );

  const averageEdgeScore =
    (edgeScores.top + edgeScores.right + edgeScores.bottom + edgeScores.left) /
    4;
  const averageCornerScore =
    (cornerScores.topLeft +
      cornerScores.topRight +
      cornerScores.bottomRight +
      cornerScores.bottomLeft) /
    4;
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
  const spanCoverage = Math.min(
    detectedWidth / (width * guide.span),
    detectedHeight / (height * guide.span),
  );

  const contrastScore = clamp01((interiorBackgroundContrast - 4) / 20);
  const aspectScore = clamp01(1 - aspectError / 0.14);
  const coverageScore = clamp01(spanCoverage);

  const presenceConfidence = clamp01(
    averageEdgeScore * 0.4 +
      cornerScores.topLeft * 0.05 +
      cornerScores.topRight * 0.05 +
      aspectScore * 0.15 +
      contrastScore * 0.08 +
      clamp01((spanCoverage - 0.2) / 0.35) * 0.07 +
      skewScore * 0.1,
  );

  const captureConfidence = clamp01(
    averageEdgeScore * 0.4 +
      averageCornerScore * 0.15 +
      contrastScore * 0.12 +
      aspectScore * 0.12 +
      coverageScore * 0.09 +
      skewScore * 0.12,
  );

  const isInsideGuide = (tolerance: number) =>
    edges.left.position >= guide.near - tolerance &&
    edges.right.position <= guide.far + tolerance &&
    edges.top.position >= guide.near - tolerance &&
    edges.bottom.position <= guide.far + tolerance;

  const passesMinGeometry =
    minimumEdgeScore >= GEOMETRY_RULES.minEdgeScore &&
    minimumCornerScore >= GEOMETRY_RULES.minCornerScore &&
    aspectScore >= GEOMETRY_RULES.minAspectScore &&
    detectedAspect >= GEOMETRY_RULES.minAspectRatio &&
    detectedAspect <= GEOMETRY_RULES.maxAspectRatio &&
    spanCoverage >= GEOMETRY_RULES.minSpanCoverage &&
    spanCoverage <= GEOMETRY_RULES.maxSpanCoverage;

  return {
    edgeScores,
    cornerScores,
    interiorBackgroundContrast,
    aspectScore,
    detectedAspect,
    coverageScore,
    presenceConfidence,
    captureConfidence,
    meetsMinimumGeometry:
      passesMinGeometry && isInsideGuide(GEOMETRY_RULES.outerTolerance),
    meetsRelaxedGeometry:
      passesMinGeometry && isInsideGuide(GEOMETRY_RULES.outerTolerance + 0.015),
    skewScore,
    parallelismScore,
    minimumEdgeScore,
    minimumCornerScore,
    averageEdgeScore,
    averageCornerScore,
  };
};

export type IFrameProcessingParams = {
  pixels: Uint8ClampedArray;
  analysisWidth: number;
  analysisHeight: number;
  now: number;
  previousLuma: Uint8Array | null;
  currentLuma: Uint8Array | null;
  readiness: IReadinessState;
  readinessConfig: IReadinessConfig;
  hasDetectedCard: boolean;
  isCaptureAligned: boolean;
  thresholds?: Partial<typeof SCANNER_CONFIG>;
};

export type IFrameProcessingResult = {
  previousLuma: Uint8Array;
  currentLuma: Uint8Array;
  readiness: IReadinessState;
  scannerStatus: IScannerStatus;
  hasDetectedCard: boolean;
  isCaptureAligned: boolean;
  isCaptureReady: boolean;
  distanceHint: IDistanceHint;
  debugMetrics: IDebugMetrics;
};

export const processScannerFrame = ({
  pixels,
  analysisWidth,
  analysisHeight,
  now,
  previousLuma,
  currentLuma: inputCurrentLuma,
  readiness,
  readinessConfig,
  hasDetectedCard: prevHasDetectedCard,
  isCaptureAligned: prevIsCaptureAligned,
  thresholds: customThresholds,
}: IFrameProcessingParams): IFrameProcessingResult => {
  const thresholds = { ...SCANNER_CONFIG, ...customThresholds };
  const pixelCount = analysisWidth * analysisHeight;
  let currentLuma = inputCurrentLuma;
  if (!currentLuma || currentLuma.length !== pixelCount) {
    currentLuma = new Uint8Array(pixelCount);
  }

  const step = 2;
  const { mean, variance, motion, edgeDensity } = analyzeFramePixels({
    pixels,
    currentLuma,
    previousLuma,
    width: analysisWidth,
    height: analysisHeight,
    step,
  });

  const nextPreviousLuma = currentLuma;
  const nextCurrentLuma = previousLuma ?? new Uint8Array(pixelCount);

  const hasUsableLight = mean > 42 && mean < 225;
  const hasCardDetails =
    hasUsableLight && variance > 260 && edgeDensity > 0.012;
  const hasPresenceDetails =
    mean > 24 && mean < 235 && variance > 120 && edgeDensity > 0.003;

  const evalResult = evaluateCardFrame({
    luma: currentLuma,
    width: analysisWidth,
    height: analysisHeight,
    step,
  });

  const presenceConfidenceThreshold = prevHasDetectedCard
    ? thresholds.presenceConfidenceExit
    : thresholds.presenceConfidenceEnter;
  const hasPresenceCard =
    hasPresenceDetails &&
    evalResult.presenceConfidence >= presenceConfidenceThreshold;

  const alignmentConfidenceThreshold = prevIsCaptureAligned
    ? thresholds.alignmentConfidenceExit
    : thresholds.alignmentConfidenceEnter;
  const isCaptureAligned =
    hasCardDetails &&
    evalResult.meetsMinimumGeometry &&
    evalResult.captureConfidence >= alignmentConfidenceThreshold;

  const hasDetectedCard = hasPresenceCard || isCaptureAligned;
  const isPreviouslyReady = readiness.isReady;
  const motionThreshold = isPreviouslyReady
    ? thresholds.motionExitThreshold
    : thresholds.motionEnterThreshold;

  const isMotionStable = previousLuma !== null && motion < motionThreshold;

  const readinessResult = updateReadinessState({
    state: readiness,
    isCandidate: isCaptureAligned && isMotionStable,
    now,
    config: readinessConfig,
  });

  const isCaptureReady = readinessResult.isReady;
  const scannerStatus: IScannerStatus = isCaptureReady
    ? "stable"
    : isCaptureAligned
      ? "aligning"
      : hasDetectedCard
        ? "detected"
        : "searching";

  const distanceHint: IDistanceHint = hasDetectedCard
    ? evalResult.coverageScore < 0.85
      ? "too-far"
      : evalResult.coverageScore > 1.05
        ? "too-close"
        : "fit"
    : null;

  const debugMetrics: IDebugMetrics = {
    mean,
    variance,
    motion: previousLuma ? motion : -1,
    edgeDensity,
    hasUsableLight,
    hasCardDetails,
    hasPresenceDetails,
    presenceConfidence: evalResult.presenceConfidence,
    alignmentConfidence: evalResult.captureConfidence,
    coverageScore: evalResult.coverageScore,
    aspectScore: evalResult.aspectScore,
    detectedAspect: evalResult.detectedAspect,
    skewScore: evalResult.skewScore,
    parallelismScore: evalResult.parallelismScore,
    minEdgeScore: evalResult.minimumEdgeScore,
    minCornerScore: evalResult.minimumCornerScore,
    avgEdgeScore: evalResult.averageEdgeScore,
    avgCornerScore: evalResult.averageCornerScore,
    interiorBgContrast: evalResult.interiorBackgroundContrast,
    meetsMinimumGeometry: evalResult.meetsMinimumGeometry,
  };

  return {
    previousLuma: nextPreviousLuma,
    currentLuma: nextCurrentLuma,
    readiness: readinessResult.nextState,
    scannerStatus,
    hasDetectedCard,
    isCaptureAligned,
    isCaptureReady,
    distanceHint,
    debugMetrics,
  };
};
