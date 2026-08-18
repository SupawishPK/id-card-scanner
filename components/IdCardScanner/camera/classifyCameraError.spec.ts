import classifyCameraError from './classifyCameraError'

const denialError = (name: string) => new DOMException('blocked', name)

describe('classifyCameraError', () => {
  describe('denial errors', () => {
    it.each(['NotAllowedError', 'PermissionDeniedError'])(
      '%s + state "denied" → permission-denied (user refused before, must use Settings)',
      (name) => {
        expect(classifyCameraError(denialError(name), 'denied')).toBe('permission-denied')
      },
    )

    it.each(['NotAllowedError', 'PermissionDeniedError'])(
      '%s + state "prompt" → not-allowed (prompt never appeared, host app blocks camera)',
      (name) => {
        expect(classifyCameraError(denialError(name), 'prompt')).toBe('not-allowed')
      },
    )

    it('NotAllowedError + state "granted" → generic (unexpected combo)', () => {
      expect(classifyCameraError(denialError('NotAllowedError'), 'granted')).toBe('generic')
    })

    it('NotAllowedError + unsupported query → permission-denied (legacy WebKit fallback)', () => {
      expect(classifyCameraError(denialError('NotAllowedError'), 'unsupported')).toBe('permission-denied')
    })
  })

  describe('device errors', () => {
    it.each(['NotFoundError', 'DevicesNotFoundError'])('%s → no-camera', (name) => {
      expect(classifyCameraError(new DOMException('none', name), 'prompt')).toBe('no-camera')
    })
  })

  describe('other errors', () => {
    it.each(['NotReadableError', 'TrackStartError', 'AbortError', 'OverconstrainedError', 'SecurityError'])(
      '%s → generic',
      (name) => {
        expect(classifyCameraError(new DOMException('x', name), 'prompt')).toBe('generic')
      },
    )

    it('non-DOMException → generic', () => {
      expect(classifyCameraError(new Error('boom'), 'prompt')).toBe('generic')
      expect(classifyCameraError(undefined, 'prompt')).toBe('generic')
      expect(classifyCameraError('some string', 'prompt')).toBe('generic')
    })
  })
})
