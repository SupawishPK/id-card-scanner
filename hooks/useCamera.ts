'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import classifyCameraError from '@/lib/camera/classifyCameraError';
import enumerateRearCameras from '@/lib/camera/enumerateRearCameras';
import {
  describeCamera,
  describeCameraList,
  MAX_LOG_ENTRIES,
  type CameraLogLevel,
  type ICameraLogEntry,
} from '@/lib/camera/log';
import requestCameraStream from '@/lib/camera/requestCameraStream';
import type { ResolutionPreset } from '@/lib/camera/resolution';
import selectBestRearCamera from '@/lib/camera/selectBestRearCamera';
import type {
  CameraErrorKind,
  CameraMode,
  CameraScreen,
  ICameraCandidate,
  ICameraError,
} from '@/lib/camera/types';

const mapErrorMessage = (kind: CameraErrorKind): string => {
  switch (kind) {
    case 'denied':
      return 'คุณปฏิเสธการเข้าถึงกล้อง กรุณาไปที่การตั้งค่าแล้วอนุญาตให้เว็บไซต์นี้ใช้กล้อง';
    case 'not-allowed':
      return 'แอปนี้ยังไม่อนุญาตให้ใช้กล้อง กรุณาอัปเดตแอปเป็นเวอร์ชันล่าสุด';
    case 'no-camera':
      return 'ไม่พบกล้องหลังบนอุปกรณ์นี้';
    default:
      return 'เกิดข้อผิดพลาดในการเปิดกล้อง กรุณาลองใหม่อีกครั้ง';
  }
};

const useCamera = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestIdRef = useRef(0);

  const [screen, setScreen] = useState<CameraScreen>('intro');
  const [mode, setMode] = useState<CameraMode>('auto');
  const [resolution, setResolution] = useState<ResolutionPreset>('4k');
  const [cameras, setCameras] = useState<ICameraCandidate[]>([]);
  const [camerasLoading, setCamerasLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [activeCamera, setActiveCamera] = useState<ICameraCandidate | null>(null);
  const [error, setError] = useState<ICameraError | null>(null);
  const [logs, setLogs] = useState<ICameraLogEntry[]>([]);
  const logIdRef = useRef(0);

  const pushLog = useCallback(
    (level: CameraLogLevel, message: string, detail?: string): void => {
      logIdRef.current += 1;
      const entry: ICameraLogEntry = {
        id: logIdRef.current,
        timestamp: Date.now(),
        level,
        message,
        detail,
      };
      setLogs((prev) => {
        const next = [...prev, entry];
        return next.length > MAX_LOG_ENTRIES ? next.slice(next.length - MAX_LOG_ENTRIES) : next;
      });
    },
    [],
  );

  const clearLogs = useCallback((): void => {
    logIdRef.current = 0;
    setLogs([]);
  }, []);

  const stopCamera = useCallback(() => {
    requestIdRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const attachStream = useCallback(async (stream: MediaStream): Promise<void> => {
    const video = videoRef.current;
    if (!video) {
      stream.getTracks().forEach((track) => track.stop());
      throw new TypeError('video element not mounted');
    }

    streamRef.current = stream;
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();
  }, []);

  const startStream = useCallback(
    async (candidate: ICameraCandidate | null): Promise<void> => {
      stopCamera();
      const requestId = requestIdRef.current;

      pushLog(
        'info',
        candidate ? `เปิดสตรีม: ${describeCamera(candidate)}` : 'เปิดสตรีม: กล้องหลังอัตโนมัติ',
        `resolution=${resolution}`,
      );

      const stream = await requestCameraStream(candidate?.deviceId, resolution);
      if (requestId !== requestIdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      await attachStream(stream);
      if (requestId !== requestIdRef.current) return;

      setActiveCamera(candidate);
      setScreen('live');
      pushLog('success', 'สตรีมเริ่มทำงานแล้ว (video.play สำเร็จ)');
    },
    [attachStream, pushLog, resolution, stopCamera],
  );

  const handleError = useCallback(
    async (err: unknown): Promise<void> => {
      const kind = await classifyCameraError(err);
      const message = mapErrorMessage(kind);
      setError({ kind, message });
      const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      pushLog('error', `เกิดข้อผิดพลาด (${kind}): ${message}`, detail);
    },
    [pushLog],
  );

  const resolveDevice = useCallback(
    (list: ICameraCandidate[]): ICameraCandidate | null => {
      if (mode === 'best') return selectBestRearCamera(list);
      if (mode === 'index') return list[selectedIndex] ?? null;
      if (mode === 'manual') return list.find((c) => c.deviceId === selectedDeviceId) ?? null;
      return null;
    },
    [mode, selectedIndex, selectedDeviceId],
  );

  const prepareCameras = useCallback(async () => {
    setCamerasLoading(true);
    setError(null);
    pushLog('info', 'กำลังค้นหากล้องหลัง…');

    try {
      const list = await enumerateRearCameras();
      setCameras(list);
      if (list.length > 0) {
        setSelectedIndex((current) => (current < list.length ? current : 0));
        setSelectedDeviceId((current) => current ?? list[0].deviceId);
        pushLog('success', `พบกล้องหลัง ${list.length} ตัว`, describeCameraList(list));
      } else {
        pushLog('warn', 'ไม่พบกล้องหลังบนอุปกรณ์นี้');
      }
    } catch (err) {
      await handleError(err);
    } finally {
      setCamerasLoading(false);
    }
  }, [handleError, pushLog]);

  const selectMode = useCallback(
    (next: CameraMode): void => {
      setMode(next);
      if (next === 'index' || next === 'manual') void prepareCameras();
    },
    [prepareCameras],
  );

  const openCamera = useCallback(async () => {
    setScreen('loading');
    setError(null);
    pushLog('info', `เปิดกล้อง: mode=${mode}`);

    try {
      if (mode === 'auto') {
        await startStream(null);
        return;
      }

      const list = await enumerateRearCameras();
      setCameras(list);
      pushLog('success', `พบกล้องหลัง ${list.length} ตัว`, describeCameraList(list));

      const candidate = resolveDevice(list);
      if (!candidate) throw new DOMException('no rear camera found', 'NotFoundError');

      await startStream(candidate);
    } catch (err) {
      await handleError(err);
      setScreen('error');
    }
  }, [handleError, mode, pushLog, resolveDevice, startStream]);

  const switchCamera = useCallback(
    async (candidate: ICameraCandidate | null): Promise<void> => {
      setScreen('loading');
      setError(null);
      pushLog(
        'info',
        candidate ? `สลับกล้อง: ${describeCamera(candidate)}` : 'สลับกล้อง: อัตโนมัติ',
      );

      try {
        await startStream(candidate);
      } catch (err) {
        await handleError(err);
        setScreen('error');
      }
    },
    [handleError, pushLog, startStream],
  );

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    activeCamera,
    cameras,
    camerasLoading,
    error,
    mode,
    resolution,
    screen,
    selectedDeviceId,
    selectedIndex,
    videoRef,
    openCamera,
    prepareCameras,
    selectMode,
    setResolution,
    setSelectedDeviceId,
    setSelectedIndex,
    switchCamera,
    logs,
    clearLogs,
  };
};

export default useCamera;
