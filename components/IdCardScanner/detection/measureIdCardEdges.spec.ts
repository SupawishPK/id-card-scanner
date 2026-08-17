import measureIdCardEdges from './measureIdCardEdges'

describe('measureIdCardEdges', () => {
  const W = 80
  const H = 100
  const step = 2
  const guideRegion = {
    near: 0.08 / (1 + 0.08 * 2),
    far: 1 - 0.08 / (1 + 0.08 * 2),
    span: 1 - (0.08 / (1 + 0.08 * 2)) * 2,
  }

  it('should return all four edge measurements', () => {
    const luma = new Uint8Array(W * H)
    const result = measureIdCardEdges({
      luminance: luma,
      imageWidth: W,
      imageHeight: H,
      sampleInterval: step,
      guideRegion,
    })
    expect(result).toHaveProperty('top')
    expect(result).toHaveProperty('right')
    expect(result).toHaveProperty('bottom')
    expect(result).toHaveProperty('left')
  })

  it('should return edge measurements with position, score, and slope', () => {
    const luma = new Uint8Array(W * H)
    const result = measureIdCardEdges({
      luminance: luma,
      imageWidth: W,
      imageHeight: H,
      sampleInterval: step,
      guideRegion,
    })
    for (const key of ['top', 'right', 'bottom', 'left'] as const) {
      expect(result[key]).toHaveProperty('position')
      expect(result[key]).toHaveProperty('score')
      expect(result[key]).toHaveProperty('slope')
    }
  })

  it('should return zero scores for a uniform image with no edges', () => {
    const luma = new Uint8Array(W * H).fill(128)
    const result = measureIdCardEdges({
      luminance: luma,
      imageWidth: W,
      imageHeight: H,
      sampleInterval: step,
      guideRegion,
    })
    expect(result.top.score).toBe(0)
    expect(result.bottom.score).toBe(0)
    expect(result.left.score).toBe(0)
    expect(result.right.score).toBe(0)
  })

  it('should detect horizontal edges when there are strong horizontal luma gradients', () => {
    const luma = new Uint8Array(W * H)
    const topEdgeY = Math.floor(H * guideRegion.near * 1.1)
    const bottomEdgeY = Math.floor(H * guideRegion.far * 0.9)

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = y * W + x
        if (y < topEdgeY) luma[idx] = 30
        else if (y < topEdgeY + 3) luma[idx] = 100
        else if (y > bottomEdgeY) luma[idx] = 30
        else luma[idx] = 200
      }
    }

    const result = measureIdCardEdges({
      luminance: luma,
      imageWidth: W,
      imageHeight: H,
      sampleInterval: step,
      guideRegion,
    })
    expect(result.top.score).toBeGreaterThan(0)
    expect(result.bottom.score).toBeGreaterThan(0)
  })

  it('should detect vertical edges when there are strong vertical luma gradients', () => {
    const luma = new Uint8Array(W * H)
    const leftEdgeX = Math.floor(W * guideRegion.near * 1.1)
    const rightEdgeX = Math.floor(W * guideRegion.far * 0.9)

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = y * W + x
        if (x < leftEdgeX) luma[idx] = 30
        else if (x < leftEdgeX + 3) luma[idx] = 100
        else if (x > rightEdgeX) luma[idx] = 30
        else luma[idx] = 200
      }
    }

    const result = measureIdCardEdges({
      luminance: luma,
      imageWidth: W,
      imageHeight: H,
      sampleInterval: step,
      guideRegion,
    })
    expect(result.left.score).toBeGreaterThan(0)
    expect(result.right.score).toBeGreaterThan(0)
  })

  it('should return positions within the guide region for detected edges', () => {
    const luma = new Uint8Array(W * H)
    const topEdgeY = Math.floor(H * guideRegion.near * 1.1)

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = y * W + x
        if (y < topEdgeY) {
          luma[idx] = 30
        } else if (y < topEdgeY + 3) {
          luma[idx] = 100
        } else {
          luma[idx] = 200
        }
      }
    }

    const result = measureIdCardEdges({
      luminance: luma,
      imageWidth: W,
      imageHeight: H,
      sampleInterval: step,
      guideRegion,
    })

    if (result.top.score > 0) {
      expect(result.top.position).toBeGreaterThanOrEqual(0)
      expect(result.top.position).toBeLessThanOrEqual(1)
    }
  })

  it('should handle different sample intervals', () => {
    const luma = new Uint8Array(W * H).fill(128)
    const result1 = measureIdCardEdges({
      luminance: luma,
      imageWidth: W,
      imageHeight: H,
      sampleInterval: 1,
      guideRegion,
    })
    const result4 = measureIdCardEdges({
      luminance: luma,
      imageWidth: W,
      imageHeight: H,
      sampleInterval: 4,
      guideRegion,
    })
    expect(result1.top.score).toBe(0)
    expect(result4.top.score).toBe(0)
  })
})
