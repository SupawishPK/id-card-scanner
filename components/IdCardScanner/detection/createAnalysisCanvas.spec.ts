import createAnalysisCanvas from './createAnalysisCanvas'

describe('createAnalysisCanvas', () => {
  it('should return an HTMLCanvasElement', () => {
    const canvas = createAnalysisCanvas()
    expect(canvas).toBeInstanceOf(HTMLCanvasElement)
  })

  it('should set canvas width to analysisWidth (151)', () => {
    const canvas = createAnalysisCanvas()
    expect(canvas.width).toBe(151)
  })

  it('should set canvas height to analysisHeight (240)', () => {
    const canvas = createAnalysisCanvas()
    expect(canvas.height).toBe(240)
  })

  it('should return a new canvas each call', () => {
    const a = createAnalysisCanvas()
    const b = createAnalysisCanvas()
    expect(a).not.toBe(b)
  })
})
