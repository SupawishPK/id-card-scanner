import ID_CARD_DETECTION_CONFIG from './idCardDetectionConfig'

export const checkMotionStability = (
  previousLuma: Uint8Array | null,
  motion: number,
  isPreviouslyReady: boolean,
): boolean => {
  if (previousLuma === null) return false

  const motionThreshold = isPreviouslyReady
    ? ID_CARD_DETECTION_CONFIG.stability.motionExitThreshold
    : ID_CARD_DETECTION_CONFIG.stability.motionEnterThreshold

  return motion < motionThreshold
}
