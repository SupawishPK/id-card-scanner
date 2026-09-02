'use client'

import { type RefObject, useEffect, useRef } from 'react'

const MAX_PIXEL_RATIO = 2

interface ICameraPreviewCanvasProps {
  videoRef: RefObject<HTMLVideoElement | null>
}

/**
 * Mirrors the camera feed onto a canvas that is repainted every animation frame.
 * The draw uses the same central-crop math as object-fit: cover, so the field of
 * view matches the video element in every orientation — and because every frame
 * is drawn from the current geometry, viewport rotations never show the stale
 * letterboxed texture that a plain <video> flashes while the browser refits it.
 */
const CameraPreviewCanvas = ({ videoRef }: ICameraPreviewCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    let frameRequest = 0

    const drawFrame = () => {
      const video = videoRef.current
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

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      context.clearRect(0, 0, w, h)

      if (
        video &&
        video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {
        // object-fit: cover equivalent — scale to cover the box, crop centrally
        const scale = Math.max(w / video.videoWidth, h / video.videoHeight)
        const sw = w / scale
        const sh = h / scale
        context.drawImage(video, (video.videoWidth - sw) / 2, (video.videoHeight - sh) / 2, sw, sh, 0, 0, w, h)
      }

      frameRequest = requestAnimationFrame(drawFrame)
    }

    frameRequest = requestAnimationFrame(drawFrame)
    return () => {
      cancelAnimationFrame(frameRequest)
    }
  }, [videoRef])

  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 size-full" />
}

export default CameraPreviewCanvas
