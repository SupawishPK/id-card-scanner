'use client'

import cn from '@/components/cn'

interface ICameraAccessOverlayProps {
  cameraError?: string
  cameraErrorType?: 'permission-denied' | 'generic'
  cameraState: string
  onRetryCamera: () => void
}

const PrimaryButton = ({ children, onClick }: { children: string; onClick: () => void }) => (
  <button
    className="mt-6 min-h-11 rounded-xl bg-white px-6 py-2.5 font-graphik-medium text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    onClick={onClick}
    type="button"
  >
    {children}
  </button>
)

const CameraAccessOverlay = ({
  cameraState,
  cameraError,
  cameraErrorType,
  onRetryCamera,
}: ICameraAccessOverlayProps) => {
  if (cameraState === 'ready') return null

  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-slate-950 px-8 text-center text-white">
      {cameraState === 'idle' ? (
        <div>
          <div
            aria-hidden
            className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-white/10 text-slate-200"
          >
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
          </div>
          <h2 className="font-graphik-medium text-lg text-white">ขออนุญาตใช้กล้อง</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            เพื่อสแกนบัตรประชาชนให้รวดเร็วและแม่นยำ
            <br />
            ระบบจะไม่จัดเก็บภาพโดยไม่ได้รับอนุญาต
          </p>
          <PrimaryButton onClick={onRetryCamera}>เปิดกล้อง</PrimaryButton>
        </div>
      ) : cameraState === 'error' ? (
        <div>
          <div
            aria-hidden
            className={cn('mx-auto mb-4 grid size-14 place-items-center rounded-full text-2xl', 'bg-rose-500/15')}
          >
            !
          </div>
          <h2 className="font-graphik-medium text-lg text-white">ไม่สามารถเปิดกล้องได้</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">{cameraError}</p>
          {cameraErrorType === 'permission-denied' && (
            <p className="mt-3 text-xs leading-5 text-slate-400">
              กรุณาไปที่
              <span className="font-graphik-medium text-slate-300">ตั้งค่า &gt; ความเป็นส่วนตัว &gt; กล้อง</span>{' '}
              แล้วอนุญาตให้เว็บไซต์นี้เข้าถึงกล้อง จากนั้นกลับมาลองใหม่
            </p>
          )}
          <PrimaryButton onClick={onRetryCamera}>ลองเปิดกล้องอีกครั้ง</PrimaryButton>
        </div>
      ) : (
        <div role="status">
          <div className="mx-auto size-9 animate-spin rounded-full border-2 border-white/25 border-t-white" />
          <p className="mt-4 text-sm text-slate-300">กำลังเปิดกล้อง…</p>
        </div>
      )}
    </div>
  )
}

export default CameraAccessOverlay
