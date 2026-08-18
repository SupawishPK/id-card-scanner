import type { ScreenOrientationMode } from '../useScreenOrientation'

import cn from '@/utils/cn'

interface IIdCardScannerFooterProps {
  isViewportLandscape: boolean
  mode: ScreenOrientationMode
  verificationWarning?: string
}

const IdCardScannerFooter = ({ isViewportLandscape, mode, verificationWarning }: IIdCardScannerFooterProps) => {
  const isLandscape = mode === 'landscape-left' || mode === 'landscape-right'
  const isLandscapeLeft = mode === 'landscape-left'
  const isLandscapeRight = mode === 'landscape-right'
  const isLockedLandscape = isLandscape && !isViewportLandscape

  return (
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
  )
}

export default IdCardScannerFooter
