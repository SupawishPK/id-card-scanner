import type { RefObject } from 'react'

import type { IScannerStatus } from '../detection/detectIdCard'
import { ID_CARD_ASPECT_RATIO } from '../detection/idCardDetectionConfig'

import IdCardGuideCanvas from './IdCardGuideCanvas'
import cn from '@/components/cn'


interface IIdCardScanGuideProps {
  guideCanvasRef: RefObject<HTMLCanvasElement | null>
  isSuccess?: boolean
  scannerStatus: IScannerStatus
  verificationWarning?: string
}

const resolveIndicator = (isSuccess: boolean) => {
  if (isSuccess) {
    return { text: 'สำเร็จ', className: 'bg-emerald-400 animate-pulse' }
  }
  return { text: 'วางบัตรให้ตรงตามกรอบ', className: 'bg-amber-400' }
}

const IdCardScanGuide = ({
  guideCanvasRef,
  isSuccess = false,
  scannerStatus,
  verificationWarning,
}: IIdCardScanGuideProps) => {
  const indicator = resolveIndicator(isSuccess)

  return (
    <div className="relative z-10 flex flex-1 flex-col items-center justify-between">
      {/* Top anchor for justify-between */}
      <div />

      {/* Guide frame — centered between header and footer */}
      <div
        className="relative w-4/5 max-w-sm shrink-0 rounded-2xl transition-[width,height] duration-300 ease-in-out landscape:h-[72dvh] landscape:w-auto landscape:max-w-none"
        style={{ aspectRatio: String(ID_CARD_ASPECT_RATIO) }}
      >
        {/* Status indicator pill — floats above the frame */}
        <div className="pointer-events-none absolute inset-x-0 -top-12 z-20 flex animate-fadeIn justify-center landscape:-top-10">
          <div className="flex max-w-[90%] items-center gap-2 rounded-full border border-white/15 bg-black/75 px-4 py-1.5 text-white shadow-lg backdrop-blur-md transition-all duration-300">
            <span className={cn('size-2 shrink-0 rounded-full', indicator.className)} />
            <span className="font-graphik-medium text-sm leading-none">{indicator.text}</span>
          </div>
        </div>

        <IdCardGuideCanvas canvasRef={guideCanvasRef} isSuccess={isSuccess} scannerStatus={scannerStatus} />
      </div>

      {/* Footer */}
      <div
        className={cn(
          'z-30 w-full p-5 text-center backdrop-blur-sm transition-[padding] duration-300 ease-in-out landscape:p-2',
          verificationWarning ? 'bg-yellow-400 text-dark-2' : 'bg-black/30 text-white',
        )}
      >
        <p className="mb-0 font-graphik-medium text-base leading-relaxed landscape:text-sm">
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
  )
}

export default IdCardScanGuide
