import measureIdCardCorners from './measureIdCardCorners'
import type { ICardEdges } from './measureIdCardEdges'

const makeEdges = (overrides: Partial<ICardEdges> = {}): ICardEdges => ({
  top: { position: 0.15, score: 0.8, slope: 0 },
  right: { position: 0.75, score: 0.8, slope: 0 },
  bottom: { position: 0.85, score: 0.8, slope: 0 },
  left: { position: 0.1, score: 0.8, slope: 0 },
  ...overrides,
})

describe('measureIdCardCorners', () => {
  const W = 100
  const H = 80
  const step = 2

  it('should return an object with all four corner keys', () => {
    const luma = new Uint8Array(W * H)
    const result = measureIdCardCorners({ luma, width: W, height: H, edges: makeEdges(), step })
    expect(result).toHaveProperty('topLeft')
    expect(result).toHaveProperty('topRight')
    expect(result).toHaveProperty('bottomRight')
    expect(result).toHaveProperty('bottomLeft')
  })

  it('should return zero scores for a uniform image', () => {
    const luma = new Uint8Array(W * H).fill(128)
    const result = measureIdCardCorners({ luma, width: W, height: H, edges: makeEdges(), step })
    expect(result.topLeft).toBe(0)
    expect(result.topRight).toBe(0)
    expect(result.bottomRight).toBe(0)
    expect(result.bottomLeft).toBe(0)
  })

  it('should detect corners with vertical and horizontal edges present', () => {
    const W1 = 60
    const H1 = 80
    const luma = new Uint8Array(W1 * H1)
    const edges = makeEdges({
      top: { position: 0.2, score: 0, slope: 0 },
      right: { position: 0.8, score: 0, slope: 0 },
      bottom: { position: 0.8, score: 0, slope: 0 },
      left: { position: 0.2, score: 0, slope: 0 },
    })

    for (let y = 0; y < H1; y++) {
      for (let x = 0; x < W1; x++) {
        const idx = y * W1 + x
        const posX = x / W1
        const posY = y / H1
        const isInterior =
          posX > edges.left.position &&
          posX < edges.right.position &&
          posY > edges.top.position &&
          posY < edges.bottom.position
        luma[idx] = isInterior ? 200 : 50
      }
    }

    const result = measureIdCardCorners({ luma, width: W1, height: H1, edges, step })
    expect(result.topLeft).toBeGreaterThan(0)
    expect(result.topRight).toBeGreaterThan(0)
    expect(result.bottomRight).toBeGreaterThan(0)
    expect(result.bottomLeft).toBeGreaterThan(0)
  })

  it('should return scores between 0 and 1 inclusive', () => {
    const luma = new Uint8Array(W * H)
    for (let i = 0; i < luma.length; i++) {
      luma[i] = Math.random() * 256
    }
    const result = measureIdCardCorners({ luma, width: W, height: H, edges: makeEdges(), step })
    expect(result.topLeft).toBeGreaterThanOrEqual(0)
    expect(result.topLeft).toBeLessThanOrEqual(1)
    expect(result.topRight).toBeGreaterThanOrEqual(0)
    expect(result.topRight).toBeLessThanOrEqual(1)
  })

  it('should handle edges at extreme positions', () => {
    const luma = new Uint8Array(W * H)
    const edges = makeEdges({
      top: { position: 0.02, score: 0, slope: 0 },
      left: { position: 0.02, score: 0, slope: 0 },
      right: { position: 0.98, score: 0, slope: 0 },
      bottom: { position: 0.98, score: 0, slope: 0 },
    })

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = y * W + x
        const posX = x / W
        const posY = y / H
        const isInterior = posX > 0.02 && posX < 0.98 && posY > 0.02 && posY < 0.98
        luma[idx] = isInterior ? 200 : 50
      }
    }

    const result = measureIdCardCorners({ luma, width: W, height: H, edges, step })
    expect(() => result).not.toThrow()
  })
})
