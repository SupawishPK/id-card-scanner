'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import classifyCameraError from '@/lib/camera/classifyCameraError';
import enumerateRearCameras from '@/lib/camera/enumerateRearCameras';
import requestCameraStream from '@/lib/camera/requestCameraStream';
import selectDefaultCamera from '@/lib/camera/selectDefaultCamera';
import type { ICameraCapabilities } from '@/lib/camera/capabilities';
import type { ICameraCandidate, ICameraError } from '@/lib/camera/types';

const messages: Record<ICameraError['kind'], string> = {
  denied: 'ยังไม่ได้รับอนุญาตให้ใช้กล้อง เปิดสิทธิ์กล้องในการตั้งค่าแล้วลองใหม่',
  'not-allowed': 'เบราว์เซอร์ไม่อนุญาตให้ใช้กล้อง ตรวจสอบสิทธิ์ของเว็บไซต์แล้วลองใหม่',
  'no-camera': 'ไม่พบกล้องหลังบนอุปกรณ์นี้',
  generic: 'เปิดกล้องไม่สำเร็จ ลองใหม่อีกครั้ง',
};

const SWITCH_FAILED = 'เปลี่ยนกล้องไม่สำเร็จ ลองอีกครั้ง';

export interface ICameraDebug {
  container: string;
  element: string;
  intrinsic: string;
  track: string;
  cap: string;
  scale: string;
}

const useCamera = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef(0);
  const activeCameraRef = useRef<ICameraCandidate | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const revealTimerRef = useRef<number | null>(null);
  const [cameras, setCameras] = useState<ICameraCandidate[]>([]);
  const [activeCamera, setActiveCamera] = useState<ICameraCandidate | null>(null);
  const [screen, setScreen] = useState<'intro' | 'loading' | 'live' | 'error'>('intro');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [transitionFrame, setTransitionFrame] = useState<string | null>(null);
  const [debug, setDebug] = useState<ICameraDebug | null>(null);

  const showNotice = useCallback((text: string) => {
    setNotice(text);
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), 2600);
  }, []);

  /**
   * Fade the frozen frame out and play the lens zoom pulse as the new stream is
   * revealed, mimicking the native Android lens switch.
   */
  const reveal = useCallback(() => {
    if (revealTimerRef.current) window.clearTimeout(revealTimerRef.current);
    setRevealing(true);
    revealTimerRef.current = window.setTimeout(() => {
      setRevealing(false);
      setTransitionFrame(null);
      revealTimerRef.current = null;
    }, 340);
  }, []);

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
    const capabilities = track?.getCapabilities() as ICameraCapabilities | undefined;
    const capWidth = capabilities?.width?.max ?? 0;
    const capHeight = capabilities?.height?.max ?? 0;
    const cap = capWidth && capHeight ? `${capWidth}×${capHeight}` : '-';

    if (!cw || !ch || !vw || !vh) {
      setDebug({
        container: `${cw}×${ch}`,
        element: `${Math.round(video.clientWidth)}×${Math.round(video.clientHeight)}`,
        intrinsic: `${vw}×${vh}`,
        track: settings ? `${settings.width ?? '?'}×${settings.height ?? '?'}` : '-',
        cap,
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
      cap,
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

  const commitActive = useCallback((camera: ICameraCandidate | null) => {
    activeCameraRef.current = camera;
    setActiveCamera(camera);
  }, []);

  /**
   * Re-open the lens that was active before a failed switch so the preview is
   * never left on a dead stream.
   */
  const restore = useCallback(
    async (camera: ICameraCandidate, currentRequest: number) => {
      try {
        const stream = await requestCameraStream(camera);
        if (currentRequest !== requestRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        await attach(stream);
        if (currentRequest !== requestRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        commitActive(camera);
        setScreen('live');
        reveal();
      } catch {
        setTransitionFrame(null);
      } finally {
        showNotice(SWITCH_FAILED);
      }
    },
    [attach, commitActive, reveal, showNotice],
  );

  const start = useCallback(
    async (
      camera: ICameraCandidate | null,
      isSwitch = false,
      previousOverride?: ICameraCandidate | null,
    ) => {
      const currentRequest = ++requestRef.current;
      const previousCamera = previousOverride ?? activeCameraRef.current;
      setError(null);
      setSwitching(isSwitch);
      if (!isSwitch) setScreen('loading');

      if (isSwitch) {
        if (revealTimerRef.current) {
          window.clearTimeout(revealTimerRef.current);
          revealTimerRef.current = null;
        }
        setRevealing(false);
        setTransitionFrame(captureFrame());
        // Release the active lens before opening another one. Multi-camera
        // phones such as the Galaxy Z Flip 6 cannot stream two rear lenses at
        // the same time, so opening the next one while this still runs throws.
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      try {
        const stream = await requestCameraStream(camera);
        if (currentRequest !== requestRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        await attach(stream);
        if (currentRequest !== requestRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        commitActive(camera);
        setScreen('live');
        if (isSwitch) reveal();
        else setTransitionFrame(null);
      } catch (cause) {
        if (currentRequest !== requestRef.current) return;
        if (isSwitch && previousCamera) {
          await restore(previousCamera, currentRequest);
          return;
        }
        const kind = await classifyCameraError(cause);
        setError(messages[kind]);
        setScreen(isSwitch ? 'live' : 'error');
        setTransitionFrame(null);
      } finally {
        if (currentRequest === requestRef.current) setSwitching(false);
      }
    },
    [attach, captureFrame, commitActive, restore, reveal],
  );

  const open = useCallback(async () => {
    setError(null);
    try {
      const list = await discover();
      await start(selectDefaultCamera(list));
    } catch (cause) {
      const kind = await classifyCameraError(cause);
      setError(messages[kind]);
      setScreen('error');
    }
  }, [discover, start]);

  const selectCamera = useCallback(
    async (camera: ICameraCandidate) => {
      if (camera.deviceId === activeCameraRef.current?.deviceId || switching) return;
      const previous = activeCameraRef.current;
      // Highlight the tapped lens immediately; the preview catches up once the
      // new stream is ready, and restore() puts it back if the switch fails.
      commitActive(camera);
      await start(camera, true, previous);
    },
    [commitActive, start, switching],
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
    return () => {
      stopStream();
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
      if (revealTimerRef.current) window.clearTimeout(revealTimerRef.current);
    };
  }, [stopStream]);

  return {
    activeCamera,
    cameras,
    debug,
    error,
    notice,
    open,
    retry,
    revealing,
    screen,
    selectCamera,
    switching,
    transitionFrame,
    videoRef,
  };
};

export default useCamera;
