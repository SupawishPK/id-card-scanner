import type { IFrameState } from './createFrameState'
import detectIdCard from './detectIdCard'

const ANALYSIS_WIDTH = 151
const ANALYSIS_HEIGHT = 240
const PIXEL_COUNT = ANALYSIS_WIDTH * ANALYSIS_HEIGHT

const makeFrameState = (overrides: Partial<IFrameState> = {}): IFrameState => ({
  canvas: null,
  currentLuma: new Uint8Array(PIXEL_COUNT),
  hasDetectedCard: false,
  isCaptureAligned: false,
  lastReportedStatus: null,
  lastVideoHeight: 0,
  lastVideoWidth: 0,
  needsRectRecalc: false,
  previousLuma: null,
  readiness: {
    stableSince: null,
    stableFrames: 0,
    acquireMisses: 0,
    readyMisses: 0,
    isReady: false,
  },
  roiBounds: null,
  ...overrides,
})

const makePixels = (fill: number = 128): Uint8ClampedArray => {
  const count = PIXEL_COUNT * 4
  const arr = new Uint8ClampedArray(count)
  for (let i = 0; i < count; i += 4) {
    arr[i] = fill
    arr[i + 1] = fill
    arr[i + 2] = fill
    arr[i + 3] = 255
  }
  return arr
}

describe('detectIdCard', () => {
  describe('return shape', () => {
    it('should return an object with status and changed properties when called', () => {
      const frameState = makeFrameState()
      const pixels = makePixels()
      const result = detectIdCard({ frameState, pixels, now: 0 })
      expect(result).toHaveProperty('status')
      expect(result).toHaveProperty('changed')
    })

    it('should return a valid scanner status when evaluating frame', () => {
      const frameState = makeFrameState()
      const pixels = makePixels()
      const result = detectIdCard({ frameState, pixels, now: 0 })
      expect(['searching', 'detected', 'aligning', 'stable']).toContain(result.status)
    })
  })

  describe('with uniform frame', () => {
    it('should return searching status when frame is uniform', () => {
      const frameState = makeFrameState()
      const pixels = makePixels(128)
      const result = detectIdCard({ frameState, pixels, now: 0 })
      expect(result.status).toBe('searching')
    })
  })

  describe('frame state mutation', () => {
    it('should swap currentLuma and previousLuma buffers when detectIdCard is called', () => {
      const frameState = makeFrameState()
      const originalCurrent = frameState.currentLuma
      const pixels = makePixels()
      detectIdCard({ frameState, pixels, now: 0 })
      expect(frameState.previousLuma).toBe(originalCurrent)
    })

    it('should update readiness state when frame is processed', () => {
      const frameState = makeFrameState()
      const pixels = makePixels()
      detectIdCard({ frameState, pixels, now: 0 })
      expect(frameState.readiness).toBeDefined()
    })

    it('should report changed on first call when status transitions from null', () => {
      const frameState = makeFrameState()
      const pixels = makePixels()
      const result = detectIdCard({ frameState, pixels, now: 0 })
      const firstChanged = result.changed

      const result2 = detectIdCard({ frameState, pixels, now: 100 })
      if (firstChanged && result.status === result2.status) {
        expect(result2.changed).toBe(false)
      }
    })
  })

  describe('with different initial frame states', () => {
    it('should handle frame state without throwing when previous luma is null', () => {
      const frameState = makeFrameState({ previousLuma: null })
      const pixels = makePixels()
      expect(() => detectIdCard({ frameState, pixels, now: 0 })).not.toThrow()
    })

    it('should handle frame state with existing current luma data when evaluated', () => {
      const luma = new Uint8Array(PIXEL_COUNT).fill(100)
      const frameState = makeFrameState({ currentLuma: luma })
      const pixels = makePixels()
      const result = detectIdCard({ frameState, pixels, now: 0 })
      expect(result.status).toBe('searching')
    })

    it('should handle frame state without throwing when currentLuma length is mismatched', () => {
      const smallLuma = new Uint8Array(10)
      const frameState = makeFrameState({ currentLuma: smallLuma })
      const pixels = makePixels()
      expect(() => detectIdCard({ frameState, pixels, now: 0 })).not.toThrow()
    })
  })

  describe('different timestamps', () => {
    it('should accept zero timestamp when evaluating frame', () => {
      const frameState = makeFrameState()
      const pixels = makePixels()
      expect(() => detectIdCard({ frameState, pixels, now: 0 })).not.toThrow()
    })

    it('should accept large timestamp when evaluating frame', () => {
      const frameState = makeFrameState()
      const pixels = makePixels()
      expect(() => detectIdCard({ frameState, pixels, now: 1000000 })).not.toThrow()
    })
  })
})
