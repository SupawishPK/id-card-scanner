import type { ICameraCandidate } from './types';

export type CameraLogLevel = 'info' | 'success' | 'warn' | 'error';

export interface ICameraLogEntry {
  id: number;
  timestamp: number;
  level: CameraLogLevel;
  message: string;
  detail?: string;
}

export const MAX_LOG_ENTRIES = 500;

const pad = (value: number, width = 2): string => String(value).padStart(width, '0');

export const formatLogClock = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
};

export const formatLogEntry = (entry: ICameraLogEntry): string => {
  const line = `[${new Date(entry.timestamp).toISOString()}] [${entry.level.toUpperCase()}] ${entry.message}`;
  return entry.detail ? `${line}\n  ${entry.detail.replace(/\n/g, '\n  ')}` : line;
};

export const formatLogText = (entries: ICameraLogEntry[]): string =>
  entries.map(formatLogEntry).join('\n');

export const describeCamera = (camera: ICameraCandidate): string => {
  const megapixels =
    camera.maxResolution > 0 ? `${(camera.maxResolution / 1_000_000).toFixed(1)}MP` : '?MP';
  return `#${camera.index} ${camera.label || 'ไม่ระบุชื่อ'} | ${camera.lensKind} | ${megapixels} | AF:${camera.hasAutofocus} | id=${camera.deviceId}`;
};

export const listDevices = (): Promise<MediaDeviceInfo[]> =>
  navigator.mediaDevices.enumerateDevices();

const toPlainDevice = (device: MediaDeviceInfo): Record<string, string> => ({
  deviceId: device.deviceId,
  kind: device.kind,
  label: device.label,
  groupId: device.groupId,
});

export const describeDevices = (devices: MediaDeviceInfo[]): string =>
  JSON.stringify(devices.map(toPlainDevice), null, 2);
