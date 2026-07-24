export type ICameraState = "idle" | "requesting" | "ready" | "error";

export type ITrackCapabilities = MediaTrackCapabilities & {
  torch?: boolean;
};

export const requestCamera = async (): Promise<MediaStream> => {
  const constraints: MediaStreamConstraints = {
    audio: false,
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    },
  };

  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch {
    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: "environment" } },
    });
  }
};

export const isTorchSupported = (stream: MediaStream): boolean => {
  const track = stream.getVideoTracks()[0];
  if (!track) return false;
  const capabilities = track.getCapabilities() as ITrackCapabilities;
  return Boolean(capabilities.torch);
};

export const setTorch = async (
  stream: MediaStream,
  enabled: boolean,
): Promise<boolean> => {
  const track = stream.getVideoTracks()[0];
  if (!track) return false;

  try {
    await track.applyConstraints({
      advanced: [{ torch: enabled } as MediaTrackConstraintSet],
    });
    return enabled;
  } catch {
    return false;
  }
};

export const cameraErrorMessage = (error: unknown): string => {
  if (error instanceof DOMException) {
    if (
      error.name === "NotAllowedError" ||
      error.name === "PermissionDeniedError"
    ) {
      return "กรุณะอนุญาตให้ใช้งานกล้อง เพื่อสแกนบัตรประชาชน";
    }
    if (
      error.name === "NotFoundError" ||
      error.name === "DevicesNotFoundError"
    ) {
      return "ไม่พบกล้องในอุปกรณ์ของคุณ";
    }
    if (error.name === "NotReadableError" || error.name === "TrackStartError") {
      return "กล้องถูกใช้งานโดยแอปพลิเคชันอื่นอยู่ กรุณาปิดแอปอื่นแล้วลองใหม่";
    }
  }
  return "เกิดข้อผิดพลาดในการเปิดกล้อง กรุณาลองใหม่อีกครั้ง";
};
