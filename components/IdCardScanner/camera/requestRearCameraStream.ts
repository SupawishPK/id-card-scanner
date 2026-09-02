/**
 * NOTE: Request the rear camera at the highest resolution the device supports.
 *
 * Uses `ideal` constraints far above typical hardware so the browser delivers
 * the maximum available (e.g. 4K / 3840×2160) without failing on devices
 * that cap lower.
 *
 * Fallback: if the primary request fails (e.g. device busy), retries with
 * only the facingMode constraint — resolution defaults to device native.
 */
const requestRearCameraStream = async (): Promise<MediaStream> => {
  const constraints: MediaStreamConstraints = {
    audio: false,
    video: {
      facingMode: { ideal: "environment" },
    },
  };

  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
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
    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: "environment" } },
    });
  }
};

export default requestRearCameraStream;
