import type { ReactNode } from 'react'

import cn from '@/utils/cn'

interface IFullScreenPermissionProps {
  body: ReactNode
  icon: 'alert' | 'camera'
  lockedRotation: 0 | 90 | -90
  onPrimary: () => void
  onSecondary: () => void
  primaryLabel: string
  secondaryLabel: string
  title: string
}

const FullScreenPermission = ({
  body,
  icon,
  lockedRotation,
  onPrimary,
  onSecondary,
  primaryLabel,
  secondaryLabel,
  title,
}: IFullScreenPermissionProps) => (
  <div className="absolute inset-0 z-40 grid place-items-center bg-slate-950 px-8 text-center text-white">
    <div
      className="flex max-w-sm flex-col items-center"
      style={{ transform: lockedRotation ? `rotate(${lockedRotation}deg)` : undefined }}
    >
      <div
        aria-hidden
        className={cn(
          'mx-auto mb-4 grid size-14 place-items-center rounded-full',
          icon === 'alert' ? 'bg-rose-500/15 text-2xl' : 'bg-white/10 text-slate-200',
        )}
      >
        {icon === 'alert' ? (
          '!'
        ) : (
          <svg
            aria-hidden="true"
            className="size-7"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            viewBox="0 0 24 24"
          >
            <path
              d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2l1.5-2.5h8L17.5 7h2A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5v-9Z"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
        )}
      </div>
      <h2 className="font-graphik-medium text-lg text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
      <div className="mt-6 flex gap-4">
        <button
          className="h-12 rounded-full border border-tmn-primary bg-transparent px-8 font-graphik-medium text-base leading-6 text-tmn-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tmn-primary"
          onClick={onSecondary}
          type="button"
        >
          {secondaryLabel}
        </button>
        <button
          className="h-12 rounded-full bg-tmn-primary px-8 font-graphik-medium text-base leading-6 text-[#FFFCFA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tmn-primary"
          onClick={onPrimary}
          type="button"
        >
          {primaryLabel}
        </button>
      </div>
    </div>
  </div>
)

export default FullScreenPermission
