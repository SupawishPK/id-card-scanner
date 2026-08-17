import type { IFrameAnalysis } from './checkFrameQuality'
import checkFrameQuality from './checkFrameQuality'

const makeAnalysis = (overrides: Partial<IFrameAnalysis> = {}): IFrameAnalysis => ({
  edgeDensity: 0.1,
  mean: 128,
  motion: 0,
  variance: 500,
  ...overrides,
})

describe('checkFrameQuality', () => {
  describe('hasPresenceDetails', () => {
    it('should return true when all presence thresholds are met', () => {
      const result = checkFrameQuality(makeAnalysis({ mean: 100, variance: 200, edgeDensity: 0.01 }))
      expect(result.hasPresenceDetails).toBe(true)
    })

    it('should return false when mean is at or below presence minBrightness (24)', () => {
      expect(checkFrameQuality(makeAnalysis({ mean: 24 })).hasPresenceDetails).toBe(false)
    })

    it('should return false when mean is at or above presence maxBrightness (235)', () => {
      expect(checkFrameQuality(makeAnalysis({ mean: 235 })).hasPresenceDetails).toBe(false)
    })

    it('should return false when variance is at or below presence minVariance (120)', () => {
      expect(checkFrameQuality(makeAnalysis({ variance: 120 })).hasPresenceDetails).toBe(false)
    })

    it('should return false when edgeDensity is at or below presence minEdgeDensity (0.003)', () => {
      expect(checkFrameQuality(makeAnalysis({ edgeDensity: 0.003 })).hasPresenceDetails).toBe(false)
    })

    it('should return true with values just above all presence thresholds', () => {
      const result = checkFrameQuality(makeAnalysis({ mean: 25, variance: 121, edgeDensity: 0.004 }))
      expect(result.hasPresenceDetails).toBe(true)
    })
  })

  describe('hasCardDetails', () => {
    it('should return true when all capture thresholds are met', () => {
      const result = checkFrameQuality(makeAnalysis({ mean: 100, variance: 300, edgeDensity: 0.02 }))
      expect(result.hasCardDetails).toBe(true)
    })

    it('should return false when hasUsableLight fails — mean below capture minBrightness (42)', () => {
      expect(checkFrameQuality(makeAnalysis({ mean: 42 })).hasCardDetails).toBe(false)
    })

    it('should return false when hasUsableLight fails — mean above capture maxBrightness (225)', () => {
      expect(checkFrameQuality(makeAnalysis({ mean: 225 })).hasCardDetails).toBe(false)
    })

    it('should return false when variance is at or below capture minVariance (260)', () => {
      expect(checkFrameQuality(makeAnalysis({ variance: 260 })).hasCardDetails).toBe(false)
    })

    it('should return false when edgeDensity is at or below capture minEdgeDensity (0.012)', () => {
      expect(checkFrameQuality(makeAnalysis({ edgeDensity: 0.012 })).hasCardDetails).toBe(false)
    })

    it('should return false when hasUsableLight is met but variance fails', () => {
      const result = checkFrameQuality(makeAnalysis({ mean: 100, variance: 100, edgeDensity: 0.1 }))
      expect(result.hasCardDetails).toBe(false)
      expect(result.hasPresenceDetails).toBe(false)
    })

    it('should return true with values just above all capture thresholds', () => {
      const result = checkFrameQuality(makeAnalysis({ mean: 43, variance: 261, edgeDensity: 0.013 }))
      expect(result.hasCardDetails).toBe(true)
    })
  })

  describe('independence of presence and capture checks', () => {
    it('should report hasPresenceDetails=true but hasCardDetails=false when only presence thresholds pass', () => {
      const result = checkFrameQuality(makeAnalysis({ mean: 100, variance: 200, edgeDensity: 0.01 }))
      expect(result.hasPresenceDetails).toBe(true)
      expect(result.hasCardDetails).toBe(false)
    })

    it('should report hasPresenceDetails=true but hasCardDetails=false when mean passes presence but fails capture brightness', () => {
      const result = checkFrameQuality(makeAnalysis({ mean: 25, variance: 300, edgeDensity: 0.1 }))
      expect(result.hasPresenceDetails).toBe(true)
      expect(result.hasCardDetails).toBe(false)
    })
  })
})
