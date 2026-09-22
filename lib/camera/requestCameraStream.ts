import {
  FOCUS_MODES,
  type ICameraCapabilities,
  type IFocusConstraint,
} from './capabilities';
import type { ICameraCandidate } from './types';

const MIN_SHARP_WIDTH = 1280;
const TARGET_WIDTH = 1920;

export const applyAutofocus = async (stream: MediaStream): Promise<void> => {
  const track = stream.getVideoTracks()[0];
  if (!track) return;

  try {
    const capabilities = track.getCapabilities() as ICameraCapabilities;
    const modes = capabilities.focusMode ?? [];

    // Continuous autofocus keeps the frame sharp while the user moves the
    // phone over a subject; fall back to the best supported mode.
    const preferred = FOCUS_MODES.find((mode) => modes.includes(mode));
    if (preferred) {
      await track.applyConstraints({ advanced: [{ focusMode: preferred } as IFocusConstraint] });
      return;
    }

    // Some Android HALs only expose manual focus. Nudge it toward the near end
    // so close-range subjects (e.g. ID cards) are not stuck at infinity.
    if (modes.includes('manual') && capabilities.focusDistance) {
      await track.applyConstraints({
        advanced: [
          {
            focusMode: 'manual',
            focusDistance: capabilities.focusDistance.min ?? 0,
          } as IFocusConstraint,
        ],
      });
    }
  } catch {
    // Focus controls are optional across mobile browsers.
  }
};

/**
 * Ask for a sharp preview. Only `width` is requested: pairing it with a fixed
 * `height` implies a 16:9 aspect ratio, and on a 4:3 sensor the browser then
 * fails to match and silently falls back to a 640×480 default. Requesting width
 * alone keeps the sensor's native aspect (≈1920×1440) which stays sharp.
 */
const requestCameraStream = async (camera?: ICameraCandidate | null): Promise<MediaStream> => {
  const maxWidth = camera?.capabilities.width?.max ?? 0;
  const targetWidth = maxWidth > 0 ? Math.min(TARGET_WIDTH, maxWidth) : TARGET_WIDTH;

  const video: MediaTrackConstraints = {
    width: { ideal: targetWidth },
    ...(camera?.deviceId
      ? { deviceId: { exact: camera.deviceId } }
      : { facingMode: { ideal: 'environment' } }),
  };

  const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video });
  const track = stream.getVideoTracks()[0];

  // Some devices ignore the resolution hint at capture time but honour a
  // renegotiation once the track is live.
  if (track && (track.getSettings().width ?? 0) < MIN_SHARP_WIDTH) {
    try {
      await track.applyConstraints({ width: { ideal: targetWidth } });
    } catch {
      // Keep the stream we already have.
    }
  }

  await applyAutofocus(stream);
  return stream;
};

export default requestCameraStream;
