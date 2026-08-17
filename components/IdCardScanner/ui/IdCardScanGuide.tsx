import type { RefObject } from 'react'

import type { IScannerStatus } from '../detection/detectIdCard'
import { ID_CARD_ASPECT_RATIO } from '../detection/idCardDetectionConfig'
import type { ScreenOrientationMode } from '../useScreenOrientation'

import IdCardGuideCanvas from './IdCardGuideCanvas'
import cn from '@/components/cn'


interface IIdCardScanGuideProps {
  guideCanvasRef: RefObject<HTMLCanvasElement | null>
  isSuccess?: boolean
  isViewportLandscape?: boolean
  orientation: ScreenOrientationMode
  scannerStatus: IScannerStatus
  verificationWarning?: string
}

const LANDSCAPE_ASPECT_RATIO = '3 / 2'

const resolveIndicator = (isSuccess: boolean) => {
  if (isSuccess) {
    return { text: 'สำเร็จ', className: 'bg-emerald-400 animate-pulse' }
  }
  return { text: 'วางบัตรให้ตรงตามกรอบ', className: 'bg-amber-400' }
}

const IdCardScanGuide = ({
  guideCanvasRef,
  isSuccess = false,
  isViewportLandscape = false,
  orientation,
  scannerStatus,
  verificationWarning,
}: IIdCardScanGuideProps) => {
  const indicator = resolveIndicator(isSuccess)

  const isLandscape = orientation === 'landscape-left' || orientation === 'landscape-right'
  const isLandscapeLeft = orientation === 'landscape-left'
  const isLandscapeRight = orientation === 'landscape-right'
  // Auto-rotate locked: the viewport stays portrait, so the overlay counter-rotates to appear upright.
  // A 2:3 element rotated ±90° reads as a 3:2 landscape frame to the user.
  const isLockedLandscape = isLandscape && !isViewportLandscape
  const frameRotation = isLockedLandscape ? (isLandscapeLeft ? 90 : -90) : 0

  return (
    <div
      className={cn(
        'relative z-10 flex flex-1 flex-col items-center',
        isLockedLandscape ? 'justify-center' : 'justify-between',
      )}
    >
      {/* Top anchor for justify-between */}
      <div />

      {/* Guide frame — centered between header and footer */}
      <div
        className={cn(
          'relative shrink-0 rounded-2xl transition-[width,height,transform] duration-300 ease-in-out',
          !isLandscape && 'w-4/5 max-w-sm',
          isViewportLandscape && 'h-[72dvh] w-auto max-w-none',
          isLockedLandscape && 'h-[42dvh] w-auto',
        )}
        style={{
          aspectRatio: isViewportLandscape ? LANDSCAPE_ASPECT_RATIO : String(ID_CARD_ASPECT_RATIO),
          transform: `rotate(${frameRotation}deg)`,
        }}
      >
        {/* Status indicator pill — floats above the frame */}
        <div
          className={cn(
            'pointer-events-none absolute inset-x-0 z-20 flex animate-fadeIn justify-center',
            isViewportLandscape ? '-top-10' : '-top-12',
          )}
        >
          <div className="flex max-w-[90%] items-center gap-2 rounded-full border border-white/15 bg-black/75 px-4 py-1.5 text-white shadow-lg backdrop-blur-md transition-all duration-300">
            <span className={cn('size-2 shrink-0 rounded-full', indicator.className)} />
            <span className="font-graphik-medium text-sm leading-none">{indicator.text}</span>
          </div>
        </div>

        <IdCardGuideCanvas
          canvasRef={guideCanvasRef}
          facePosition={isLandscape ? 'bottom-right' : 'bottom-left'}
          isSuccess={isSuccess}
          landscapeAspect={isViewportLandscape}
          scannerStatus={scannerStatus}
        />
      </div>

      {/* Footer */}
      <div
        className={cn(
          'z-30 w-full p-5 text-center backdrop-blur-sm transition-[padding] duration-300 ease-in-out',
          isViewportLandscape && 'p-2',
          verificationWarning ? 'bg-yellow-400 text-dark-2' : 'bg-black/30 text-white',
          isLockedLandscape && 'absolute inset-y-0 flex w-18 items-center justify-center p-0',
          isLockedLandscape && isLandscapeLeft && 'left-0',
          isLockedLandscape && isLandscapeRight && 'right-0',
        )}
      >
        <div
          className={cn(
            'transition-transform duration-300 ease-in-out',
            isLockedLandscape && 'py-3',
            isLockedLandscape && isLandscapeLeft && 'rotate-90',
            isLockedLandscape && isLandscapeRight && '-rotate-90',
          )}
        >
          <p className={cn('mb-0 font-graphik-medium leading-relaxed', isViewportLandscape ? 'text-sm' : 'text-base')}>
            {verificationWarning ?? (
              <>
                กรุณาวางบัตรในกรอบให้เห็นข้อมูลชัดเจน
                <br />
                เราจะสแกนให้อัตโนมัติ
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

export default IdCardScanGuide
