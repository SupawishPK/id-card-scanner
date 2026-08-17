'use client'

import { useEffect } from 'react'

import CameraAccessOverlay from './ui/CameraAccessOverlay'
import IdCardScanGuide from './ui/IdCardScanGuide'
import ScanFailedModal from './ui/ScanFailedModal'
import useIdCardScanner from './useIdCardScanner'
import useScreenOrientation from './useScreenOrientation'
import type { IExportRotation } from './videoRect'
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
  const { mode, isViewportLandscape, isLockedLandscape, isTransitioning, isViewportUpsideDown } = useScreenOrientation()
  const isPhysicallyUpsideDown = mode === 'upside-down'
  // Skip the section flip when the OS already rotated the layout 180° (auto-rotate ON).
  const isUpsideDown = isPhysicallyUpsideDown && !isViewportUpsideDown
  const isLandscape = mode === 'landscape-left' || mode === 'landscape-right'
  const isLandscapeLeft = mode === 'landscape-left'
  const isLandscapeRight = mode === 'landscape-right'
  const lockedRotation = isLockedLandscape ? (isLandscapeLeft ? 90 : -90) : 0
  // Raw video pixels do not follow the UI's rotation — the export must undo each mode's
  // on-screen rotation so the JPEG always reads as an upright portrait card.
  const captureRotation: IExportRotation = isPhysicallyUpsideDown
    ? 180
    : isViewportLandscape
      ? 0
      : isLockedLandscape
        ? (isLandscapeLeft ? 270 : 90)
        : 270

  const {
    scanState,
    cameraState,
    cameraError,
    cameraErrorType,
    videoRef,
    guideCanvasRef,
    retryCamera,
    retryScan,
    scannerStatus,
  } = useIdCardScanner({
    captureRotation,
    onScanSuccess: onSuccess,
    verifyIdCardImage: async (image: string) => {
      const result = await onVerify(image)
      return result.success ? { success: true } : result
    },
  })

  const isSuccess = scanState.phase === 'success'
  const verificationWarning = scanState.phase === 'warning' ? scanState.message : undefined
  const verificationFailed = scanState.phase === 'failed' ? scanState.errorMessage : undefined

  // Overlay layout changed without a viewport resize (locked-landscape counter-rotation) —
  // nudge listeners that cache frame geometry (e.g. detection ROI) to recompute.
  // Delayed past the 300ms frame/header transitions so the cached rect is the settled one.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      window.dispatchEvent(new Event('resize'))
    }, 350)
    return () => {
      window.clearTimeout(timer)
    }
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
          isTransitioning && 'opacity-0',
        )}
        disablePictureInPicture
        muted
        playsInline
      />

      <div className="pointer-events-none absolute inset-0 bg-black/5" />

      {/* Rotation transition veil — mounted early from the sensor so the video texture
          refit during the viewport swap is never visible (no opacity transitions:
          Safari's backdrop-filter breaks inside opacity animations) */}
      {isTransitioning && (
        <div className="pointer-events-none absolute inset-0 z-[35] grid place-items-center bg-[rgba(41,41,58,0.23)] backdrop-blur-md">
          <div role="status">
            <div className="mx-auto size-10 animate-spin rounded-full border-2 border-white/25 border-t-white" />
            <p className="mt-3 text-sm text-white">กำลังปรับมุมมอง…</p>
          </div>
        </div>
      )}

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
            'flex shrink-0 items-center gap-3 transition-transform duration-300 ease-in-out',
            isViewportLandscape && 'pl-3',
            isLockedLandscape && 'w-dvh justify-start py-3 pl-3',
            isLockedLandscape && isLandscapeLeft && 'rotate-90',
            isLockedLandscape && isLandscapeRight && '-rotate-90',
          )}
        >
          <button
            aria-label="ย้อนกลับ"
            className={cn(
              'grid shrink-0 place-items-center text-white transition-opacity active:opacity-60',
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
              'mb-0 whitespace-nowrap font-graphik-medium text-white',
              isLandscape && 'flex-1 text-center',
              isLandscape ? 'text-base' : 'text-xl',
            )}
          >
            สแกนบัตรประชาชน
          </h1>
          {/* Balances the 44px back-button area so the title stays truly centered */}
          {isLandscape && <div aria-hidden className="w-11 shrink-0" />}
        </div>
      </header>

      <IdCardScanGuide
        guideCanvasRef={guideCanvasRef}
        isSuccess={isSuccess}
        isTransitioning={isTransitioning}
        isViewportLandscape={isViewportLandscape}
        orientation={mode}
        scannerStatus={scannerStatus}
      />

      {/* Footer */}
      <div
        className={cn(
          'z-30 w-full p-5 text-center backdrop-blur-sm transition-[padding] duration-300 ease-in-out',
          isViewportLandscape && 'flex h-14 items-center justify-center p-0',
          isLockedLandscape && 'absolute inset-y-0 flex w-14 items-center justify-center p-0',
          isLockedLandscape && isLandscapeLeft && 'left-0',
          isLockedLandscape && isLandscapeRight && 'right-0',
          verificationWarning ? 'bg-[#FFEA66] text-[#080808]' : 'bg-black/30 text-white',
          !verificationWarning && isLandscape && 'bg-[rgba(8,8,8,0.46)]',
        )}
      >
        <div
          className={cn(
            'transition-transform duration-300 ease-in-out',
            isLockedLandscape && 'py-4',
            isLockedLandscape && isLandscapeLeft && 'rotate-90',
            isLockedLandscape && isLandscapeRight && '-rotate-90',
          )}
        >
          <p className="mb-0 font-graphik-medium text-base leading-relaxed">
            {verificationWarning ?? 'วางบัตรในกรอบเลย เราจะสแกนให้อัตโนมัติ'}
          </p>
        </div>
      </div>

      {verificationFailed && (
        <ScanFailedModal
          lockedRotation={lockedRotation}
          message={verificationFailed}
          onBack={onBack}
          onRetry={retryScan}
        />
      )}

      <CameraAccessOverlay
        cameraError={cameraError}
        cameraErrorType={cameraErrorType}
        cameraState={cameraState}
        lockedRotation={lockedRotation}
        onBack={onBack}
        onRetryCamera={() => void retryCamera()}
      />
    </section>
  )
}

export default IdCardScanner
