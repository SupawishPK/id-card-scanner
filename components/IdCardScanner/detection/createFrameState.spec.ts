import createFrameState, { createReadinessState } from './createFrameState'

describe('createReadinessState', () => {
  it('should return initial readiness with all fields at default values', () => {
    const state = createReadinessState()
    expect(state).toEqual({
      stableSince: null,
      stableFrames: 0,
      acquireMisses: 0,
      readyMisses: 0,
      isReady: false,
    })
  })

  it('should return a new object each call', () => {
    const a = createReadinessState()
    const b = createReadinessState()
    expect(a).not.toBe(b)
  })
})

describe('createFrameState', () => {
  const ANALYSIS_WIDTH = 151
  const ANALYSIS_HEIGHT = 240
  const PIXEL_COUNT = ANALYSIS_WIDTH * ANALYSIS_HEIGHT

  it('should return canvas as null', () => {
    const state = createFrameState()
    expect(state.canvas).toBeNull()
  })

  it('should initialise currentLuma as a Uint8Array with the correct length', () => {
    const state = createFrameState()
    expect(state.currentLuma).toBeInstanceOf(Uint8Array)
    expect(state.currentLuma.length).toBe(PIXEL_COUNT)
  })

  it('should initialise currentLuma with all zero values', () => {
    const state = createFrameState()
    for (const val of state.currentLuma) {
      expect(val).toBe(0)
    }
  })

  it('should set hasDetectedCard to false', () => {
    const state = createFrameState()
    expect(state.hasDetectedCard).toBe(false)
  })

  it('should set isCaptureAligned to false', () => {
    const state = createFrameState()
    expect(state.isCaptureAligned).toBe(false)
  })

  it('should set lastReportedStatus to null', () => {
    const state = createFrameState()
    expect(state.lastReportedStatus).toBeNull()
  })

  it('should set lastVideoWidth and lastVideoHeight to 0', () => {
    const state = createFrameState()
    expect(state.lastVideoWidth).toBe(0)
    expect(state.lastVideoHeight).toBe(0)
  })

  it('should set needsRectRecalc to true', () => {
    const state = createFrameState()
    expect(state.needsRectRecalc).toBe(true)
  })

  it('should set previousLuma to null', () => {
    const state = createFrameState()
    expect(state.previousLuma).toBeNull()
  })

  it('should set roiBounds to null', () => {
    const state = createFrameState()
    expect(state.roiBounds).toBeNull()
  })

  it('should initialise readiness with createReadinessState defaults', () => {
    const state = createFrameState()
    expect(state.readiness).toEqual(createReadinessState())
  })

  it('should return distinct objects on each call', () => {
    const a = createFrameState()
    const b = createFrameState()
    expect(a).not.toBe(b)
    expect(a.currentLuma).not.toBe(b.currentLuma)
    expect(a.readiness).not.toBe(b.readiness)
  })
})
