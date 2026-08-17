'use client'

import { type RefObject, useCallback, useEffect, useRef, useState } from 'react'

import mapCameraErrorToMessage from './mapCameraErrorToMessage'
import requestRearCameraStream from './requestRearCameraStream'

type ICameraAccessState = 'idle' | 'requesting' | 'ready' | 'error'
type ICameraErrorType = 'permission-denied' | 'generic'

const useCameraStream = (videoRef: RefObject<HTMLVideoElement | null>) => {
  const [cameraState, setCameraState] = useState<ICameraAccessState>('idle')
  const [cameraError, setCameraError] = useState<string>()
  const [cameraErrorType, setCameraErrorType] = useState<ICameraErrorType>()
  const streamRef = useRef<MediaStream | null>(null)
  const cameraRequestIdRef = useRef(0)

  const stopCamera = useCallback(() => {
    cameraRequestIdRef.current += 1
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [videoRef])

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

      setCameraState('ready')
    } catch (error) {
      if (requestId !== cameraRequestIdRef.current) return

      stopCamera()
      if (error instanceof TypeError) {
        setCameraError('เบราว์เซอร์นี้ไม่รองรับ Camera API กรุณาใช้ Safari หรือ Chrome รุ่นล่าสุด')
        setCameraErrorType('generic')
      } else if (
        error instanceof DOMException &&
        (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError')
      ) {
        setCameraError(mapCameraErrorToMessage(error))
        setCameraErrorType('permission-denied')
      } else {
        setCameraError(mapCameraErrorToMessage(error))
        setCameraErrorType('generic')
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
    void startCamera()

    return () => {
      document.removeEventListener('visibilitychange', visibilityChange)
      stopCamera()
    }
  }, [startCamera, stopCamera, videoRef])

  return {
    cameraError,
    cameraErrorType,
    cameraState,
    retryCamera: startCamera,
  }
}

export default useCameraStream
