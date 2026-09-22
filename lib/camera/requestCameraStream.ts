import { FOCUS_MODES, type ICameraCapabilities, type IFocusConstraint } from './capabilities';
import type { ICameraCandidate } from './types';

export const applyAutofocus = async (stream: MediaStream): Promise<void> => {
  const track = stream.getVideoTracks()[0];
  if (!track) return;

  try {
    const capabilities = track.getCapabilities() as ICameraCapabilities;
    const mode = FOCUS_MODES.find((candidate) => capabilities.focusMode?.includes(candidate));
    if (mode) await track.applyConstraints({ advanced: [{ focusMode: mode } as IFocusConstraint] });
  } catch {
    // Focus controls are optional across mobile browsers.
  }
};

/**
 * Request a single 1920×1080 stream and nothing else. No post-start
 * `applyConstraints` renegotiation: re-configuring a live track makes some
 * devices (e.g. Galaxy Z Flip 6) change resolution/aspect mid-preview, which
 * shows up as the image shrinking then expanding.
 */
const requestCameraStream = async (camera?: ICameraCandidate | null): Promise<MediaStream> => {
  const video: MediaTrackConstraints = {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    ...(camera?.deviceId
      ? { deviceId: { exact: camera.deviceId } }
      : { facingMode: { ideal: 'environment' } }),
  };

  const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video });
  await applyAutofocus(stream);
  return stream;
};

export default requestCameraStream;
