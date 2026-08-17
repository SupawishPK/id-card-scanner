import type { ICardEdges } from './measureIdCardEdges'
import measureCardBackgroundContrast from './measureCardBackgroundContrast'

const makeEdges = (overrides: Partial<ICardEdges> = {}): ICardEdges => ({
  top: { position: 0.15, score: 0.8, slope: 0 },
  right: { position: 0.75, score: 0.8, slope: 0 },
  bottom: { position: 0.85, score: 0.8, slope: 0 },
  left: { position: 0.10, score: 0.8, slope: 0 },
  ...overrides,
})

describe('measureCardBackgroundContrast', () => {
  const W = 100
  const H = 60
  const step = 2

  it('should return 0 when the card fills the entire image (no background samples)', () => {
    const edges = makeEdges({
      top: { position: 0, score: 0, slope: 0 },
      left: { position: 0, score: 0, slope: 0 },
      right: { position: 1, score: 0, slope: 0 },
      bottom: { position: 1, score: 0, slope: 0 },
    })
    const luma = new Uint8Array(W * H)
    expect(measureCardBackgroundContrast({ luma, width: W, height: H, edges, step: 2 })).toBe(0)
  })

  it('should return a positive contrast when interior is bright and background is dark', () => {
    const luma = new Uint8Array(W * H)
    const edges = makeEdges()

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = y * W + x
        const posX = x / W
        const posY = y / H
        const isInterior =
          posX > edges.left.position && posX < edges.right.position &&
          posY > edges.top.position && posY < edges.bottom.position
        luma[idx] = isInterior ? 200 : 50
      }
    }

    const result = measureCardBackgroundContrast({ luma, width: W, height: H, edges, step })
    expect(result).toBeGreaterThan(0)
  })

  it('should return 0 when interior and background have the same luminance', () => {
    const luma = new Uint8Array(W * H).fill(100)
    const edges = makeEdges()
    const result = measureCardBackgroundContrast({ luma, width: W, height: H, edges, step })
    expect(result).toBe(0)
  })

  it('should handle card positioned near boundaries with enough room for background samples', () => {
    const edges = makeEdges({
      top: { position: 0.04, score: 0.8, slope: 0 },
      left: { position: 0.04, score: 0.8, slope: 0 },
      right: { position: 0.96, score: 0.8, slope: 0 },
      bottom: { position: 0.96, score: 0.8, slope: 0 },
    })
    const luma = new Uint8Array(W * H)

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = y * W + x
        const posX = x / W
        const posY = y / H
        const isInterior =
          posX > edges.left.position && posX < edges.right.position &&
          posY > edges.top.position && posY < edges.bottom.position
        luma[idx] = isInterior ? 180 : 20
      }
    }

    const result = measureCardBackgroundContrast({ luma, width: W, height: H, edges, step })
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThanOrEqual(255)
  })

  it('should handle different step sizes correctly', () => {
    const edges = makeEdges()
    const luma = new Uint8Array(W * H)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = y * W + x
        const isInterior = x > 15 && x < 75 && y > 12 && y < 48
        luma[idx] = isInterior ? 200 : 50
      }
    }

    const result1 = measureCardBackgroundContrast({ luma, width: W, height: H, edges, step: 1 })
    const result4 = measureCardBackgroundContrast({ luma, width: W, height: H, edges, step: 4 })
    expect(result1).toBeGreaterThan(0)
    expect(result4).toBeGreaterThan(0)
  })
})
