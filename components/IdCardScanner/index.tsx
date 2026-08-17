'use client'

import { useEffect } from 'react'

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
  const isLandscapeLeft = mode === 'landscape-left'
  const isLandscapeRight = mode === 'landscape-right'

  useEffect(() => {
    if (cameraErrorType === 'permission-denied') onBack()
  }, [cameraErrorType, onBack])

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
        className="absolute inset-0 size-full object-cover"
        disablePictureInPicture
        muted
        playsInline
      />

      <div className="pointer-events-none absolute inset-0 bg-black/5" />

      <header
        className={cn(
          'relative z-20 flex items-center justify-center bg-black/30 p-5 transition-[padding] duration-300 ease-in-out',
          isViewportLandscape && 'p-2',
          isLockedLandscape && 'absolute inset-y-0 w-18 p-0',
          isLockedLandscape && isLandscapeLeft && 'right-0',
          isLockedLandscape && isLandscapeRight && 'left-0',
        )}
      >
        <div
          className={cn(
            'flex items-center gap-3 transition-transform duration-300 ease-in-out',
            isLockedLandscape && 'w-[80dvh] justify-center py-4',
            isLockedLandscape && isLandscapeLeft && 'rotate-90',
            isLockedLandscape && isLandscapeRight && '-rotate-90',
          )}
        >
          <button
            aria-label="ย้อนกลับ"
            className={cn(
              'grid size-10 place-items-center text-white transition-opacity active:opacity-60',
              !isLockedLandscape && 'absolute left-4',
            )}
            onClick={onBack}
            type="button"
          >
            <svg
              aria-hidden="true"
              className="size-5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className={cn('mb-0 font-graphik-medium text-xl text-white', isViewportLandscape && 'text-base')}>
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
        verificationWarning={verificationWarning}
      />

      <CameraAccessOverlay
        cameraError={cameraError}
        cameraErrorType={cameraErrorType}
        cameraState={cameraState}
        onRetryCamera={() => void retryCamera()}
      />
    </section>
  )
}

export default IdCardScanner
