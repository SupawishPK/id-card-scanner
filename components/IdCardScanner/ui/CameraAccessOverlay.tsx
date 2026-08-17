'use client'

import type { ReactNode } from 'react'

import cn from '@/components/cn'

interface ICameraAccessOverlayProps {
  cameraError?: string
  cameraErrorType?: 'permission-denied' | 'generic'
  cameraState: string
  /** Counter-rotation when auto-rotate is locked and the device is physically landscape. */
  lockedRotation: 0 | 90 | -90
  onBack: () => void
  onRetryCamera: () => void
}

interface IFullScreenPermissionProps {
  body: ReactNode
  icon: 'camera' | 'alert'
  lockedRotation: 0 | 90 | -90
  onPrimary: () => void
  onSecondary: () => void
  primaryLabel: string
  secondaryLabel: string
  title: string
}

const CameraIcon = () => (
  <svg
    aria-hidden="true"
    className="size-7"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    viewBox="0 0 24 24"
  >
    <path
      d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2l1.5-2.5h8L17.5 7h2A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-9Z"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
)

const FullScreenPermission = ({
  body,
  icon,
  lockedRotation,
  onPrimary,
  onSecondary,
  primaryLabel,
  secondaryLabel,
  title,
}: IFullScreenPermissionProps) => (
  <div className="absolute inset-0 z-40 grid place-items-center bg-slate-950 px-8 text-center text-white">
    <div
      className="flex max-w-sm flex-col items-center"
      style={{ transform: lockedRotation ? `rotate(${lockedRotation}deg)` : undefined }}
    >
      <div
        aria-hidden
        className={cn(
          'mx-auto mb-4 grid size-14 place-items-center rounded-full',
          icon === 'alert' ? 'bg-rose-500/15 text-2xl' : 'bg-white/10 text-slate-200',
        )}
      >
        {icon === 'alert' ? '!' : <CameraIcon />}
      </div>
      <h2 className="font-graphik-medium text-lg text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
      <div className="mt-6 flex gap-4">
        <button
          className="h-12 rounded-full border border-[#FF5A00] bg-transparent px-8 font-graphik-medium text-base leading-6 text-[#FF5A00] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5A00]"
          onClick={onSecondary}
          type="button"
        >
          {secondaryLabel}
        </button>
        <button
          className="h-12 rounded-full bg-[#FF5A00] px-8 font-graphik-medium text-base leading-6 text-[#FFFCFA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5A00]"
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
