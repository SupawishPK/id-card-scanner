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

export interface ICameraDebug {
  container: string;
  element: string;
  intrinsic: string;
  track: string;
  scale: string;
}

const useCamera = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef(0);
  const [cameras, setCameras] = useState<ICameraCandidate[]>([]);
  const [activeCamera, setActiveCamera] = useState<ICameraCandidate | null>(null);
  const [screen, setScreen] = useState<'intro' | 'loading' | 'live' | 'error'>('intro');
  const [error, setError] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [transitionFrame, setTransitionFrame] = useState<string | null>(null);
  const [debug, setDebug] = useState<ICameraDebug | null>(null);

  const stopStream = useCallback(() => {
    requestRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  /**
   * Force the video to cover its container in pixels instead of relying on
   * `object-fit`. Some mobile browsers letterbox the preview right after the
   * stream changes, which leaves black bars around the image.
   */
  const fitVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const container = video.parentElement;
    if (!container) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const vw = video.videoWidth;
    const vh = video.videoHeight;

    const track = streamRef.current?.getVideoTracks()[0];
    const settings = track?.getSettings();

    if (!cw || !ch || !vw || !vh) {
      setDebug({
        container: `${cw}×${ch}`,
        element: `${Math.round(video.clientWidth)}×${Math.round(video.clientHeight)}`,
        intrinsic: `${vw}×${vh}`,
        track: settings ? `${settings.width ?? '?'}×${settings.height ?? '?'}` : '-',
        scale: '-',
      });
      return;
    }

    const scale = Math.max(cw / vw, ch / vh);
    video.style.width = `${Math.round(vw * scale)}px`;
    video.style.height = `${Math.round(vh * scale)}px`;

    setDebug({
      container: `${cw}×${ch}`,
      element: `${Math.round(vw * scale)}×${Math.round(vh * scale)}`,
      intrinsic: `${vw}×${vh}`,
      track: settings ? `${settings.width ?? '?'}×${settings.height ?? '?'}` : '-',
      scale: scale.toFixed(3),
    });
  }, []);

  const attach = useCallback(
    async (stream: MediaStream) => {
      const video = videoRef.current;
      if (!video) throw new Error('video element is not ready');

      video.srcObject = stream;
      await video.play();

      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        await new Promise<void>((resolve) => {
          video.addEventListener('loadeddata', () => resolve(), { once: true });
        });
      }
      if (video.requestVideoFrameCallback) {
        await new Promise<void>((resolve) => video.requestVideoFrameCallback(() => resolve()));
      } else {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      }

      fitVideo();
    },
    [fitVideo],
  );

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth) {
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
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
      if (isSwitch) setTransitionFrame(captureFrame());

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
        setTransitionFrame(null);
      } catch (cause) {
        if (currentRequest !== requestRef.current) return;
        const kind = await classifyCameraError(cause);
        setError(messages[kind]);
        setScreen(isSwitch ? 'live' : 'error');
        setTransitionFrame(null);
      } finally {
        if (currentRequest === requestRef.current) setSwitching(false);
      }
    },
    [attach, captureFrame],
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
    const onResize = () => fitVideo();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    const timer = window.setInterval(fitVideo, 800);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      window.clearInterval(timer);
    };
  }, [fitVideo]);

  useEffect(() => {
    return () => stopStream();
  }, [stopStream]);

  return {
    activeCamera,
    cameras,
    debug,
    error,
    open,
    retry,
    screen,
    selectCamera,
    switching,
    transitionFrame,
    videoRef,
  };
};

export default useCamera;
