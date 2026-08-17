import ID_CARD_DETECTION_CONFIG from './idCardDetectionConfig'

const alignUp = (value: number, step: number): number => {
  return Math.ceil(value / step) * step
}

const alignDown = (value: number, step: number): number => {
  return Math.floor(value / step) * step
}

interface IEdgeMeasurement {
  position: number
  score: number
  slope: number
}

export interface ICardEdges {
  bottom: IEdgeMeasurement
  left: IEdgeMeasurement
  right: IEdgeMeasurement
  top: IEdgeMeasurement
}

export interface IEdgeScores {
  bottom: number
  left: number
  right: number
  top: number
}

export interface ICornerScores {
  bottomLeft: number
  bottomRight: number
  topLeft: number
  topRight: number
}

interface IAlignmentScoreParams {
  bandWidth: number
  dimension: number
  positionCount: number
  positionScanlineCrossSum: number | undefined
  positionSquaredSum: number
  positionSum: number
  positiveDirectionCount: number
  scanlineSquaredSum: number | undefined
  scanlineSum: number | undefined
  scanlines: number
}

const getEdgeAlignmentScore = ({
  positionCount,
  positionSum,
  positionSquaredSum,
  positiveDirectionCount,
  scanlines,
  bandWidth,
  dimension,
  positionScanlineCrossSum,
  scanlineSum,
  scanlineSquaredSum,
}: IAlignmentScoreParams): IEdgeMeasurement => {
  if (!positionCount || !scanlines) return { score: 0, position: 0, slope: 0 }

  const mean = positionSum / positionCount
  const variance = Math.max(0, positionSquaredSum / positionCount - mean * mean)
  const support = positionCount / scanlines
  const alignment = Math.max(0, Math.min(1, 1 - Math.sqrt(variance) / Math.max(1, bandWidth * 0.45)))
  const consistentDirections = Math.max(positiveDirectionCount, positionCount - positiveDirectionCount)
  const directionScore = Math.max(0, Math.min(1, (consistentDirections / positionCount - 0.5) * 2))

  let slope = 0
  if (
    positionScanlineCrossSum !== undefined &&
    scanlineSum !== undefined &&
    scanlineSquaredSum !== undefined &&
    positionCount > 2
  ) {
    const n = positionCount
    const denominator = n * scanlineSquaredSum - scanlineSum * scanlineSum
    if (Math.abs(denominator) > 1e-10) {
      const rawSlope = (n * positionScanlineCrossSum - positionSum * scanlineSum) / denominator
      slope = Math.atan(rawSlope / Math.max(1, dimension))
    }
  }

  return {
    score: support * (0.08 + alignment * 0.72 + directionScore * 0.2),
    position: mean / dimension,
    slope,
  }
}

interface IHorizontalEdgeParams {
  bandEndRatio: number
  bandStartRatio: number
  height: number
  luma: Uint8Array
  step: number
  width: number
}

const measureHorizontalEdge = ({
  luma,
  width,
  height,
  bandStartRatio,
  bandEndRatio,
  step,
}: IHorizontalEdgeParams): IEdgeMeasurement => {
  const yStart = Math.max(step, alignUp(height * bandStartRatio, step))
  const yEnd = Math.min(height - step - 1, alignDown(height * bandEndRatio, step))
  const xStart = Math.max(0, alignUp(width * ID_CARD_DETECTION_CONFIG.edgeDetection.scanInsetRatio, step))
  const xEnd = Math.min(width - 1, alignDown(width * (1 - ID_CARD_DETECTION_CONFIG.edgeDetection.scanInsetRatio), step))
  if (yEnd < yStart || xEnd < xStart) return { score: 0, position: 0, slope: 0 }

  let positionCount = 0
  let positionSum = 0
  let positionSquaredSum = 0
  let positiveDirectionCount = 0
  let scanlines = 0
  let positionScanlineCrossSum = 0
  let scanlineSum = 0
  let scanlineSquaredSum = 0

  for (let x = xStart; x <= xEnd; x += step) {
    let strongestDelta = 0
    let strongestSignedDelta = 0
    let strongestPosition = yStart

    for (let y = yStart; y <= yEnd; y += step) {
      const signedDelta = (luma[(y + step) * width + x] ?? 0) - (luma[(y - step) * width + x] ?? 0)
      const delta = Math.abs(signedDelta)
      if (delta > strongestDelta) {
        strongestDelta = delta
        strongestSignedDelta = signedDelta
        strongestPosition = y
      }
    }

    if (strongestDelta >= ID_CARD_DETECTION_CONFIG.edgeDetection.lumaThreshold) {
      positionCount += 1
      positionSum += strongestPosition
      positionSquaredSum += strongestPosition * strongestPosition
      if (strongestSignedDelta >= 0) positiveDirectionCount += 1
      positionScanlineCrossSum += strongestPosition * x
      scanlineSum += x
      scanlineSquaredSum += x * x
    }
    scanlines += 1
  }

  return getEdgeAlignmentScore({
    positionCount,
    positionSum,
    positionSquaredSum,
    positiveDirectionCount,
    scanlines,
    bandWidth: yEnd - yStart + step,
    dimension: height,
    positionScanlineCrossSum,
    scanlineSum,
    scanlineSquaredSum,
  })
}

