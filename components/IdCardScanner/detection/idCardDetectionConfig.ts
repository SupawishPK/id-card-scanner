export const ID_CARD_ASPECT_RATIO = 53.98 / 85.6

const ID_CARD_DETECTION_CONFIG = {
  frame: {
    analysisWidth: Math.round(240 * ID_CARD_ASPECT_RATIO),
    analysisHeight: 240,
    analysisPaddingRatio: 0.08,
    pixelSampleInterval: 2,
  },
  sampleIntervalMs: 1000 / 15,
  metrics: {
    aspectRatio: {
      min: 0.59,
      max: 0.66,
      ideal: ID_CARD_ASPECT_RATIO,
    },
    cardSize: {
      minSpanCoverage: 0.78,
      maxSpanCoverage: 1.1,
    },
    guideOverflow: {
      outerTolerance: 0.035,
    },
    frameQuality: {
      capture: {
        minBrightness: 42,
        maxBrightness: 225,
        minVariance: 260,
        minEdgeDensity: 0.012,
      },
      presence: {
        minBrightness: 24,
        maxBrightness: 235,
        minVariance: 120,
        minEdgeDensity: 0.003,
      },
    },
    edgeQuality: {
      minScore: 0.36,
    },
    cornerQuality: {
      minScore: 0.1,
    },
    alignment: {
      minAspectScore: 0.5,
    },
  },
  confidence: {
    presenceEnter: 0.54,
    presenceExit: 0.44,
    alignmentEnter: 0.56,
    alignmentExit: 0.46,
  },
  stability: {
    motionEnterThreshold: 11,
    motionExitThreshold: 15,
    requiredSteadyFrames: 4,
    minimumSteadyDurationMs: 180,
    candidateMissTolerance: 2,
    readyMissTolerance: 5,
  },
  edgeDetection: {
    lumaThreshold: 10,
    densityThreshold: 18,
    scanInsetRatio: 0.14,
    cornerRadiusRatio: 0.055,
    maxSlope: 0.02,
    maxParallelismError: 0.035,
  },
} as const

export default ID_CARD_DETECTION_CONFIG
