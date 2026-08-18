'use client'

import type { ScreenOrientationMode } from '../useScreenOrientation'

interface IScanFailedModalProps {
  mode: ScreenOrientationMode
  onBack: () => void
  onRetry: () => void
  warningCode?: string
}

const ScanFailedModal = ({ mode, onBack, onRetry, warningCode }: IScanFailedModalProps) => {
  let lockedRotation: 0 | 90 | -90 = 0
  if (mode === 'landscape-left') {
    lockedRotation = 90
  } else if (mode === 'landscape-right') {
    lockedRotation = -90
  }
  const message =
    warningCode === 'RECAPTURE'
      ? 'กรุณาถ่ายรูปบัตรประชาชนใหม่อีกครั้ง'
      : 'กรุณาตรวจสอบว่าบัตรประชาชนอยู่ในกรอบและมีแสงสว่างเพียงพอ'

  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-[rgba(0,0,0,0.429)] px-4">
      <div
        className="w-full max-w-[343px] rounded-[32px] bg-tmn-bg shadow-[0px_2px_12px_rgba(8,8,8,0.18)]"
        style={{ transform: lockedRotation ? `rotate(${lockedRotation}deg)` : undefined }}
      >
        <h2 className="px-4 pb-1 pt-4 text-center font-graphik-medium text-[20px] leading-8 text-[#030303]">
          สแกนไม่สำเร็จ
        </h2>
        <div className="px-4 py-3 text-center text-base leading-6 text-[#454545]">{message}</div>
        <div className="flex flex-col gap-4 px-4 pb-4 pt-3">
          <button
            className="h-12 w-full rounded-full bg-tmn-primary font-graphik-medium text-base leading-6 text-[#FFFCFA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tmn-primary"
            onClick={onRetry}
            type="button"
          >
            สแกนอีกครั้ง
          </button>
          <button
            className="h-12 w-full rounded-full border border-tmn-primary bg-tmn-bg font-graphik-medium text-base leading-6 text-tmn-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tmn-primary"
            onClick={onBack}
            type="button"
          >
            ไม่
          </button>
        </div>
      </div>
    </div>
  )
}

export default ScanFailedModal
