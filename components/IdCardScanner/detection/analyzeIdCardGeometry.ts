import ID_CARD_DETECTION_CONFIG from './idCardDetectionConfig'
import measureCardBackgroundContrast from './measureCardBackgroundContrast'
import measureIdCardCorners from './measureIdCardCorners'
import type { IEdgeScores, ICornerScores, ICardEdges } from './measureIdCardEdges'
import measureIdCardEdges from './measureIdCardEdges'

const constrainBetweenZeroAndOne = (value: number): number => {
  return Math.max(0, Math.min(1, value))
}

const calculateSkewScores = (edges: ICardEdges): { parallelismScore: number; skewScore: number } => {
  const straightness = (s: number) =>
    constrainBetweenZeroAndOne(1 - Math.abs(s) / ID_CARD_DETECTION_CONFIG.edgeDetection.maxSlope)
  const parallelismScore = Math.min(
    constrainBetweenZeroAndOne(
      1 - Math.abs(edges.top.slope - edges.bottom.slope) / ID_CARD_DETECTION_CONFIG.edgeDetection.maxParallelismError,
    ),
    constrainBetweenZeroAndOne(
      1 - Math.abs(edges.left.slope - edges.right.slope) / ID_CARD_DETECTION_CONFIG.edgeDetection.maxParallelismError,
    ),
  )
  const skewScore = constrainBetweenZeroAndOne(
    straightness(edges.top.slope) * 0.2 +
      straightness(edges.bottom.slope) * 0.2 +
      straightness(edges.left.slope) * 0.2 +
      straightness(edges.right.slope) * 0.2 +
      parallelismScore * 0.2,
  )

  return { parallelismScore, skewScore }
}

interface IGeometryResult {
  aspectScore: number
  averageCornerScore: number
  averageEdgeScore: number
  captureConfidence: number
  cornerScores: ICornerScores
  coverageScore: number
  detectedAspectRatio: number
  detectedCardRect: { height: number; width: number; x: number; y: number }
  edgeScores: IEdgeScores
  guideOverflowRatio: { bottom: number; left: number; right: number; top: number }
  interiorBackgroundContrast: number
  meetsMinimumGeometry: boolean
  minimumCornerScore: number
  minimumEdgeScore: number
  parallelismScore: number
  passesGeometryThresholds: boolean
  presenceConfidence: number
  skewScore: number
}

