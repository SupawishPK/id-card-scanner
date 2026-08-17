import ID_CARD_DETECTION_CONFIG from './idCardDetectionConfig'

export type IScannerStatus = 'searching' | 'detected' | 'aligning' | 'stable'

export interface IReadinessState {
  acquireMisses: number
  isReady: boolean
  readyMisses: number
  stableFrames: number
  stableSince: number | null
}

export const createReadinessState = (): IReadinessState => {
  return {
    stableSince: null,
    stableFrames: 0,
    acquireMisses: 0,
    readyMisses: 0,
    isReady: false,
  }
}

export interface IFrameState {
  canvas: HTMLCanvasElement | null
  currentLuma: Uint8Array
  hasDetectedCard: boolean
  isCaptureAligned: boolean
  lastReportedStatus: IScannerStatus | null
  lastVideoHeight: number
  lastVideoWidth: number
  needsRectRecalc: boolean
  previousLuma: Uint8Array | null
  readiness: IReadinessState
  roiBounds: { sh: number; sw: number; sx: number; sy: number } | null
}

const createFrameState = (): IFrameState => {
  const { frame } = ID_CARD_DETECTION_CONFIG
  const pixelCount = frame.analysisWidth * frame.analysisHeight
  return {
    canvas: null,
    currentLuma: new Uint8Array(pixelCount),
    hasDetectedCard: false,
    isCaptureAligned: false,
    lastReportedStatus: null,
    lastVideoHeight: 0,
    lastVideoWidth: 0,
    needsRectRecalc: true,
    previousLuma: null,
    readiness: createReadinessState(),
    roiBounds: null,
  }
}

export default createFrameState
