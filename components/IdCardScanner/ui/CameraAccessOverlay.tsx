'use client'

import FullScreenPermission from './FullScreenPermission'

interface ICameraAccessOverlayProps {
  cameraError?: string
  cameraErrorType?: 'permission-denied' | 'generic'
  cameraState: string
  /** Counter-rotation when auto-rotate is locked and the device is physically landscape. */
  lockedRotation: 0 | 90 | -90
  onBack: () => void
  onRetryCamera: () => void
}

const CameraAccessOverlay = ({
  cameraError,
  cameraErrorType,
  cameraState,
  lockedRotation,
  onBack,
  onRetryCamera,
}: ICameraAccessOverlayProps) => {
  if (cameraState === 'ready') return null

  if (cameraState === 'idle') {
    return (
      <FullScreenPermission
        body={
          <>
            เพื่อสแกนบัตรประชาชนให้รวดเร็วและแม่นยำ
            <br />
            ระบบจะไม่จัดเก็บภาพโดยไม่ได้รับอนุญาต
          </>
        }
        icon="camera"
        lockedRotation={lockedRotation}
        onPrimary={onRetryCamera}
        onSecondary={onBack}
        primaryLabel="เปิดกล้อง"
        secondaryLabel="ไม่"
        title="ขออนุญาตใช้กล้อง"
      />
    )
  }

  if (cameraState === 'error') {
    return (
      <FullScreenPermission
        body={
          <>
            {cameraError}
            {cameraErrorType === 'permission-denied' && (
              <span className="mt-2 block text-xs leading-5 text-slate-400">
                กรุณาไปที่{' '}
                <span className="font-graphik-medium text-slate-300">ตั้งค่า &gt; ความเป็นส่วนตัว &gt; กล้อง</span>{' '}
                แล้วอนุญาตให้เว็บไซต์นี้เข้าถึงกล้อง จากนั้นกลับมาลองใหม่
              </span>
            )}
          </>
        }
        icon="alert"
        lockedRotation={lockedRotation}
        onPrimary={onRetryCamera}
        onSecondary={onBack}
        primaryLabel="ลองเปิดกล้องอีกครั้ง"
        secondaryLabel="ไม่"
        title="ไม่สามารถเปิดกล้องได้"
      />
    )
  }

  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-slate-950 px-8 text-center text-white">
      <div role="status" style={{ transform: lockedRotation ? `rotate(${lockedRotation}deg)` : undefined }}>
        <div className="mx-auto size-9 animate-spin rounded-full border-2 border-white/25 border-t-white" />
        <p className="mt-4 text-sm text-slate-300">กำลังเปิดกล้อง…</p>
      </div>
    </div>
  )
}

export default CameraAccessOverlay
