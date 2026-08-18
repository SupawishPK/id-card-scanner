import type { ScreenOrientationMode } from '../useScreenOrientation'

import cn from '@/utils/cn'

interface IIdCardScannerHeaderProps {
  isViewportLandscape: boolean
  mode: ScreenOrientationMode
  onBack: () => void
}

const IdCardScannerHeader = ({ isViewportLandscape, mode, onBack }: IIdCardScannerHeaderProps) => {
  const isLandscape = mode === 'landscape-left' || mode === 'landscape-right'
  const isLandscapeLeft = mode === 'landscape-left'
  const isLandscapeRight = mode === 'landscape-right'
  const isLockedLandscape = isLandscape && !isViewportLandscape

  return (
    <header
      className={cn(
        'relative z-20 flex items-center justify-center bg-black/30 p-5 transition-[padding] duration-300 ease-in-out',
        isViewportLandscape && 'h-14 bg-[rgba(8,8,8,0.46)] p-0',
        isLockedLandscape && 'absolute inset-y-0 w-14 bg-[rgba(8,8,8,0.46)] p-0',
        isLockedLandscape && isLandscapeLeft && 'right-0',
        isLockedLandscape && isLandscapeRight && 'left-0',
      )}
    >
      <div
        className={cn(
          'flex shrink-0 items-center gap-3 transition-transform duration-300 ease-in-out',
          isViewportLandscape && 'w-full pl-3',
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
        {isLandscape && <div aria-hidden className="w-11 shrink-0" />}
      </div>
    </header>
  )
}

export default IdCardScannerHeader
