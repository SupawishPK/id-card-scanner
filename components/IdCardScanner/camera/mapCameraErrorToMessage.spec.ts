import mapCameraErrorToMessage from './mapCameraErrorToMessage'

describe('mapCameraErrorToMessage', () => {
  describe('DOMException errors', () => {
    it('NotAllowedError → permission message', () => {
      const error = new DOMException('blocked', 'NotAllowedError')
      expect(mapCameraErrorToMessage(error)).toBe('กรุณาอนุญาตให้ใช้งานกล้อง เพื่อสแกนบัตรประชาชน')
    })

    it('PermissionDeniedError → permission message', () => {
      const error = new DOMException('denied', 'PermissionDeniedError')
      expect(mapCameraErrorToMessage(error)).toBe('กรุณาอนุญาตให้ใช้งานกล้อง เพื่อสแกนบัตรประชาชน')
    })

    it('NotFoundError → device not found message', () => {
      const error = new DOMException('missing camera', 'NotFoundError')
      expect(mapCameraErrorToMessage(error)).toBe('ไม่พบกล้องในอุปกรณ์ของคุณ')
    })

    it('DevicesNotFoundError → device not found message', () => {
      const error = new DOMException('no devices', 'DevicesNotFoundError')
      expect(mapCameraErrorToMessage(error)).toBe('ไม่พบกล้องในอุปกรณ์ของคุณ')
    })

    it('NotReadableError → camera in use message', () => {
      const error = new DOMException('busy', 'NotReadableError')
      expect(mapCameraErrorToMessage(error)).toBe('กล้องถูกใช้งานโดยแอปพลิเคชันอื่นอยู่ กรุณาปิดแอปอื่นแล้วลองใหม่')
    })

    it('TrackStartError → camera in use message', () => {
      const error = new DOMException('track start', 'TrackStartError')
      expect(mapCameraErrorToMessage(error)).toBe('กล้องถูกใช้งานโดยแอปพลิเคชันอื่นอยู่ กรุณาปิดแอปอื่นแล้วลองใหม่')
    })

    it('other DOMException names → default message', () => {
      expect(mapCameraErrorToMessage(new DOMException('timeout', 'AbortError'))).toBe(
        'เกิดข้อผิดพลาดในการเปิดกล้อง กรุณาลองใหม่อีกครั้ง',
      )

      expect(mapCameraErrorToMessage(new DOMException('bad', 'OverconstrainedError'))).toBe(
        'เกิดข้อผิดพลาดในการเปิดกล้อง กรุณาลองใหม่อีกครั้ง',
      )

      expect(mapCameraErrorToMessage(new DOMException('unknown', 'TypeError'))).toBe(
        'เกิดข้อผิดพลาดในการเปิดกล้อง กรุณาลองใหม่อีกครั้ง',
      )
    })
  })

  describe('non-DOMException errors', () => {
    it('Error instance → default message', () => {
      expect(mapCameraErrorToMessage(new Error('unknown'))).toBe('เกิดข้อผิดพลาดในการเปิดกล้อง กรุณาลองใหม่อีกครั้ง')
    })

    it('TypeError instance → default message', () => {
      expect(mapCameraErrorToMessage(new TypeError('nope'))).toBe('เกิดข้อผิดพลาดในการเปิดกล้อง กรุณาลองใหม่อีกครั้ง')
    })

    it('string → default message', () => {
      expect(mapCameraErrorToMessage('some string error')).toBe('เกิดข้อผิดพลาดในการเปิดกล้อง กรุณาลองใหม่อีกครั้ง')
    })

    it('null → default message', () => {
      expect(mapCameraErrorToMessage(null)).toBe('เกิดข้อผิดพลาดในการเปิดกล้อง กรุณาลองใหม่อีกครั้ง')
    })

    it('undefined → default message', () => {
      expect(mapCameraErrorToMessage(undefined)).toBe('เกิดข้อผิดพลาดในการเปิดกล้อง กรุณาลองใหม่อีกครั้ง')
    })

    it('number → default message', () => {
      expect(mapCameraErrorToMessage(42)).toBe('เกิดข้อผิดพลาดในการเปิดกล้อง กรุณาลองใหม่อีกครั้ง')
    })
  })
})
