const mapCameraErrorToMessage = (error: unknown): string => {
  if (!(error instanceof DOMException)) {
    return 'เกิดข้อผิดพลาดในการเปิดกล้อง กรุณาลองใหม่อีกครั้ง'
  }
  switch (error.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'กรุณาอนุญาตให้ใช้งานกล้อง เพื่อสแกนบัตรประชาชน'
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'ไม่พบกล้องในอุปกรณ์ของคุณ'
    case 'NotReadableError':
    case 'TrackStartError':
      return 'กล้องถูกใช้งานโดยแอปพลิเคชันอื่นอยู่ กรุณาปิดแอปอื่นแล้วลองใหม่'
    default:
      return 'เกิดข้อผิดพลาดในการเปิดกล้อง กรุณาลองใหม่อีกครั้ง'
  }
}

export default mapCameraErrorToMessage
