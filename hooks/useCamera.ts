'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import classifyCameraError from '@/lib/camera/classifyCameraError';
import enumerateRearCameras from '@/lib/camera/enumerateRearCameras';
import requestCameraStream from '@/lib/camera/requestCameraStream';
import type { ICameraCapabilities } from '@/lib/camera/capabilities';
import type { ICameraCandidate, ICameraError } from '@/lib/camera/types';

const messages: Record<ICameraError['kind'], string> = {
  denied: 'ยังไม่ได้รับอนุญาตให้ใช้กล้อง เปิดสิทธิ์กล้องในการตั้งค่าแล้วลองใหม่',
  'not-allowed': 'เบราว์เซอร์ไม่อนุญาตให้ใช้กล้อง ตรวจสอบสิทธิ์ของเว็บไซต์แล้วลองใหม่',
  'no-camera': 'ไม่พบกล้องหลังบนอุปกรณ์นี้',
  generic: 'เปิดกล้องไม่สำเร็จ ลองใหม่อีกครั้ง',
};

const SWITCH_FAILED = 'เปลี่ยนกล้องไม่สำเร็จ ลองอีกครั้ง';

/** Crossfade duration (ms) when revealing a freshly attached lens. */
const FADE_MS = 180;

export interface ICameraDebug {
  container: string;
  element: string;
  intrinsic: string;
  track: string;
  cap: string;
  scale: string;
}

type FrozenFrame = HTMLCanvasElement | null;

const sourceSize = (source: CanvasImageSource): { w: number; h: number } => {
  if (source instanceof HTMLVideoElement) return { w: source.videoWidth, h: source.videoHeight };
  if (source instanceof HTMLCanvasElement) return { w: source.width, h: source.height };
  return { w: 0, h: 0 };
};

const drawCover = (
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
): void => {
  const { w, h } = sourceSize(source);
  if (!w || !h) return;
  const scale = Math.max(width / w, height / h);
  const dw = w * scale;
  const dh = h * scale;
  ctx.drawImage(source, (width - dw) / 2, (height - dh) / 2, dw, dh);
};

