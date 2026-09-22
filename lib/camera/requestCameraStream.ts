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
  // Keep constraints minimal: requesting a fixed resolution/aspect ratio makes
  // some rear lenses letterbox or fall back to a low-resolution stream. We let
  // the browser pick the native size and let the preview fit the viewport.
  const video: MediaTrackConstraints = deviceId
    ? { deviceId: { exact: deviceId } }
    : { facingMode: { ideal: 'environment' } };

  const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video });
  await applyAutofocus(stream);
  return stream;
};

export default requestCameraStream;
