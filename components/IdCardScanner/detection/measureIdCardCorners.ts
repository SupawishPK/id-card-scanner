import ID_CARD_DETECTION_CONFIG from './idCardDetectionConfig'
import type { ICardEdges, ICornerScores } from './measureIdCardEdges'

const alignUp = (value: number, step: number): number => {
  return Math.ceil(value / step) * step
}

const alignDown = (value: number, step: number): number => {
  return Math.floor(value / step) * step
}

interface ICornerArgs {
  centerXRatio: number
  centerYRatio: number
  height: number
  luma: Uint8Array
  step: number
  width: number
}

const getCornerScore = ({ luma, width, height, centerXRatio, centerYRatio, step }: ICornerArgs): number => {
  const xRadius = width * ID_CARD_DETECTION_CONFIG.edgeDetection.cornerRadiusRatio
  const yRadius = height * ID_CARD_DETECTION_CONFIG.edgeDetection.cornerRadiusRatio
  const xStart = Math.max(step, alignUp(width * centerXRatio - xRadius, step))
  const xEnd = Math.min(width - step - 1, alignDown(width * centerXRatio + xRadius, step))
  const yStart = Math.max(step, alignUp(height * centerYRatio - yRadius, step))
  const yEnd = Math.min(height - step - 1, alignDown(height * centerYRatio + yRadius, step))
  let verticalSupports = 0
  let horizontalSupports = 0
  let verticalScanlines = 0
  let horizontalScanlines = 0

  for (let y = yStart; y <= yEnd; y += step) {
    let strongest = 0
    for (let x = xStart; x <= xEnd; x += step) {
      strongest = Math.max(strongest, Math.abs((luma[y * width + x + step] ?? 0) - (luma[y * width + x - step] ?? 0)))
    }
    if (strongest >= ID_CARD_DETECTION_CONFIG.edgeDetection.lumaThreshold) verticalSupports += 1
    verticalScanlines += 1
  }

  for (let x = xStart; x <= xEnd; x += step) {
    let strongest = 0
    for (let y = yStart; y <= yEnd; y += step) {
      strongest = Math.max(
        strongest,
        Math.abs((luma[(y + step) * width + x] ?? 0) - (luma[(y - step) * width + x] ?? 0)),
      )
    }
    if (strongest >= ID_CARD_DETECTION_CONFIG.edgeDetection.lumaThreshold) horizontalSupports += 1
    horizontalScanlines += 1
  }

  const verticalScore = verticalScanlines ? verticalSupports / verticalScanlines : 0
  const horizontalScore = horizontalScanlines ? horizontalSupports / horizontalScanlines : 0
  return Math.sqrt(verticalScore * horizontalScore)
}

interface IMeasureCornersArgs {
  edges: ICardEdges
  height: number
  luma: Uint8Array
  step: number
  width: number
}

const measureIdCardCorners = ({ luma, width, height, edges, step }: IMeasureCornersArgs): ICornerScores => {
  const { top, right, bottom, left } = edges
  return {
    topLeft: getCornerScore({
      luma,
      width,
      height,
      centerXRatio: left.position,
      centerYRatio: top.position,
      step,
    }),
    topRight: getCornerScore({
      luma,
      width,
      height,
      centerXRatio: right.position,
      centerYRatio: top.position,
      step,
    }),
    bottomRight: getCornerScore({
      luma,
      width,
      height,
      centerXRatio: right.position,
      centerYRatio: bottom.position,
      step,
    }),
    bottomLeft: getCornerScore({
      luma,
      width,
      height,
      centerXRatio: left.position,
      centerYRatio: bottom.position,
      step,
    }),
  }
}

export default measureIdCardCorners
