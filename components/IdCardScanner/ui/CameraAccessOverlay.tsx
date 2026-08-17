'use client'

interface ICameraAccessOverlayProps {
  cameraError?: string
  cameraErrorType?: 'permission-denied' | 'generic'
  cameraState: string
  onRetryCamera: () => void
}

const CameraAccessOverlay = ({
  cameraState,
  cameraError,
  cameraErrorType,
  onRetryCamera,
}: ICameraAccessOverlayProps) => {
  if (cameraState === 'ready') return null

  return (
    <div className="absolute inset-0 z-20 grid place-items-center bg-slate-950 px-8 text-center text-white">
      {cameraState === 'error' ? (
        <div>
          <div
            aria-hidden
            className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-rose-500/15 text-2xl"
          >
            !
          </div>
          <h2 className="font-graphik-medium text-lg text-white">ไม่สามารถเปิดกล้องได้</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">{cameraError}</p>
          {cameraErrorType === 'permission-denied' ? (
            <p className="mt-3 text-xs leading-5 text-slate-400">
              กรุณาไปที่
              <span className="font-graphik-medium text-slate-300">ตั้งค่า &gt; ความเป็นส่วนตัว &gt; กล้อง</span>{' '}
              แล้วอนุญาตให้เว็บไซต์นี้เข้าถึงกล้อง จากนั้นกลับมาลองใหม่
            </p>
          ) : (
            <button
              className="mt-6 min-h-11 rounded-xl bg-white px-6 py-2.5 font-graphik-medium text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              onClick={onRetryCamera}
              type="button"
            >
              ลองเปิดกล้องอีกครั้ง
            </button>
          )}
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
