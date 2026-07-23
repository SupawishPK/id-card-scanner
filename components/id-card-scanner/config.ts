export const ID_CARD_WIDTH_MM = 85.60;
export const ID_CARD_HEIGHT_MM = 53.98;
export const ID_CARD_ASPECT_RATIO = ID_CARD_WIDTH_MM / ID_CARD_HEIGHT_MM; // Exact ISO 7810 ID-1 ratio (~1.58577)

export const SCANNER_CONFIG = {
  stableFrames: 4,
  minimumStableMs: 180,
  capturePaddingRatio: 0.05,
  sampleIntervalMs: 1000 / 15,
  motionEnterThreshold: 11,
  motionExitThreshold: 15,
  presenceConfidenceEnter: 0.95,
  presenceConfidenceExit: 0.85,
  alignmentConfidenceEnter: 0.95,
  alignmentConfidenceExit: 0.85,
  detectionConfidenceThreshold: 0.95,
  acquireMissGraceFrames: 2,
  readyMissGraceFrames: 5,
} as const;

export type IScannerConfig = Partial<typeof SCANNER_CONFIG>;

export const ANALYSIS = {
  height: 240,
  width: Math.round(240 * ID_CARD_ASPECT_RATIO),
  paddingRatio: 0.08,
} as const;

export const EDGE_DETECTION = {
  lumaThreshold: 10,
  densityThreshold: 18,
  scanInsetRatio: 0.14,
  cornerRadiusRatio: 0.055,
  maxSlope: 0.02,
  maxParallelismError: 0.035,
} as const;

export const GEOMETRY_RULES = {
  minEdgeScore: 0.36,
  minCornerScore: 0.10,
  minAspectScore: 0.50, // Strict ISO 7810 ID-1 aspect ratio verification
  minAspectRatio: 1.55,
  maxAspectRatio: 1.65,
  minSpanCoverage: 0.78,
  maxSpanCoverage: 1.10,
  outerTolerance: 0.035,
  minSkewScore: 0.80,
} as const;

export const CARD_DETECTION_CONFIG = {
  analysisWidth: ANALYSIS.width,
  analysisHeight: ANALYSIS.height,
  analysisPaddingRatio: ANALYSIS.paddingRatio,
  capturePaddingRatio: SCANNER_CONFIG.capturePaddingRatio,
} as const;

export const EDGE_SCAN_INSET_RATIO: number = EDGE_DETECTION.scanInsetRatio;
export const CORNER_RADIUS_RATIO: number = EDGE_DETECTION.cornerRadiusRatio;
export const EDGE_LUMA_DELTA_THRESHOLD: number = EDGE_DETECTION.lumaThreshold;
export const EDGE_DELTA_THRESHOLD: number = EDGE_DETECTION.densityThreshold;
export const MAX_EDGE_SLOPE: number = EDGE_DETECTION.maxSlope;
export const MAX_PARALLELISM_ERROR: number = EDGE_DETECTION.maxParallelismError;

export const DEFAULT_SCANNER_CONFIG = SCANNER_CONFIG;
