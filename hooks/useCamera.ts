'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import classifyCameraError from '@/lib/camera/classifyCameraError';
import enumerateRearCameras from '@/lib/camera/enumerateRearCameras';
import requestCameraStream from '@/lib/camera/requestCameraStream';
import type { ICameraCandidate, ICameraError } from '@/lib/camera/types';

const messages: Record<ICameraError['kind'], string> = {
  denied: 'ยังไม่ได้รับอนุญาตให้ใช้กล้อง เปิดสิทธิ์กล้องในการตั้งค่าแล้วลองใหม่',
  'not-allowed': 'เบราว์เซอร์ไม่อนุญาตให้ใช้กล้อง ตรวจสอบสิทธิ์ของเว็บไซต์แล้วลองใหม่',
  'no-camera': 'ไม่พบกล้องหลังบนอุปกรณ์นี้',
  generic: 'เปิดกล้องไม่สำเร็จ ลองใหม่อีกครั้ง',
};

const useCamera = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef(0);
  const [cameras, setCameras] = useState<ICameraCandidate[]>([]);
  const [activeCamera, setActiveCamera] = useState<ICameraCandidate | null>(null);
  const [screen, setScreen] = useState<'intro' | 'loading' | 'live' | 'error'>('intro');
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);

  const stopStream = useCallback(() => {
    requestRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const attach = useCallback(async (stream: MediaStream) => {
    const video = videoRef.current;
    if (!video) throw new Error('video element is not ready');

    video.srcObject = stream;
    await video.play();
  }, []);

  const discover = useCallback(async (): Promise<ICameraCandidate[]> => {
    const list = await enumerateRearCameras();
    setCameras(list);
    return list;
  }, []);

  const start = useCallback(
    async (camera: ICameraCandidate | null, isSwitch = false) => {
      const currentRequest = ++requestRef.current;
      setError(null);
      setSwitching(isSwitch);
      if (!isSwitch) setScreen('loading');

      try {
        const stream = await requestCameraStream(camera?.deviceId);
        if (currentRequest !== requestRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        await attach(stream);
        if (currentRequest !== requestRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const previous = streamRef.current;
        streamRef.current = stream;
        previous?.getTracks().forEach((track) => track.stop());
        setActiveCamera(camera);
        setScreen('live');
      } catch (cause) {
        if (currentRequest !== requestRef.current) return;
        const kind = await classifyCameraError(cause);
        setError(messages[kind]);
        setScreen(isSwitch ? 'live' : 'error');
      } finally {
        if (currentRequest === requestRef.current) setSwitching(false);
      }
    },
    [attach],
  );

  const open = useCallback(async () => {
    setError(null);
    try {
      const list = await discover();
      await start(list[0] ?? null);
    } catch (cause) {
      const kind = await classifyCameraError(cause);
      setError(messages[kind]);
      setScreen('error');
    }
  }, [discover, start]);

  const selectCamera = useCallback(
    async (camera: ICameraCandidate) => {
      if (camera.deviceId === activeCamera?.deviceId || switching) return;
      await start(camera, true);
    },
    [activeCamera?.deviceId, start, switching],
  );

  const retry = useCallback(() => {
    stopStream();
    void open();
  }, [open, stopStream]);

  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

  return {
    activeCamera,
    cameras,
    error,
    open,
    retry,
    screen,
    selectCamera,
    switching,
    videoRef,
  };
};

export default useCamera;
