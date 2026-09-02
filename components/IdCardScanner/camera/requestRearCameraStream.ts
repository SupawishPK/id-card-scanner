/**
 * NOTE: Request the rear camera at a resolution sharp enough for OCR/edge
 * detection. The `ideal` value is a hint — the browser delivers the highest
 * resolution it supports up to 1080p (falling back gracefully, unlike `exact`).
 *
 * Fallback: if the primary request fails (e.g. device busy), retries with
 * only the facingMode constraint — resolution defaults to device native.
 */
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
const applyAutofocus = async (stream: MediaStream): Promise<void> => {
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
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
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
