import analyzeIdCardGeometry from './analyzeIdCardGeometry'
import type { IFrameAnalysis } from './checkFrameQuality'
import checkFrameQuality from './checkFrameQuality'
import { checkMotionStability } from './checkMotionStability'
import type { IFrameState, IReadinessState, IScannerStatus } from './createFrameState'
import { createReadinessState } from './createFrameState'
export type { IScannerStatus } from './createFrameState'
import ID_CARD_DETECTION_CONFIG from './idCardDetectionConfig'

const updateReadinessState = ({
  state,
  isCandidate,
  now,
}: {
  isCandidate: boolean
  now: number
  state: IReadinessState
}): { isReady: boolean; nextState: IReadinessState } => {
  const { stability } = ID_CARD_DETECTION_CONFIG

  if (isCandidate) {
    if (!state.isReady) {
      const stableFrames = state.stableFrames + 1
      const stableSince = state.stableSince ?? now
      const isReady =
        stableFrames >= stability.requiredSteadyFrames && now - stableSince >= stability.minimumSteadyDurationMs

      return {
        isReady,
        nextState: {
          stableSince,
          stableFrames,
          acquireMisses: 0,
          readyMisses: 0,
          isReady,
        },
      }
    }

    return {
      isReady: true,
      nextState: { ...state, acquireMisses: 0, readyMisses: 0 },
    }
  }

  if (!state.isReady && state.stableFrames > 0 && state.acquireMisses < stability.candidateMissTolerance) {
    return {
      isReady: false,
      nextState: { ...state, acquireMisses: state.acquireMisses + 1 },
    }
  }

  if (state.isReady && state.readyMisses < stability.readyMissTolerance) {
    return {
      isReady: true,
      nextState: { ...state, readyMisses: state.readyMisses + 1 },
    }
  }

  return {
    isReady: false,
    nextState: createReadinessState(),
  }
}

const analyzeFramePixels = ({
  pixels,
  currentLuma,
  previousLuma,
  width,
  height,
  step,
}: {
  currentLuma: Uint8Array
  height: number
  pixels: Uint8ClampedArray
  previousLuma: Uint8Array | null
  step: number
  width: number
}): IFrameAnalysis => {
  let sum = 0
  let sumSquares = 0
  let motionSum = 0
  let edgeCount = 0
  let comparisons = 0
  let samples = 0

  for (let y = 0; y < height; y += step) {
    const rowOffset = y * width
    for (let x = 0; x < width; x += step) {
      const pixelIndex = rowOffset + x
      const rgbaIndex = pixelIndex << 2
      const r = pixels[rgbaIndex]!
      const g = pixels[rgbaIndex + 1]!
      const b = pixels[rgbaIndex + 2]!
      const luma = (r * 77 + g * 150 + b * 29) >> 8

      currentLuma[pixelIndex] = luma
      sum += luma
      sumSquares += luma * luma
      samples += 1

      if (previousLuma) {
        const diff = luma - previousLuma[pixelIndex]!
        motionSum += diff < 0 ? -diff : diff
      }
      if (x >= step) {
        const hDiff = luma - currentLuma[pixelIndex - step]!
        if ((hDiff < 0 ? -hDiff : hDiff) > ID_CARD_DETECTION_CONFIG.edgeDetection.densityThreshold) {
          edgeCount += 1
        }
        comparisons += 1
      }
      if (y >= step) {
        const vDiff = luma - currentLuma[pixelIndex - step * width]!
        if ((vDiff < 0 ? -vDiff : vDiff) > ID_CARD_DETECTION_CONFIG.edgeDetection.densityThreshold) {
          edgeCount += 1
        }
        comparisons += 1
      }
    }
  }

  const mean = sum / samples
  return {
    mean,
    variance: Math.max(0, sumSquares / samples - mean * mean),
    motion: previousLuma ? motionSum / samples : Number.POSITIVE_INFINITY,
    edgeDensity: comparisons ? edgeCount / comparisons : 0,
  }
}

interface IDetectIdCardArgs {
  frameState: IFrameState
  now: number
  pixels: Uint8ClampedArray
}