const analyzeIdCardGeometry = ({
  luminance,
  imageWidth,
  imageHeight,
  sampleInterval = 2,
}: {
  imageHeight: number
  imageWidth: number
  luminance: Uint8Array
  sampleInterval?: number
}): IGeometryResult => {
  const { frame, metrics } = ID_CARD_DETECTION_CONFIG
  const nearBoundary = frame.analysisPaddingRatio / (1 + frame.analysisPaddingRatio * 2)
  const guideRegion = { near: nearBoundary, far: 1 - nearBoundary, span: 1 - nearBoundary * 2 }

  const edges = measureIdCardEdges({
    luminance,
    imageWidth,
    imageHeight,
    sampleInterval,
    guideRegion,
  })
  const edgeScores: IEdgeScores = {
    top: edges.top.score,
    right: edges.right.score,
    bottom: edges.bottom.score,
    left: edges.left.score,
  }
  const cornerScores = measureIdCardCorners({
    luma: luminance,
    width: imageWidth,
    height: imageHeight,
    edges,
    step: sampleInterval,
  })

  const detectedWidth = Math.max(0, edges.right.position - edges.left.position) * imageWidth
  const detectedHeight = Math.max(0, edges.bottom.position - edges.top.position) * imageHeight
  const detectedAspect = detectedHeight ? detectedWidth / detectedHeight : 0
  const aspectError = detectedAspect
    ? Math.abs(Math.log(detectedAspect / metrics.aspectRatio.ideal))
    : Number.POSITIVE_INFINITY

  const interiorBackgroundContrast = measureCardBackgroundContrast({
    luma: luminance,
    width: imageWidth,
    height: imageHeight,
    edges,
    step: sampleInterval,
  })

  const { parallelismScore, skewScore } = calculateSkewScores(edges)
  const averageEdgeScore = (edgeScores.top + edgeScores.right + edgeScores.bottom + edgeScores.left) / 4
  const averageCornerScore =
    (cornerScores.topLeft + cornerScores.topRight + cornerScores.bottomRight + cornerScores.bottomLeft) / 4
  const minimumEdgeScore = Math.min(edgeScores.top, edgeScores.right, edgeScores.bottom, edgeScores.left)
  const minimumCornerScore = Math.min(
    cornerScores.topLeft,
    cornerScores.topRight,
    cornerScores.bottomRight,
    cornerScores.bottomLeft,
  )
  const spanCoverage = Math.min(
    detectedWidth / (imageWidth * guideRegion.span),
    detectedHeight / (imageHeight * guideRegion.span),
  )

  const contrastScore = constrainBetweenZeroAndOne((interiorBackgroundContrast - 4) / 20)
  const aspectScore = constrainBetweenZeroAndOne(1 - aspectError / 0.14)
  const coverageScore = constrainBetweenZeroAndOne(spanCoverage)

  const presenceConfidence = constrainBetweenZeroAndOne(
    averageEdgeScore * 0.4 +
      cornerScores.topLeft * 0.05 +
      cornerScores.topRight * 0.05 +
      aspectScore * 0.15 +
      contrastScore * 0.08 +
      constrainBetweenZeroAndOne((spanCoverage - 0.2) / 0.35) * 0.07 +
      skewScore * 0.1,
  )
  const captureConfidence = constrainBetweenZeroAndOne(
    averageEdgeScore * 0.4 +
      averageCornerScore * 0.15 +
      contrastScore * 0.12 +
      aspectScore * 0.12 +
      coverageScore * 0.09 +
      skewScore * 0.12,
  )

  const isInsideGuide =
    edges.left.position >= guideRegion.near - metrics.guideOverflow.outerTolerance &&
    edges.right.position <= guideRegion.far + metrics.guideOverflow.outerTolerance &&
    edges.top.position >= guideRegion.near - metrics.guideOverflow.outerTolerance &&
    edges.bottom.position <= guideRegion.far + metrics.guideOverflow.outerTolerance

  const passesMinGeometry =
    minimumEdgeScore >= metrics.edgeQuality.minScore &&
    minimumCornerScore >= metrics.cornerQuality.minScore &&
    aspectScore >= metrics.alignment.minAspectScore &&
    detectedAspect >= metrics.aspectRatio.min &&
    detectedAspect <= metrics.aspectRatio.max &&
    spanCoverage >= metrics.cardSize.minSpanCoverage &&
    spanCoverage <= metrics.cardSize.maxSpanCoverage

  const meetsMinimumGeometry = passesMinGeometry && isInsideGuide

  const guideSpan = guideRegion.span
  const detectedCardRect = {
    x: (edges.left.position - nearBoundary) / guideSpan,
    y: (edges.top.position - nearBoundary) / guideSpan,
    width: (edges.right.position - edges.left.position) / guideSpan,
    height: (edges.bottom.position - edges.top.position) / guideSpan,
  }

  const leftOverflow = Math.max(0, nearBoundary - edges.left.position) / guideSpan
  const rightOverflow = Math.max(0, edges.right.position - (nearBoundary + guideSpan)) / guideSpan
  const topOverflow = Math.max(0, nearBoundary - edges.top.position) / guideSpan
  const bottomOverflow = Math.max(0, edges.bottom.position - (nearBoundary + guideSpan)) / guideSpan

  return {
    aspectScore,
    averageCornerScore,
    averageEdgeScore,
    captureConfidence,
    cornerScores,
    coverageScore,
    detectedAspectRatio: detectedAspect,
    detectedCardRect,
    edgeScores,
    guideOverflowRatio: {
      top: topOverflow,
      right: rightOverflow,
      bottom: bottomOverflow,
      left: leftOverflow,
    },
    interiorBackgroundContrast,
    meetsMinimumGeometry,
    minimumCornerScore,
    minimumEdgeScore,
    parallelismScore,
    passesGeometryThresholds: meetsMinimumGeometry,
    presenceConfidence,
    skewScore,
  }
}

export default analyzeIdCardGeometry
