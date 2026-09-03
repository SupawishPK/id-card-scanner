/**
 * Open a camera stream for a specific device (or the default rear camera when
 * no deviceId is given) and apply continuous autofocus best-effort.
 */

import { FOCUS_MODES, type ICameraCapabilities, type IFocusConstraint } from './capabilities';

export const applyAutofocus = async (stream: MediaStream): Promise<void> => {
  const track = stream.getVideoTracks()[0];
  if (!track) return;

  try {
    const capabilities = track.getCapabilities() as ICameraCapabilities;
    const modes = capabilities.focusMode;
    if (!modes || modes.length === 0) return;

    const mode = FOCUS_MODES.find((candidate) => modes.includes(candidate));
    if (!mode) return;

    const constraint: IFocusConstraint = { focusMode: mode };
    await track.applyConstraints({ advanced: [constraint] });
  } catch {
    // Autofocus is a soft hint — ignore unsupported/denied focus requests.
  }
};

const requestCameraStream = async (deviceId?: string): Promise<MediaStream> => {
  const video: MediaTrackConstraints = {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: 'environment' } }),
  };

  const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video });
  await applyAutofocus(stream);
  return stream;
};

export default requestCameraStream;
