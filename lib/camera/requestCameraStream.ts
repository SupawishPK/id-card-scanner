import { FOCUS_MODES, type ICameraCapabilities, type IFocusConstraint } from './capabilities';

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

const requestCameraStream = async (deviceId?: string): Promise<MediaStream> => {
  // Ask for 1080p so the preview stays sharp. `ideal` (not `exact`) lets a
  // lens that cannot reach 1080p fall back gracefully, and we avoid an
  // aspect-ratio constraint so 4:3 sensors are not letterboxed — the preview
  // is fitted to the viewport separately.
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
