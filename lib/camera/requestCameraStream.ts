/**
 * Open a camera stream for a specific device (or the default rear camera when
 * no deviceId is given) and apply continuous autofocus best-effort.
 */

const FOCUS_MODES = ['continuous', 'auto', 'single-shot'] as const;

type FocusMode = (typeof FOCUS_MODES)[number];

interface IFocusCapabilities extends MediaTrackCapabilities {
  focusMode?: FocusMode[];
}

interface IFocusConstraint extends MediaTrackConstraintSet {
  focusMode?: FocusMode;
}

export const applyAutofocus = async (stream: MediaStream | null): Promise<void> => {
  if (!stream) return;
  const track = stream.getVideoTracks()[0];
  if (!track) return;

  try {
    const capabilities = track.getCapabilities() as IFocusCapabilities;
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
  const video: MediaTrackConstraints = deviceId
    ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
    : { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } };

  const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video });
  await applyAutofocus(stream);
  return stream;
};

export default requestCameraStream;
