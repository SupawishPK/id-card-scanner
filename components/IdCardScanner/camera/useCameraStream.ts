'use client'

import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'

import classifyCameraError, { type ICameraErrorType } from './classifyCameraError'
import mapCameraErrorToMessage from './mapCameraErrorToMessage'
import queryCameraPermissionState from './queryCameraPermissionState'
import readCameraDiagnostics, { type ICameraDiagnostics } from './readCameraDiagnostics'
import requestRearCameraStream, { applyAutofocus, applySingleShotFocus } from './requestRearCameraStream'

type ICameraAccessState = 'idle' | 'requesting' | 'ready' | 'error'

const useCameraStream = (videoRef: RefObject<HTMLVideoElement | null>) => {
  const [cameraState, setCameraState] = useState<ICameraAccessState>('idle')
  const [cameraError, setCameraError] = useState<string>()
  const [cameraErrorType, setCameraErrorType] = useState<ICameraErrorType>()
  const [cameraDiagnostics, setCameraDiagnostics] = useState<ICameraDiagnostics | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const cameraRequestIdRef = useRef(0)

  const stopCamera = useCallback(() => {
    cameraRequestIdRef.current += 1
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [videoRef])

  const focusCamera = useCallback(() => {
    void applySingleShotFocus(streamRef.current)
    window.setTimeout(() => void applyAutofocus(streamRef.current), 900)
  }, [])

  const startCamera = useCallback(async () => {
    stopCamera()
    const requestId = cameraRequestIdRef.current
    setCameraState('requesting')

    try {
      const stream = await requestRearCameraStream()
      if (requestId !== cameraRequestIdRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      streamRef.current = stream
      const video = videoRef.current
      if (!video) {
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        setCameraError('เกิดข้อผิดพลาดในการเปิดกล้อง กรุณาลองใหม่อีกครั้ง')
        setCameraState('error')
        return
      }

      video.muted = true
      video.playsInline = true
      video.srcObject = stream
      await video.play()

      if (requestId !== cameraRequestIdRef.current) return

      // Autofocus must be (re)applied after the stream is live — Android WebView
      // ignores focusMode set before the first frames render, leaving the feed soft.
      void applyAutofocus(stream)

      setCameraDiagnostics(readCameraDiagnostics(stream))
      setCameraState('ready')
    } catch (error) {
      if (requestId !== cameraRequestIdRef.current) return

      if (error instanceof TypeError) {
        stopCamera()
        setCameraError('เบราว์เซอร์นี้ไม่รองรับ Camera API กรุณาใช้ Safari หรือ Chrome รุ่นล่าสุด')
        setCameraErrorType('generic')
      } else {
        // Query the permission state AFTER the failure — WebKit only settles it
        // once the first getUserMedia request has been made. A NotAllowedError
        // while still 'prompt' means the prompt never appeared (host app does
        // not allow camera); 'denied' means the user refused it before.
        const permissionState = await queryCameraPermissionState()
        if (requestId !== cameraRequestIdRef.current) return
        stopCamera()
        setCameraError(mapCameraErrorToMessage(error))
        setCameraErrorType(classifyCameraError(error, permissionState))
      }
      setCameraState('error')
    }
  }, [stopCamera, videoRef])

  useEffect(() => {
    const visibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      const video = videoRef.current
      if (video && video.paused && streamRef.current?.active) {
        void video.play().catch(() => void startCamera())
      }
    }

    document.addEventListener('visibilitychange', visibilityChange)
    // Camera is started on user request only — the overlay shows an intro screen first
    // so the native permission prompt appears in a proper user-gesture context.

    return () => {
      document.removeEventListener('visibilitychange', visibilityChange)
      stopCamera()
    }
  }, [startCamera, stopCamera, videoRef])

  return {
    cameraDiagnostics,
    cameraError,
    cameraErrorType,
    cameraState,
    focusCamera,
    retryCamera: startCamera,
  }
}

export default useCameraStream
