/**
 * Enumerate every rear-facing camera on the device.
 *
 * Device labels are only revealed after camera permission has been granted,
 * so we first open a throwaway rear stream (which triggers the prompt), then
 * probe each video input to read its facingMode, focus, zoom and other
 * capabilities. Front-facing cameras are filtered out; the remaining list is
 * ordered and each entry gets an `index` (0-based) within the rear-camera group.
 */

import { FOCUSABLE_MODES, type ICameraCapabilities, type ICameraSettings } from './capabilities';
import { classifyLens } from './lens';
import type { ICameraCandidate } from './types';

const ensurePermission = async (): Promise<void> => {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: 'environment' } },
  });
  stream.getTracks().forEach((track) => track.stop());
};

const probeCamera = async (
  deviceId: string,
  label: string,
): Promise<Omit<ICameraCandidate, 'index'> | null> => {
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId } },
    });
  } catch {
    return null;
  }

  try {
    const track = stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities() as ICameraCapabilities;
    const settings = track.getSettings() as ICameraSettings;

    const facing = capabilities.facingMode ?? [];
    if (facing.includes('user')) return null;
    if (facing.length === 0 && /front/i.test(label)) return null;

    const focusModes = capabilities.focusMode ?? [];
    const maxWidth = capabilities.width?.max ?? 0;
    const maxHeight = capabilities.height?.max ?? 0;

    return {
      deviceId,
      label,
      lensKind: classifyLens(capabilities.zoom ?? null),
      hasAutofocus: focusModes.some((mode) => FOCUSABLE_MODES.includes(mode)),
      maxResolution: maxWidth * maxHeight,
      capabilities,
      settings,
    };
  } finally {
    stream.getTracks().forEach((track) => track.stop());
  }
};

const enumerateRearCameras = async (): Promise<ICameraCandidate[]> => {
  await ensurePermission();

  const devices = await navigator.mediaDevices.enumerateDevices();
  const videoInputs = devices.filter(
    (device) =>
      device.kind === 'videoinput' && device.deviceId && !device.deviceId.startsWith('default'),
  );

  const cameras: ICameraCandidate[] = [];
  for (const device of videoInputs) {
    const candidate = await probeCamera(device.deviceId, device.label);
    if (candidate) cameras.push({ ...candidate, index: cameras.length });
  }

  return cameras;
};

export default enumerateRearCameras;
