import { checkMotionStability } from './checkMotionStability'

describe('checkMotionStability', () => {
  describe('when previousLuma is null', () => {
    it('should return false regardless of motion value', () => {
      expect(checkMotionStability(null, 5, false)).toBe(false)
      expect(checkMotionStability(null, 5, true)).toBe(false)
      expect(checkMotionStability(null, 20, false)).toBe(false)
      expect(checkMotionStability(null, 20, true)).toBe(false)
    })
  })

  describe('when not previously ready', () => {
    const previousLuma = new Uint8Array([0])

    it('should return true when motion is below enter threshold (11)', () => {
      expect(checkMotionStability(previousLuma, 10, false)).toBe(true)
      expect(checkMotionStability(previousLuma, 0, false)).toBe(true)
    })

    it('should return false when motion equals enter threshold (11)', () => {
      expect(checkMotionStability(previousLuma, 11, false)).toBe(false)
    })

    it('should return false when motion exceeds enter threshold (11)', () => {
      expect(checkMotionStability(previousLuma, 12, false)).toBe(false)
      expect(checkMotionStability(previousLuma, 100, false)).toBe(false)
    })
  })

  describe('when previously ready', () => {
    const previousLuma = new Uint8Array([0])

    it('should return true when motion is below exit threshold (15)', () => {
      expect(checkMotionStability(previousLuma, 5, true)).toBe(true)
      expect(checkMotionStability(previousLuma, 14, true)).toBe(true)
    })

    it('should return false when motion equals exit threshold (15)', () => {
      expect(checkMotionStability(previousLuma, 15, true)).toBe(false)
    })

    it('should return false when motion exceeds exit threshold (15)', () => {
      expect(checkMotionStability(previousLuma, 16, true)).toBe(false)
    })
  })

  describe('hysteresis behaviour', () => {
    const previousLuma = new Uint8Array([0])

    it('should apply lower threshold when not ready (11) and higher when ready (15)', () => {
      expect(checkMotionStability(previousLuma, 14, false)).toBe(false)
      expect(checkMotionStability(previousLuma, 14, true)).toBe(true)
    })
  })
})
