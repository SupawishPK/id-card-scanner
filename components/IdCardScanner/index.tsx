'use client'

import { useEffect } from 'react'

import CameraAccessOverlay from './ui/CameraAccessOverlay'
import IdCardScanGuide from './ui/IdCardScanGuide'
import useIdCardScanner from './useIdCardScanner'
import useScreenOrientation from './useScreenOrientation'

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

  const orientationAngle = useScreenOrientation()
  const isUpsideDown = orientationAngle === 180

  useEffect(() => {
    if (cameraErrorType === 'permission-denied') onBack()
  }, [cameraErrorType, onBack])

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

      <header className="relative z-20 flex items-center justify-center bg-black/30 p-5 transition-[padding] duration-300 ease-in-out landscape:p-2">
        <button
          aria-label="ย้อนกลับ"
          className="absolute left-4 grid size-10 place-items-center text-white transition-opacity active:opacity-60"
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
        <h1 className="mb-0 font-graphik-medium text-xl text-white landscape:text-base">ถ่ายรูปบัตรประชาชน</h1>
      </header>

      <IdCardScanGuide
        guideCanvasRef={guideCanvasRef}
        isSuccess={isSuccess}
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
