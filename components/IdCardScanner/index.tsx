'use client'

import { useEffect, useState } from 'react'

import CameraAccessOverlay from './ui/CameraAccessOverlay'
import IdCardScanGuide from './ui/IdCardScanGuide'
import useIdCardScanner from './useIdCardScanner'
import useScreenOrientation from './useScreenOrientation'
import cn from '@/components/cn'

export type IVerifyResult =
  | { success: true }
  | { message: string; success: false; type: 'warning' }

interface IIdCardScannerProps {
  onBack: () => void
  onSuccess: () => void
  onVerify: (capturedImage: string) => Promise<IVerifyResult>
}

const IdCardScanner = ({ onBack, onSuccess, onVerify }: IIdCardScannerProps) => {
  const { scanState, cameraState, cameraError, cameraErrorType, videoRef, guideCanvasRef, retryCamera, scannerStatus } =
    useIdCardScanner({
      onScanSuccess: onSuccess,
      verifyIdCardImage: async (image: string) => {
        const result = await onVerify(image)
        return result.success ? { success: true } : result
      },
    })

  const isSuccess = scanState.phase === 'success'
  const verificationWarning = scanState.phase === 'warning' ? scanState.message : undefined

  const { mode, isViewportLandscape, isLockedLandscape } = useScreenOrientation()
  const isUpsideDown = mode === 'upside-down'
  const isLandscape = mode === 'landscape-left' || mode === 'landscape-right'
  const isLandscapeLeft = mode === 'landscape-left'
  const isLandscapeRight = mode === 'landscape-right'

  // Briefly veil the screen while the viewport rotates — the video texture refits to the new
  // element size asynchronously, so without this the old frame shows letterboxed for a moment.
  const [isScreenTransitioning, setIsScreenTransitioning] = useState(false)
  useEffect(() => {
    let hideTimer: number | undefined
    const onLayoutChange = () => {
      setIsScreenTransitioning(true)
      window.clearTimeout(hideTimer)
      hideTimer = window.setTimeout(() => setIsScreenTransitioning(false), 450)
    }
    window.addEventListener('orientationchange', onLayoutChange)
    window.addEventListener('resize', onLayoutChange)
    return () => {
      window.clearTimeout(hideTimer)
      window.removeEventListener('orientationchange', onLayoutChange)
      window.removeEventListener('resize', onLayoutChange)
    }
  }, [])

  // Overlay layout changed without a viewport resize (locked-landscape counter-rotation) —
  // nudge listeners that cache frame geometry (e.g. detection ROI) to recompute.
  useEffect(() => {
    window.dispatchEvent(new Event('resize'))
  }, [mode])

  return (
    <section
      className="relative isolate flex h-dvh w-full flex-col overflow-hidden bg-black"
      style={isUpsideDown ? { transform: 'rotate(180deg)' } : undefined}
    >
      <video
        ref={videoRef}
        aria-label="video feed from camera"
        autoPlay
        className={cn(
          'absolute inset-0 size-full object-cover transition-opacity duration-200',
          isScreenTransitioning && 'opacity-0',
        )}
        disablePictureInPicture
        muted
        playsInline
      />

      <div className="pointer-events-none absolute inset-0 bg-black/5" />

      {/* Rotation transition veil — blurred loading screen masks the video texture refit */}
      <div
        className={cn(
          'pointer-events-none absolute inset-0 z-[35] grid place-items-center bg-[rgba(41,41,58,0.23)] backdrop-blur-md',
          isScreenTransitioning
            ? 'opacity-100 transition-opacity duration-150'
            : 'opacity-0 transition-opacity duration-300',
        )}
      >
        <div role="status">
          <div className="mx-auto size-10 animate-spin rounded-full border-2 border-white/25 border-t-white" />
          <p className="mt-3 text-sm text-white/80">กำลังปรับมุมมอง…</p>
        </div>
      </div>

      <header
        className={cn(
          'relative z-20 flex items-center justify-center bg-black/30 p-5 transition-[padding] duration-300 ease-in-out',
          isViewportLandscape && 'h-14 p-0 bg-[rgba(8,8,8,0.46)]',
          isLockedLandscape && 'absolute inset-y-0 w-14 p-0 bg-[rgba(8,8,8,0.46)]',
          isLockedLandscape && isLandscapeLeft && 'right-0',
          isLockedLandscape && isLandscapeRight && 'left-0',
        )}
      >
        <div
          className={cn(
            'flex items-center gap-3 transition-transform duration-300 ease-in-out',
            isLockedLandscape && 'w-dvh justify-center py-3',
            isLockedLandscape && isLandscapeLeft && 'rotate-90',
            isLockedLandscape && isLandscapeRight && '-rotate-90',
          )}
        >
          <button
            aria-label="ย้อนกลับ"
            className={cn(
              'grid place-items-center text-white transition-opacity active:opacity-60',
              isLandscape ? 'size-8' : 'absolute left-4 size-10',
            )}
            onClick={onBack}
            type="button"
          >
            <svg
              aria-hidden="true"
              className={isLandscape ? 'size-6' : 'size-5'}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1
            className={cn(
              'mb-0 font-graphik-medium text-white',
              isViewportLandscape && 'flex-1 text-center',
              isLandscape ? 'text-base' : 'text-xl',
            )}
          >
            สแกนบัตรประชาชน
          </h1>
        </div>
      </header>

      <IdCardScanGuide
        guideCanvasRef={guideCanvasRef}
        isSuccess={isSuccess}
        isViewportLandscape={isViewportLandscape}
        orientation={mode}
        scannerStatus={scannerStatus}
      />

      {/* Footer */}
      <div
        className={cn(
          'z-30 w-full p-5 text-center backdrop-blur-sm transition-[padding] duration-300 ease-in-out',
          isViewportLandscape && 'flex h-10 items-center justify-center p-0',
          isLockedLandscape && 'absolute inset-y-0 flex w-10 items-center justify-center p-0',
          isLockedLandscape && isLandscapeLeft && 'left-0',
          isLockedLandscape && isLandscapeRight && 'right-0',
          verificationWarning ? 'bg-yellow-400 text-dark-2' : 'bg-black/30 text-white',
          !verificationWarning && isLandscape && 'bg-[rgba(8,8,8,0.46)]',
        )}
      >
        <div
          className={cn(
            'transition-transform duration-300 ease-in-out',
            isLockedLandscape && 'py-2',
            isLockedLandscape && isLandscapeLeft && 'rotate-90',
            isLockedLandscape && isLandscapeRight && '-rotate-90',
          )}
        >
          <p className="mb-0 font-graphik-medium text-base leading-relaxed">
            {verificationWarning ?? 'วางบัตรในกรอบเลย เราจะสแกนให้อัตโนมัติ'}
          </p>
        </div>
      </div>

      <CameraAccessOverlay
        cameraError={cameraError}
        cameraErrorType={cameraErrorType}
        cameraState={cameraState}
        onBack={onBack}
        onRetryCamera={() => void retryCamera()}
      />
    </section>
  )
}

export default IdCardScanner