const useCamera = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestRef = useRef(0);
  const frozenRef = useRef<FrozenFrame>(null);
  const liveRef = useRef(false);
  const fadeStartRef = useRef(0);
  const activeCameraRef = useRef<ICameraCandidate | null>(null);
  const noticeTimerRef = useRef<number | null>(null);
  const [cameras, setCameras] = useState<ICameraCandidate[]>([]);
  const [activeCamera, setActiveCamera] = useState<ICameraCandidate | null>(null);
  const [screen, setScreen] = useState<'intro' | 'loading' | 'live' | 'error'>('intro');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [debug, setDebug] = useState<ICameraDebug | null>(null);

  /**
   * Paint the live camera — or the frozen frame while a new stream loads — onto
   * a canvas that is always exactly the container size. We own the cover math,
   * so the preview can never letterbox or shrink, unlike a <video> element
   * whose intrinsic size briefly changes while a stream is being attached.
   *
   * Performance: when the feed is live we redraw on each new camera frame via
   * `requestVideoFrameCallback` (≈ the camera fps, not the 60 Hz display), and
   * a static frozen frame is only repainted when it changes or the canvas
   * resizes.
   */
  useEffect(() => {
    let stopped = false;
    let rafId = 0;
    let vfcId = 0;
    let vfcVideo: HTMLVideoElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    let lastFrozen: FrozenFrame = null;

    /** Returns true while a crossfade is still running (needs another frame). */
    const paint = (): boolean => {
      const canvas = canvasRef.current;
      if (!canvas) return false;
      if (!ctx) ctx = canvas.getContext('2d');
      if (!ctx) return false;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      const resized = canvas.width !== width || canvas.height !== height;
      if (resized) {
        canvas.width = width;
        canvas.height = height;
      }

      const video = videoRef.current;
      const live = liveRef.current && video !== null && video.readyState >= 2 && video.videoWidth > 0;

      if (video && live) {
        ctx.clearRect(0, 0, width, height);
        drawCover(ctx, video, width, height);

        const frozen = frozenRef.current;
        const fadeStart = fadeStartRef.current;
        if (frozen && fadeStart > 0) {
          const progress = (performance.now() - fadeStart) / FADE_MS;
          if (progress >= 1) {
            fadeStartRef.current = 0;
            frozenRef.current = null;
            lastFrozen = null;
          } else {
            ctx.globalAlpha = 1 - progress;
            drawCover(ctx, frozen, width, height);
            ctx.globalAlpha = 1;
            return true;
          }
        }
        return false;
      }

      const frozen = frozenRef.current;
      if (frozen && (resized || frozen !== lastFrozen)) {
        ctx.clearRect(0, 0, width, height);
        drawCover(ctx, frozen, width, height);
      } else if (!frozen && lastFrozen !== null) {
        ctx.clearRect(0, 0, width, height);
      }
      lastFrozen = frozen;
      return false;
    };

    const loop = () => {
      if (stopped) return;
      const fading = paint();
      const video = videoRef.current;
      const live = liveRef.current && video !== null && video.videoWidth > 0;
      const canUseFrameCallback = typeof video?.requestVideoFrameCallback === 'function';

      if (!fading && live && video && canUseFrameCallback) {
        vfcVideo = video;
        vfcId = video.requestVideoFrameCallback(() => {
          if (!stopped) loop();
        });
      } else {
        rafId = requestAnimationFrame(() => {
          if (!stopped) loop();
        });
      }
    };

    loop();

    return () => {
      stopped = true;
      cancelAnimationFrame(rafId);
      if (vfcVideo && vfcId && typeof vfcVideo.cancelVideoFrameCallback === 'function') {
        vfcVideo.cancelVideoFrameCallback(vfcId);
      }
    };
  }, []);

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

  const fitVideo = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
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
      element: `${canvas.width}×${canvas.height}`,
      intrinsic: `${vw}×${vh}`,
      track: settings ? `${settings.width ?? '?'}×${settings.height ?? '?'}` : '-',
      cap,
      scale: scale ? scale.toFixed(3) : '-',
    });
  }, []);

  /**
   * Capture the current frame synchronously (a canvas copy). Doing this before
   * the stream is stopped keeps the canvas painting the exact same image, so
   * there is no black gap while the next lens opens.
   */
  const freezeCurrentFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !video.videoWidth) return;
    const off = document.createElement('canvas');
    off.width = video.videoWidth;
    off.height = video.videoHeight;
    const context = off.getContext('2d');
    if (context) {
      context.drawImage(video, 0, 0);
      frozenRef.current = off;
    }
  }, []);

  const attach = useCallback(async (stream: MediaStream) => {
    const video = videoRef.current;
    if (!video) throw new Error('video element is not ready');

    video.srcObject = stream;
    await video.play();

    if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      await new Promise<void>((resolve) => {
        video.addEventListener('loadeddata', () => resolve(), { once: true });
      });
    }

    const nextFrame = () =>
      new Promise<void>((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          resolve();
        };
        if (video.requestVideoFrameCallback) {
          video.requestVideoFrameCallback(() => finish());
        } else {
          requestAnimationFrame(() => finish());
        }
        window.setTimeout(finish, 120);
      });

    await nextFrame();

    // Wait until the intrinsic size stops changing (rotation applied) before
    // the canvas switches from the frozen frame to the live feed.
    let stable = 0;
    let lastWidth = video.videoWidth;
    let lastHeight = video.videoHeight;
    const deadline = performance.now() + 600;
    while (stable < 2 && performance.now() < deadline) {
      await nextFrame();
      if (video.videoWidth === lastWidth && video.videoHeight === lastHeight) {
        stable += 1;
      } else {
        stable = 0;
        lastWidth = video.videoWidth;
        lastHeight = video.videoHeight;
      }
    }

    liveRef.current = true;
    fadeStartRef.current = performance.now();
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
        fitVideo();
      } catch {
        liveRef.current = true;
      } finally {
        showNotice(SWITCH_FAILED);
      }
    },
    [attach, commitActive, fitVideo, showNotice],
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
        // Freeze the current frame synchronously BEFORE stopping the stream, so
        // the canvas never paints an empty (black) frame during the handover.
        freezeCurrentFrame();
        liveRef.current = false;
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
        fitVideo();
      } catch (cause) {
        if (currentRequest !== requestRef.current) return;
        if (isSwitch && previousCamera) {
          await restore(previousCamera, currentRequest);
          return;
        }
        liveRef.current = true;
        const kind = await classifyCameraError(cause);
        setError(messages[kind]);
        setScreen(isSwitch ? 'live' : 'error');
      } finally {
        if (currentRequest === requestRef.current) setSwitching(false);
      }
    },
    [attach, commitActive, fitVideo, freezeCurrentFrame, restore],
  );

  const open = useCallback(async () => {
    setError(null);
    try {
      const list = await discover();
      // Always start on the first camera so the UI opens on "กล้อง 1".
      await start(list[0] ?? null);
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
    cameras,
    canvasRef,
    debug,
    error,
    notice,
    open,
    retry,
    screen,
    selectCamera,
    switching,
    videoRef,
  };
};

export default useCamera;
