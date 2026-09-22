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
  const video: MediaTrackConstraints = {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    aspectRatio: { ideal: 16 / 9 },
    ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: { ideal: 'environment' } }),
  };
  const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video });
  await applyAutofocus(stream);
  return stream;
};

export default requestCameraStream;
