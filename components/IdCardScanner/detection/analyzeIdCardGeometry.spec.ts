import analyzeIdCardGeometry from './analyzeIdCardGeometry'

const W = 80
const H = 100

describe('analyzeIdCardGeometry', () => {
  describe('return shape', () => {
    it('should return all expected keys in the geometry result', () => {
      const luma = new Uint8Array(W * H)
      const result = analyzeIdCardGeometry({ luminance: luma, imageWidth: W, imageHeight: H })

      expect(result).toHaveProperty('aspectScore')
      expect(result).toHaveProperty('averageCornerScore')
      expect(result).toHaveProperty('averageEdgeScore')
      expect(result).toHaveProperty('captureConfidence')
      expect(result).toHaveProperty('cornerScores')
      expect(result).toHaveProperty('coverageScore')
      expect(result).toHaveProperty('detectedAspectRatio')
      expect(result).toHaveProperty('detectedCardRect')
      expect(result).toHaveProperty('edgeScores')
      expect(result).toHaveProperty('guideOverflowRatio')
      expect(result).toHaveProperty('interiorBackgroundContrast')
      expect(result).toHaveProperty('meetsMinimumGeometry')
      expect(result).toHaveProperty('minimumCornerScore')
      expect(result).toHaveProperty('minimumEdgeScore')
      expect(result).toHaveProperty('parallelismScore')
      expect(result).toHaveProperty('passesGeometryThresholds')
      expect(result).toHaveProperty('presenceConfidence')
      expect(result).toHaveProperty('skewScore')
    })
  })

  describe('with uniform image', () => {
    it('should return zero edge scores for uniform luminance', () => {
      const luma = new Uint8Array(W * H).fill(128)
      const result = analyzeIdCardGeometry({ luminance: luma, imageWidth: W, imageHeight: H })
      expect(result.averageEdgeScore).toBe(0)
      expect(result.averageCornerScore).toBe(0)
    })

    it('should report meetsMinimumGeometry as false for uniform image', () => {
      const luma = new Uint8Array(W * H).fill(128)
      const result = analyzeIdCardGeometry({ luminance: luma, imageWidth: W, imageHeight: H })
      expect(result.meetsMinimumGeometry).toBe(false)
    })

    it('should return low capture and presence confidence for uniform image', () => {
      const luma = new Uint8Array(W * H).fill(128)
      const result = analyzeIdCardGeometry({ luminance: luma, imageWidth: W, imageHeight: H })
      expect(result.captureConfidence).toBeLessThanOrEqual(0.5)
      expect(result.presenceConfidence).toBeLessThanOrEqual(0.5)
    })
  })

  describe('with card-like image', () => {
    it('should produce higher edge scores when card edges are present', () => {
      const luma = new Uint8Array(W * H)
      const leftEdgeX = Math.floor(W * 0.12)
      const rightEdgeX = Math.floor(W * 0.85)
      const topEdgeY = Math.floor(H * 0.10)
      const bottomEdgeY = Math.floor(H * 0.90)

      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const idx = y * W + x
          const isInterior = x > leftEdgeX && x < rightEdgeX && y > topEdgeY && y < bottomEdgeY
          luma[idx] = isInterior ? 220 : 40
        }
      }

      const result = analyzeIdCardGeometry({ luminance: luma, imageWidth: W, imageHeight: H })
      expect(result.averageEdgeScore).toBeGreaterThan(0)
    })
  })

  describe('confidence scores are within [0, 1]', () => {
    it('should produce captureConfidence between 0 and 1', () => {
      const luma = new Uint8Array(W * H).fill(128)
      const result = analyzeIdCardGeometry({ luminance: luma, imageWidth: W, imageHeight: H })
      expect(result.captureConfidence).toBeGreaterThanOrEqual(0)
      expect(result.captureConfidence).toBeLessThanOrEqual(1)
    })

    it('should produce presenceConfidence between 0 and 1', () => {
      const luma = new Uint8Array(W * H).fill(128)
      const result = analyzeIdCardGeometry({ luminance: luma, imageWidth: W, imageHeight: H })
      expect(result.presenceConfidence).toBeGreaterThanOrEqual(0)
      expect(result.presenceConfidence).toBeLessThanOrEqual(1)
    })
  })

  describe('default parameters', () => {
    it('should use sampleInterval default of 2 when not provided', () => {
      const luma = new Uint8Array(W * H).fill(128)
      expect(() => analyzeIdCardGeometry({ luminance: luma, imageWidth: W, imageHeight: H })).not.toThrow()
    })

    it('should accept explicit sampleInterval', () => {
      const luma = new Uint8Array(W * H).fill(128)
      expect(() => analyzeIdCardGeometry({ luminance: luma, imageWidth: W, imageHeight: H, sampleInterval: 1 })).not.toThrow()
    })
  })

  describe('guideOverflowRatio', () => {
    it('should return a guideOverflowRatio object with top, right, bottom, left', () => {
      const luma = new Uint8Array(W * H).fill(128)
      const result = analyzeIdCardGeometry({ luminance: luma, imageWidth: W, imageHeight: H })
      expect(result.guideOverflowRatio).toHaveProperty('top')
      expect(result.guideOverflowRatio).toHaveProperty('right')
      expect(result.guideOverflowRatio).toHaveProperty('bottom')
      expect(result.guideOverflowRatio).toHaveProperty('left')
    })
  })

  describe('cornerScores and edgeScores', () => {
    it('should return all four corner scores', () => {
      const luma = new Uint8Array(W * H).fill(128)
      const result = analyzeIdCardGeometry({ luminance: luma, imageWidth: W, imageHeight: H })
      expect(result.cornerScores).toHaveProperty('topLeft')
      expect(result.cornerScores).toHaveProperty('topRight')
      expect(result.cornerScores).toHaveProperty('bottomRight')
      expect(result.cornerScores).toHaveProperty('bottomLeft')
    })

    it('should return all four edge scores', () => {
      const luma = new Uint8Array(W * H).fill(128)
      const result = analyzeIdCardGeometry({ luminance: luma, imageWidth: W, imageHeight: H })
      expect(result.edgeScores).toHaveProperty('top')
      expect(result.edgeScores).toHaveProperty('right')
      expect(result.edgeScores).toHaveProperty('bottom')
      expect(result.edgeScores).toHaveProperty('left')
    })
  })

  describe('minimum scores consistency', () => {
    it('should have minimumEdgeScore <= averageEdgeScore', () => {
      const luma = new Uint8Array(W * H).fill(128)
      const result = analyzeIdCardGeometry({ luminance: luma, imageWidth: W, imageHeight: H })
      expect(result.minimumEdgeScore).toBeLessThanOrEqual(result.averageEdgeScore)
    })

    it('should have minimumCornerScore <= averageCornerScore', () => {
      const luma = new Uint8Array(W * H).fill(128)
      const result = analyzeIdCardGeometry({ luminance: luma, imageWidth: W, imageHeight: H })
      expect(result.minimumCornerScore).toBeLessThanOrEqual(result.averageCornerScore)
    })
  })

  describe('passesGeometryThresholds is alias for meetsMinimumGeometry', () => {
    it('should have passesGeometryThresholds equal to meetsMinimumGeometry', () => {
      const luma = new Uint8Array(W * H).fill(128)
      const result = analyzeIdCardGeometry({ luminance: luma, imageWidth: W, imageHeight: H })
      expect(result.passesGeometryThresholds).toBe(result.meetsMinimumGeometry)
    })
  })
})