interface IVerticalEdgeParams {
  bandEndRatio: number
  bandStartRatio: number
  height: number
  luma: Uint8Array
  step: number
  width: number
}

const measureVerticalEdge = ({
  luma,
  width,
  height,
  bandStartRatio,
  bandEndRatio,
  step,
}: IVerticalEdgeParams): IEdgeMeasurement => {
  const xStart = Math.max(step, alignUp(width * bandStartRatio, step))
  const xEnd = Math.min(width - step - 1, alignDown(width * bandEndRatio, step))
  const yStart = Math.max(0, alignUp(height * ID_CARD_DETECTION_CONFIG.edgeDetection.scanInsetRatio, step))
  const yEnd = Math.min(
    height - 1,
    alignDown(height * (1 - ID_CARD_DETECTION_CONFIG.edgeDetection.scanInsetRatio), step),
  )
  if (xEnd < xStart || yEnd < yStart) return { score: 0, position: 0, slope: 0 }

  let positionCount = 0
  let positionSum = 0
  let positionSquaredSum = 0
  let positiveDirectionCount = 0
  let scanlines = 0
  let positionScanlineCrossSum = 0
  let scanlineSum = 0
  let scanlineSquaredSum = 0

  for (let y = yStart; y <= yEnd; y += step) {
    let strongestDelta = 0
    let strongestSignedDelta = 0
    let strongestPosition = xStart

    for (let x = xStart; x <= xEnd; x += step) {
      const signedDelta = (luma[y * width + x + step] ?? 0) - (luma[y * width + x - step] ?? 0)
      const delta = Math.abs(signedDelta)
      if (delta > strongestDelta) {
        strongestDelta = delta
        strongestSignedDelta = signedDelta
        strongestPosition = x
      }
    }

    if (strongestDelta >= ID_CARD_DETECTION_CONFIG.edgeDetection.lumaThreshold) {
      positionCount += 1
      positionSum += strongestPosition
      positionSquaredSum += strongestPosition * strongestPosition
      if (strongestSignedDelta >= 0) positiveDirectionCount += 1
      positionScanlineCrossSum += strongestPosition * y
      scanlineSum += y
      scanlineSquaredSum += y * y
    }
    scanlines += 1
  }

  return getEdgeAlignmentScore({
    positionCount,
    positionSum,
    positionSquaredSum,
    positiveDirectionCount,
    scanlines,
    bandWidth: xEnd - xStart + step,
    dimension: width,
    positionScanlineCrossSum,
    scanlineSum,
    scanlineSquaredSum,
  })
}

interface ICardEdgeSearchRegion {
  far: number
  near: number
  span: number
}

const measureIdCardEdges = ({
  luminance,
  imageWidth,
  imageHeight,
  sampleInterval,
  guideRegion,
}: {
  guideRegion: ICardEdgeSearchRegion
  imageHeight: number
  imageWidth: number
  luminance: Uint8Array
  sampleInterval: number
}): ICardEdges => {
  const innerSearchAllowance = guideRegion.span * 0.12
  const nearStart = Math.max(0, guideRegion.near - ID_CARD_DETECTION_CONFIG.metrics.guideOverflow.outerTolerance)
  const nearEnd = guideRegion.near + innerSearchAllowance
  const farStart = guideRegion.far - innerSearchAllowance
  const farEnd = Math.min(1, guideRegion.far + ID_CARD_DETECTION_CONFIG.metrics.guideOverflow.outerTolerance)
  const measurementInput = {
    luma: luminance,
    width: imageWidth,
    height: imageHeight,
    step: sampleInterval,
  }

  return {
    top: measureHorizontalEdge({ ...measurementInput, bandStartRatio: nearStart, bandEndRatio: nearEnd }),
    right: measureVerticalEdge({ ...measurementInput, bandStartRatio: farStart, bandEndRatio: farEnd }),
    bottom: measureHorizontalEdge({ ...measurementInput, bandStartRatio: farStart, bandEndRatio: farEnd }),
    left: measureVerticalEdge({ ...measurementInput, bandStartRatio: nearStart, bandEndRatio: nearEnd }),
  }
}

export default measureIdCardEdges
