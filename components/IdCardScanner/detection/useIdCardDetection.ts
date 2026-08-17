'use client'

import { type RefObject, useCallback, useEffect, useRef } from 'react'

import { expandDetectionRect, mapGuideRectToVideoRect } from '../videoRect'

import createAnalysisCanvas from './createAnalysisCanvas'
import createFrameState from './createFrameState'
import type { IScannerStatus } from './detectIdCard'
import detectIdCard from './detectIdCard'
import ID_CARD_DETECTION_CONFIG from './idCardDetectionConfig'

interface IIdCardDetectionOptions {
  guideRef: RefObject<HTMLCanvasElement | null>
  isEnabled: boolean
  onDetectionUpdate: (status: IScannerStatus) => void
  videoRef: RefObject<HTMLVideoElement | null>
}

const useIdCardDetection = ({ guideRef, isEnabled, videoRef, onDetectionUpdate }: IIdCardDetectionOptions) => {
  const detectionFrameRequestRef = useRef<number | null>(null)
  const lastSampleAtRef = useRef(0)
  const runningRef = useRef(false)
  const frameStateRef = useRef(createFrameState())

  const stopDetection = useCallback(() => {
    runningRef.current = false
    if (detectionFrameRequestRef.current !== null) {
      cancelAnimationFrame(detectionFrameRequestRef.current)
      detectionFrameRequestRef.current = null
    }
  }, [])

  const resetDetection = useCallback(() => {
    stopDetection()
    frameStateRef.current = createFrameState()
  }, [stopDetection])

  const detectFromFrame = useCallback(
    (now: number) => {
      const video = videoRef.current
      const roi = guideRef.current
      const frameState = frameStateRef.current
      if (
        !video ||
        !roi ||
        video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA ||
        !video.videoWidth ||
        !video.videoHeight
      ) {
        return
      }

      /* NOTE: Invalidate ROI if the video resolution changed (e.g. camera retry
       * fell back to a different native resolution).
       */
      if (
        frameState.roiBounds &&
        (frameState.lastVideoWidth !== video.videoWidth || frameState.lastVideoHeight !== video.videoHeight)
      ) {
        frameState.needsRectRecalc = true
      }

      if (!frameState.roiBounds || frameState.needsRectRecalc) {
        const bounds = mapGuideRectToVideoRect(video, roi)
        if (!bounds) return
        frameState.roiBounds = { sx: bounds.x, sy: bounds.y, sw: bounds.width, sh: bounds.height }
        frameState.lastVideoWidth = video.videoWidth
        frameState.lastVideoHeight = video.videoHeight
        frameState.needsRectRecalc = false
      }

      if (!frameState.canvas) {
        frameState.canvas = createAnalysisCanvas()
      }
      const { canvas } = frameState
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) return

      const { roiBounds } = frameState
      const videoBounds = { x: roiBounds.sx, y: roiBounds.sy, width: roiBounds.sw, height: roiBounds.sh }
      const expanded = expandDetectionRect(videoBounds, video.videoWidth, video.videoHeight)

      context.drawImage(
        video,
        expanded.x,
        expanded.y,
        expanded.width,
        expanded.height,
        0,
        0,
        ID_CARD_DETECTION_CONFIG.frame.analysisWidth,
        ID_CARD_DETECTION_CONFIG.frame.analysisHeight,
      )

      const pixels = context.getImageData(
        0,
        0,
        ID_CARD_DETECTION_CONFIG.frame.analysisWidth,
        ID_CARD_DETECTION_CONFIG.frame.analysisHeight,
      ).data

      const { status, changed } = detectIdCard({ frameState, pixels, now })
      if (changed) {
        onDetectionUpdate(status)
      }
    },
    [guideRef, onDetectionUpdate, videoRef],
  )

  useEffect(() => {
    if (!isEnabled) {
      stopDetection()
      return
    }

    if (runningRef.current) return

    runningRef.current = true
    const tick = (now: number) => {
      if (!runningRef.current) {
        detectionFrameRequestRef.current = null
        return
      }

      if (now - lastSampleAtRef.current >= ID_CARD_DETECTION_CONFIG.sampleIntervalMs) {
        lastSampleAtRef.current = now
        detectFromFrame(now)
      }

      detectionFrameRequestRef.current = requestAnimationFrame(tick)
    }

    detectionFrameRequestRef.current = requestAnimationFrame(tick)

    return () => {
      stopDetection()
    }
  }, [isEnabled, detectFromFrame, stopDetection])

  useEffect(() => {
    const onOrientationChange = () => {
      frameStateRef.current.needsRectRecalc = true
    }

    window.addEventListener('resize', onOrientationChange)
    window.addEventListener('orientationchange', onOrientationChange)

    const screenOrientation = typeof screen !== 'undefined' ? screen.orientation : undefined
    screenOrientation?.addEventListener?.('change', onOrientationChange)

    return () => {
      window.removeEventListener('resize', onOrientationChange)
      window.removeEventListener('orientationchange', onOrientationChange)
      screenOrientation?.removeEventListener?.('change', onOrientationChange)
    }
  }, [])

  return {
    resetDetection,
    stopDetection,
    guideBoundsRef: frameStateRef,
  }
}

export default useIdCardDetection
