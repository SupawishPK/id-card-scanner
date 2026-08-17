'use client'

import type { ReactNode } from 'react'

interface ICameraAccessOverlayProps {
  cameraError?: string
  cameraErrorType?: 'permission-denied' | 'generic'
  cameraState: string
  /** Counter-rotation when auto-rotate is locked and the device is physically landscape. */
  lockedRotation: 0 | 90 | -90
  onBack: () => void
  onRetryCamera: () => void
}

interface IPermissionModalProps {
  body: ReactNode
  lockedRotation: 0 | 90 | -90
  onPrimary: () => void
  onSecondary: () => void
  primaryLabel: string
  secondaryLabel: string
  title: string
}

const PermissionModal = ({
  body,
  lockedRotation,
  onPrimary,
  onSecondary,
  primaryLabel,
  secondaryLabel,
  title,
}: IPermissionModalProps) => (
  <div className="absolute inset-0 z-40 grid place-items-center bg-[rgba(0,0,0,0.429)] px-4">
    <div
      className="w-full max-w-[343px] rounded-[32px] bg-[#FDFDFD] shadow-[0px_2px_12px_rgba(8,8,8,0.18)]"
      style={{ transform: lockedRotation ? `rotate(${lockedRotation}deg)` : undefined }}
    >
      <h2 className="px-4 pb-1 pt-4 text-center font-graphik-medium text-[20px] leading-8 text-[#030303]">
        {title}
      </h2>
      <div className="px-4 py-3 text-center text-base leading-6 text-[#454545]">{body}</div>
      <div className="flex gap-4 px-4 pb-4 pt-3">
        <button
          className="h-12 flex-1 rounded-full border border-[#FF5A00] bg-[#FDFDFD] font-graphik-medium text-base leading-6 text-[#FF5A00] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5A00]"
          onClick={onSecondary}
          type="button"
        >
          {secondaryLabel}
        </button>
        <button
          className="h-12 flex-1 rounded-full bg-[#FF5A00] font-graphik-medium text-base leading-6 text-[#FFFCFA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5A00]"
          onClick={onPrimary}
          type="button"
        >
          {primaryLabel}
        </button>
      </div>
    </div>
  </div>
)

const CameraAccessOverlay = ({
  cameraState,
  cameraError,
  cameraErrorType,
  lockedRotation,
  onBack,
  onRetryCamera,
}: ICameraAccessOverlayProps) => {
  if (cameraState === 'ready') return null

  if (cameraState === 'idle') {
    return (
      <PermissionModal
        body={
          <>
            เพื่อสแกนบัตรประชาชนให้รวดเร็วและแม่นยำ
            <br />
            ระบบจะไม่จัดเก็บภาพโดยไม่ได้รับอนุญาต
          </>
        }
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
      <PermissionModal
        body={
          <>
            {cameraError}
            {cameraErrorType === 'permission-denied' && (
              <p className="mt-2 text-sm leading-5">
                กรุณาไปที่{' '}
                <span className="font-graphik-medium">ตั้งค่า &gt; ความเป็นส่วนตัว &gt; กล้อง</span>{' '}
                แล้วอนุญาตให้เว็บไซต์นี้เข้าถึงกล้อง จากนั้นกลับมาลองใหม่
              </p>
            )}
          </>
        }
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