const checkDetectionConfidence = ({
  hasPresenceDetails,
  hasCardDetails,
  cardFrameScores,
  frameState,
}: {
  cardFrameScores: ReturnType<typeof analyzeIdCardGeometry>
  frameState: IFrameState
  hasCardDetails: boolean
  hasPresenceDetails: boolean
}) => {
  const presenceThreshold = frameState.hasDetectedCard
    ? ID_CARD_DETECTION_CONFIG.confidence.presenceExit
    : ID_CARD_DETECTION_CONFIG.confidence.presenceEnter
  const hasPresenceCard = hasPresenceDetails && cardFrameScores.presenceConfidence >= presenceThreshold

  const alignmentThreshold = frameState.isCaptureAligned
    ? ID_CARD_DETECTION_CONFIG.confidence.alignmentExit
    : ID_CARD_DETECTION_CONFIG.confidence.alignmentEnter
  const isCaptureAligned =
    hasCardDetails && cardFrameScores.meetsMinimumGeometry && cardFrameScores.captureConfidence >= alignmentThreshold

  return {
    hasPresenceCard,
    isCaptureAligned,
    hasDetectedCard: hasPresenceCard || isCaptureAligned,
  }
}

const applyDetectionResult = ({
  frameState,
  currentLuma,
  previousLuma,
  pixelCount,
  nextReadiness,
  hasDetectedCard,
  isCaptureAligned,
  scannerStatus,
}: {
  currentLuma: Uint8Array
  frameState: IFrameState
  hasDetectedCard: boolean
  isCaptureAligned: boolean
  nextReadiness: IReadinessState
  pixelCount: number
  previousLuma: Uint8Array | null
  scannerStatus: IScannerStatus
}): boolean => {
  frameState.previousLuma = currentLuma
  frameState.currentLuma = previousLuma ?? new Uint8Array(pixelCount)
  frameState.readiness = nextReadiness
  frameState.hasDetectedCard = hasDetectedCard
  frameState.isCaptureAligned = isCaptureAligned

  if (scannerStatus !== frameState.lastReportedStatus) {
    frameState.lastReportedStatus = scannerStatus
    return true
  }
  return false
}

const getScannerStatus = ({
  isCaptureReady,
  isCaptureAligned,
  hasDetectedCard,
}: {
  hasDetectedCard: boolean
  isCaptureAligned: boolean
  isCaptureReady: boolean
}): IScannerStatus => {
  if (isCaptureReady) return 'stable'
  if (isCaptureAligned) return 'aligning'
  if (hasDetectedCard) return 'detected'
  return 'searching'
}

const detectIdCard = ({ frameState, pixels, now }: IDetectIdCardArgs): { changed: boolean; status: IScannerStatus } => {
  const { frame } = ID_CARD_DETECTION_CONFIG
  const analysisWidth = frame.analysisWidth
  const analysisHeight = frame.analysisHeight
  const previousLuma = frameState.previousLuma

  const pixelCount = analysisWidth * analysisHeight
  const currentLuma = frameState.currentLuma.length === pixelCount ? frameState.currentLuma : new Uint8Array(pixelCount)

  const step = frame.pixelSampleInterval
  const frameAnalysis = analyzeFramePixels({
    pixels,
    currentLuma,
    previousLuma,
    width: analysisWidth,
    height: analysisHeight,
    step,
  })

  const { hasCardDetails, hasPresenceDetails } = checkFrameQuality(frameAnalysis)

  const cardFrameScores = analyzeIdCardGeometry({
    luminance: currentLuma,
    imageWidth: analysisWidth,
    imageHeight: analysisHeight,
    sampleInterval: step,
  })

  const { hasDetectedCard, isCaptureAligned } = checkDetectionConfidence({
    hasPresenceDetails,
    hasCardDetails,
    cardFrameScores,
    frameState,
  })

  const isMotionStable = checkMotionStability(previousLuma, frameAnalysis.motion, frameState.readiness.isReady)

  const readinessResult = updateReadinessState({
    state: frameState.readiness,
    isCandidate: isCaptureAligned && isMotionStable,
    now,
  })

  const scannerStatus = getScannerStatus({
    isCaptureReady: readinessResult.isReady,
    isCaptureAligned,
    hasDetectedCard,
  })

  const changed = applyDetectionResult({
    frameState,
    currentLuma,
    previousLuma,
    pixelCount,
    nextReadiness: readinessResult.nextState,
    hasDetectedCard,
    isCaptureAligned,
    scannerStatus,
  })

  return { status: scannerStatus, changed }
}

export default detectIdCard
