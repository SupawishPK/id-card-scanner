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

type Slot = 'a' | 'b';

const useCamera = () => {
  const videoARef = useRef<HTMLVideoElement | null>(null);
  const videoBRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const slotRef = useRef<Slot>('a');
  const requestRef = useRef(0);
  const activeCameraRef = useRef<ICameraCandidate | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const [cameras, setCameras] = useState<ICameraCandidate[]>([]);
  const [activeCamera, setActiveCamera] = useState<ICameraCandidate | null>(null);
  const [activeSlot, setActiveSlot] = useState<Slot>('a');
  const [screen, setScreen] = useState<'intro' | 'loading' | 'live' | 'error'>('intro');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [debug, setDebug] = useState<ICameraDebug | null>(null);

  const videoFor = useCallback(
    (slot: Slot) => (slot === 'a' ? videoARef.current : videoBRef.current),
    [],
  );

  const showNotice = useCallback((text: string) => {
    setNotice(text);
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => setNotice(null), 2600);
  }, []);

  const stopStream = useCallback(() => {
    requestRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  /** Report the live preview geometry (debug overlay only). */
  const fitVideo = useCallback(() => {
    const video = videoFor(slotRef.current);
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
    const scale = vw && vh ? Math.max(cw / vw, ch / vh) : 0;

    setDebug({
      container: `${cw}×${ch}`,
      element: `${Math.round(video.clientWidth)}×${Math.round(video.clientHeight)}`,
      intrinsic: `${vw}×${vh}`,
      track: settings ? `${settings.width ?? '?'}×${settings.height ?? '?'}` : '-',
      cap,
      scale: scale ? scale.toFixed(3) : '-',
    });
  }, [videoFor]);

  /**
   * Load a stream into a buffer video and resolve once it has painted a frame.
   * The buffer is hidden (opacity 0) so any transient size/aspect glitch the
   * browser shows while attaching a new stream is never visible.
   */
  const attachTo = useCallback(
    async (slot: Slot, stream: MediaStream) => {
      const video = videoFor(slot);
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
    },
    [videoFor],
  );

  const discover = useCallback(async (): Promise<ICameraCandidate[]> => {
    const list = await enumerateRearCameras();
    setCameras(list);
    return list;
  }, []);

  const commitActive = useCallback((camera: ICameraCandidate | null) => {
    activeCameraRef.current = camera;
    setActiveCamera(camera);
  }, []);

  const restore = useCallback(
    async (camera: ICameraCandidate, currentRequest: number) => {
      const fromSlot = slotRef.current;
      const toSlot: Slot = fromSlot === 'a' ? 'b' : 'a';

      try {
        const stream = await requestCameraStream(camera);
        if (currentRequest !== requestRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        await attachTo(toSlot, stream);
        if (currentRequest !== requestRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        slotRef.current = toSlot;
        setActiveSlot(toSlot);
        commitActive(camera);
        setScreen('live');
        fitVideo();
      } catch {
        // Keep the frozen frame from before the failed switch.
      } finally {
        showNotice(SWITCH_FAILED);
      }
    },
    [attachTo, commitActive, fitVideo, showNotice],
  );

  const start = useCallback(
    async (
      camera: ICameraCandidate | null,
      isSwitch = false,
      previousOverride?: ICameraCandidate | null,
    ) => {
      const currentRequest = ++requestRef.current;
      const previousCamera = previousOverride ?? activeCameraRef.current;
      const fromSlot = slotRef.current;
      const toSlot: Slot = isSwitch ? (fromSlot === 'a' ? 'b' : 'a') : fromSlot;

      setError(null);
      setSwitching(isSwitch);
      if (!isSwitch) setScreen('loading');

      if (isSwitch) {
        // Freeze the visible frame: stop the current stream, load the next one
        // into the hidden buffer, then crossfade. The visible video element's
        // srcObject is never reassigned, so the preview stays full-screen.
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      try {
        const stream = await requestCameraStream(camera);
        if (currentRequest !== requestRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        await attachTo(toSlot, stream);
        if (currentRequest !== requestRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        slotRef.current = toSlot;
        setActiveSlot(toSlot);
        commitActive(camera);
        setScreen('live');
        fitVideo();
      } catch (cause) {
        if (currentRequest !== requestRef.current) return;
        if (isSwitch && previousCamera) {
          await restore(previousCamera, currentRequest);
          return;
        }
        const kind = await classifyCameraError(cause);
        setError(messages[kind]);
        setScreen(isSwitch ? 'live' : 'error');
      } finally {
        if (currentRequest === requestRef.current) setSwitching(false);
      }
    },
    [attachTo, commitActive, fitVideo, restore],
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
    };
  }, [stopStream]);

  return {
    activeCamera,
    activeSlot,
    cameras,
    debug,
    error,
    notice,
    open,
    retry,
    screen,
    selectCamera,
    switching,
    videoARef,
    videoBRef,
  };
};

export default useCamera;
