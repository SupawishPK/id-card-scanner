import ID_CARD_DETECTION_CONFIG from './idCardDetectionConfig'

export interface IFrameAnalysis {
  edgeDensity: number
  mean: number
  motion: number
  variance: number
}

const checkFrameQuality = (analysis: IFrameAnalysis) => {
  const { capture: captureRules, presence: presenceRules } = ID_CARD_DETECTION_CONFIG.metrics.frameQuality
  const { mean, variance, edgeDensity } = analysis

  const hasUsableLight = mean > captureRules.minBrightness && mean < captureRules.maxBrightness
  const hasCardDetails =
    hasUsableLight && variance > captureRules.minVariance && edgeDensity > captureRules.minEdgeDensity

  const hasPresenceDetails =
    mean > presenceRules.minBrightness &&
    mean < presenceRules.maxBrightness &&
    variance > presenceRules.minVariance &&
    edgeDensity > presenceRules.minEdgeDensity

  return { hasCardDetails, hasPresenceDetails }
}

export default checkFrameQuality
