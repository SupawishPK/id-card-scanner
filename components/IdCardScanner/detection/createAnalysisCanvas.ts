import ID_CARD_DETECTION_CONFIG from './idCardDetectionConfig'

const createAnalysisCanvas = (): HTMLCanvasElement => {
  const { frame } = ID_CARD_DETECTION_CONFIG
  const canvas = document.createElement('canvas')
  canvas.width = frame.analysisWidth
  canvas.height = frame.analysisHeight
  return canvas
}

export default createAnalysisCanvas
