import ID_CARD_DETECTION_CONFIG from './detection/idCardDetectionConfig'
import ID_CARD_SCANNER_CONFIG from './idCardScannerConfig'

export interface IVideoRect {
  height: number
  width: number
  x: number
  y: number
}

const mapGuideRectToVideoRect = (video: HTMLVideoElement, guideElement: HTMLElement): IVideoRect | null => {
  const videoWidth = video.videoWidth
  const videoHeight = video.videoHeight
  if (!videoWidth || !videoHeight) return null

  const videoBox = video.getBoundingClientRect()
  const guideBox = guideElement.getBoundingClientRect()
  if (!videoBox.width || !videoBox.height) return null

  const coverScale = Math.max(videoBox.width / videoWidth, videoBox.height / videoHeight)
  const renderedWidth = videoWidth * coverScale
  const renderedHeight = videoHeight * coverScale
  const cropOffsetX = (renderedWidth - videoBox.width) / 2
  const cropOffsetY = (renderedHeight - videoBox.height) / 2

  const rawX = (guideBox.left - videoBox.left + cropOffsetX) / coverScale
  const rawY = (guideBox.top - videoBox.top + cropOffsetY) / coverScale
  const rawWidth = guideBox.width / coverScale
  const rawHeight = guideBox.height / coverScale
  const x = Math.max(0, Math.min(videoWidth - 1, rawX))
  const y = Math.max(0, Math.min(videoHeight - 1, rawY))

  return {
    x,
    y,
    width: Math.max(1, Math.min(videoWidth - x, rawWidth)),
    height: Math.max(1, Math.min(videoHeight - y, rawHeight)),
  }
}

const expandDetectionRect = (bounds: IVideoRect, videoWidth: number, videoHeight: number): IVideoRect => {
  const paddingX = bounds.width * ID_CARD_DETECTION_CONFIG.frame.analysisPaddingRatio
  const paddingY = bounds.height * ID_CARD_DETECTION_CONFIG.frame.analysisPaddingRatio
  const x = Math.max(0, bounds.x - paddingX)
  const y = Math.max(0, bounds.y - paddingY)
  const right = Math.min(videoWidth, bounds.x + bounds.width + paddingX)
  const bottom = Math.min(videoHeight, bounds.y + bounds.height + paddingY)

  return { x, y, width: right - x, height: bottom - y }
}

const expandCaptureRect = (bounds: IVideoRect, video: HTMLVideoElement): IVideoRect => {
  const capturePaddingRatio = ID_CARD_SCANNER_CONFIG.capturePaddingRatio
  const paddedWidth = bounds.width * capturePaddingRatio
  const paddedHeight = bounds.height * capturePaddingRatio
  const x = Math.max(0, bounds.x - paddedWidth)
  const y = Math.max(0, bounds.y - paddedHeight)

  return {
    x,
    y,
    width: Math.min(video.videoWidth - x, bounds.width + paddedWidth * 2),
    height: Math.min(video.videoHeight - y, bounds.height + paddedHeight * 2),
  }
}

export type IExportRotation = 0 | 90 | 180 | 270

/**
 * rotation selects how the exported JPEG is rotated so it always reads as an
 * upright portrait card. The region is axis-aligned in raw video pixels, which
 * do not follow the UI's per-mode rotation, so each orientation mode needs its
 * own value (default 270 = 90° CCW keeps the pre-existing portrait behavior).
 */
const exportVideoRectAsJpeg = (video: HTMLVideoElement, region: IVideoRect, rotation: IExportRotation = 270): string | null => {
  const swapsAxes = rotation === 90 || rotation === 270
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(swapsAxes ? region.height : region.width)
  canvas.height = Math.round(swapsAxes ? region.width : region.height)
  const context = canvas.getContext('2d')
  if (!context) return null

  context.translate(canvas.width / 2, canvas.height / 2)
  context.rotate((rotation * Math.PI) / 180)
  context.drawImage(
    video,
    region.x,
    region.y,
    region.width,
    region.height,
    -region.width / 2,
    -region.height / 2,
    region.width,
    region.height,
  )

  const dataUrl = canvas.toDataURL('image/jpeg', 1.0)
  context.clearRect(0, 0, canvas.width, canvas.height)
  return dataUrl
}

export { expandCaptureRect, expandDetectionRect, exportVideoRectAsJpeg, mapGuideRectToVideoRect }
