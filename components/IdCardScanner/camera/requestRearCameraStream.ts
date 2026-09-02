/**
 * NOTE: Request the rear camera at the highest resolution the device supports.
 *
 * Uses `ideal` constraints far above typical hardware so the browser delivers
 * the maximum available (e.g. 4K / 3840×2160) without failing on devices that
 * cap lower — `ideal` falls back gracefully, unlike `exact`.
 *
 * Fallback: if the primary request fails (e.g. device busy), retries with
 * only the facingMode constraint — resolution defaults to device native.
 */
import selectBestRearCamera from './selectBestRearCamera'

const FOCUS_MODES = ["continuous", "auto", "single-shot"] as const

type FocusMode = (typeof FOCUS_MODES)[number]

interface IFocusCapabilities extends MediaTrackCapabilities {
  focusMode?: FocusMode[]
}

/**
 * Webviews commonly start the rear camera in manual focus, leaving the feed
 * soft until the user taps. Force continuous autofocus when the hardware
 * exposes it — best-effort only, never blocking the stream on failure.
 */
export const applyAutofocus = async (stream: MediaStream | null): Promise<void> => {
  if (!stream) return
  const track = stream.getVideoTracks()[0]
  if (!track) return

  try {
    const capabilities = track.getCapabilities() as IFocusCapabilities
    const modes = capabilities.focusMode
    if (!modes || modes.length === 0) return

    const mode = FOCUS_MODES.find((candidate) => modes.includes(candidate))
    if (!mode) return

    await track.applyConstraints({
      advanced: [{ focusMode: mode }],
    } as unknown as MediaTrackConstraints)
  } catch {
    // Autofocus is a soft hint — ignore unsupported/denied focus requests.
  }
}

/**
 * Android WebView ignores a continuous-focus reapply, but does answer a
 * single-shot request — it triggers one real focus sweep. Use on tap so the
 * camera locks onto the card, then continuous focus resumes tracking.
 */
export const applySingleShotFocus = async (stream: MediaStream | null): Promise<void> => {
  if (!stream) return
  const track = stream.getVideoTracks()[0]
  if (!track) return

  try {
    const capabilities = track.getCapabilities() as IFocusCapabilities
    if (!capabilities.focusMode?.includes("single-shot")) return

    await track.applyConstraints({
      advanced: [{ focusMode: "single-shot" }],
    } as unknown as MediaTrackConstraints)
  } catch {
    // Best-effort only.
  }
}

const requestRearCameraStream = async (): Promise<MediaStream> => {
  const constraints: MediaStreamConstraints = {
    audio: false,
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  };

  try {
    // Open a rear camera first — this grants permission and reveals real device IDs.
    const seedStream = await navigator.mediaDevices.getUserMedia(constraints);
    const currentDeviceId = seedStream.getVideoTracks()[0]?.getSettings().deviceId;
    seedStream.getTracks().forEach((track) => track.stop());

    // Pick the sharpest rear camera (autofocus main sensor over fixed-focus ultrawide).
    let selectedDeviceId: string | null = null;
    try {
      const best = await selectBestRearCamera();
      if (best && best.deviceId !== currentDeviceId) selectedDeviceId = best.deviceId;
    } catch {
      selectedDeviceId = null;
    }

    const videoConstraints = selectedDeviceId
      ? {
          deviceId: { exact: selectedDeviceId },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        }
      : { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } };

    const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: videoConstraints });
    await applyAutofocus(stream);
    return stream;
  } catch (error) {
    if (
      error instanceof DOMException &&
      (error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError" ||
        error.name === "NotFoundError" ||
        error.name === "DevicesNotFoundError" ||
        error.name === "NotReadableError" ||
        error.name === "TrackStartError")
    ) {
      throw error;
    }
    const fallbackStream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: "environment" } },
    });
    await applyAutofocus(fallbackStream);
    return fallbackStream;
  }
};

export default requestRearCameraStream;
