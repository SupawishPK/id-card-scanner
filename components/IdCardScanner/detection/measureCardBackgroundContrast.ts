import type { ICardEdges } from './measureIdCardEdges'

interface IArgs {
  edges: ICardEdges
  height: number
  luma: Uint8Array
  step: number
  width: number
}

const measureCardBackgroundContrast = ({ luma, width, height, edges, step }: IArgs): number => {
  const interiorInset = 0.025
  const backgroundInset = 0.012
  const { top, right, bottom, left } = edges

  const intLeft = (left.position + interiorInset) * width
  const intRight = (right.position - interiorInset) * width
  const intTop = (top.position + interiorInset) * height
  const intBottom = (bottom.position - interiorInset) * height

  const bgLeft = (left.position - backgroundInset) * width
  const bgRight = (right.position + backgroundInset) * width
  const bgTop = (top.position - backgroundInset) * height
  const bgBottom = (bottom.position + backgroundInset) * height

  let interiorSum = 0
  let interiorSamples = 0
  let backgroundSum = 0
  let backgroundSamples = 0

  for (let y = 0; y < height; y += step) {
    const isIntY = y > intTop && y < intBottom
    const isBgY = y < bgTop || y > bgBottom
    const rowOffset = y * width

    for (let x = 0; x < width; x += step) {
      const isInterior = isIntY && x > intLeft && x < intRight
      const isBackground = isBgY || x < bgLeft || x > bgRight
      const value = luma[rowOffset + x] ?? 0

      if (isInterior) {
        interiorSum += value
        interiorSamples += 1
      } else if (isBackground) {
        backgroundSum += value
        backgroundSamples += 1
      }
    }
  }

  if (!interiorSamples || !backgroundSamples) return 0
  return Math.abs(interiorSum / interiorSamples - backgroundSum / backgroundSamples)
}

export default measureCardBackgroundContrast
