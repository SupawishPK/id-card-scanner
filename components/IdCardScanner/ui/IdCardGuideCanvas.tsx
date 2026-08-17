'use client'

import { memo, type RefObject, useEffect } from 'react'

const PORTRAIT_VIEWBOX = { w: 200, h: 321 } as const

const FRAME_PATHS = [
  'M196.5957 315.905C196.5957 316.839 195.8298 317.603 194.8936 317.603L5.106 317.603C4.17 317.603 3.404 316.839 3.404 315.905L3.404 5.0952C3.404 4.1611 4.17 3.3968 5.106 3.3968L194.8936 3.3968C195.8298 3.3968 196.5957 4.1611 196.5957 5.0952L196.5957 315.905ZM200 315.905L200 5.0952C200 2.2844 197.7106 0 194.8936 0L5.106 0C2.289 0 0 2.2844 0 5.0952L0 315.905C0 318.716 2.289 321 5.106 321L194.8936 321C197.7106 321 200 318.716 200 315.905Z',
  'M94.162 275.763C94.162 285.724 86.043 293.825 76.06 293.825C66.077 293.825 57.957 285.724 57.957 275.763C57.957 265.802 66.077 257.7 76.06 257.7C86.043 257.7 94.162 265.802 94.162 275.763ZM97.566 275.763C97.566 263.908 87.94 254.303 76.06 254.303C64.179 254.303 54.553 263.908 54.553 275.763C54.553 287.618 64.179 297.222 76.06 297.222C87.94 297.222 97.566 287.618 97.566 275.763Z',
  'M56.255 275.763C56.255 294.248 41.67 309.484 22.548 313.115C21.624 313.29 20.734 312.685 20.558 311.764C20.382 310.843 20.988 309.953 21.912 309.778C39.726 306.395 52.851 292.333 52.851 275.763C52.851 259.191 39.824 245.229 22.108 241.78C21.186 241.6 20.583 240.709 20.763 239.788C20.943 238.867 21.837 238.267 22.76 238.446C41.776 242.148 56.255 257.28 56.255 275.763Z',
  'M102.9702 308.219C102.9702 309.154 102.2042 309.918 101.2681 309.918L22.877 309.918C21.94 309.918 21.174 309.154 21.174 308.219L21.174 243.298C21.174 242.363 21.94 241.599 22.877 241.599L101.2681 241.599C102.2043 241.599 102.9702 242.363 102.9702 243.298L102.9702 308.219ZM106.3745 308.219L106.3745 243.298C106.3745 240.487 104.0851 238.202 101.2681 238.202L22.877 238.202C20.06 238.202 17.77 240.487 17.77 243.298L17.77 308.219C17.77 311.03 20.06 313.315 22.877 313.315L106.3745 313.315Z',
] as const

const OUTER_BORDER_PATH_DATA =
  'M 196.6 5 L 196.6 315.9 A 1.7 1.7 0 0 1 194.9 317.6 L 5.1 317.6 A 1.7 1.7 0 0 1 3.4 315.9 L 3.4 5 A 1.7 1.7 0 0 1 5.1 3.4 L 194.9 3.4 A 1.7 1.7 0 0 1 196.6 5 Z'

const STROKE_PADDING_RATIO = 0.03
const MAX_PIXEL_RATIO = 3

let cachedCompiledPaths: Path2D[] | null = null
let cachedOuterPath: Path2D | null = null

const getCompiledFramePaths = (): Path2D[] => {
  if (!cachedCompiledPaths) {
    if (typeof Path2D !== 'undefined') {
      cachedCompiledPaths = FRAME_PATHS.map((pathData) => new Path2D(pathData))
    } else {
      return []
    }
  }
  return cachedCompiledPaths
}

const getCompiledOuterPath = (): Path2D | null => {
  if (!cachedOuterPath && typeof Path2D !== 'undefined') {
    cachedOuterPath = new Path2D(OUTER_BORDER_PATH_DATA)
  }
  return cachedOuterPath
}

const STATUS_COLORS = {
  default: { fill: 'rgba(255, 255, 255, 0.8)', stroke: 'rgba(255, 255, 255, 0.8)' },
  error: { fill: 'rgba(239, 68, 68, 1)', stroke: 'rgba(239, 68, 68, 1)' },
  success: { fill: 'rgba(16, 185, 129, 1)', stroke: 'rgba(16, 185, 129, 1)' },
} as const

const resolveGuideColors = (scannerStatus: string, isSuccess: boolean): { fill: string; stroke: string } => {
  if (isSuccess) return STATUS_COLORS.success
  if (scannerStatus !== 'searching') return STATUS_COLORS.error
  return STATUS_COLORS.default
}

interface IIdCardGuideCanvasProps {
  canvasRef: RefObject<HTMLCanvasElement | null>
  isSuccess?: boolean
  scannerStatus: string
}

const IdCardGuideCanvas = memo(({ canvasRef, isSuccess = false, scannerStatus }: IIdCardGuideCanvasProps) => {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const compiledPaths = getCompiledFramePaths()
    const outerPath = getCompiledOuterPath()

    const drawGuide = () => {
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (!w || !h) return

      const pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO)
      const cw = Math.round(w * pixelRatio)
      const ch = Math.round(h * pixelRatio)
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw
        canvas.height = ch
      }

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const padding = Math.min(w, h) * STROKE_PADDING_RATIO
      const availW = w - padding * 2
      const availH = h - padding * 2

      const scale = Math.min(availW / PORTRAIT_VIEWBOX.w, availH / PORTRAIT_VIEWBOX.h)
      const ox = (w - PORTRAIT_VIEWBOX.w * scale) / 2
      const oy = (h - PORTRAIT_VIEWBOX.h * scale) / 2

      ctx.save()

      ctx.translate(ox, oy)
      ctx.scale(scale, scale)

      const colors = resolveGuideColors(scannerStatus, isSuccess)

      ctx.fillStyle = colors.fill
      for (const path of compiledPaths) {
        ctx.fill(path)
      }

      if (outerPath) {
        ctx.strokeStyle = colors.stroke
        ctx.lineWidth = Math.max(2, 400 / w)
        ctx.lineCap = 'round'
        ctx.shadowBlur = 0
        ctx.stroke(outerPath)
      }

      ctx.restore()
    }

    drawGuide()

    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(drawGuide)
      resizeObserver.observe(canvas)
      return () => {
        resizeObserver.disconnect()
      }
    }
  }, [canvasRef, isSuccess, scannerStatus])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full rounded-xl bg-transparent"
    />
  )
})

export default IdCardGuideCanvas
