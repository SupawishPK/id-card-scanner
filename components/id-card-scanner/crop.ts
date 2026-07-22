import { CARD_DETECTION_CONFIG } from "./config";

export type IRoiBounds = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
};

export const getRoiBounds = (
  video: HTMLVideoElement,
  roi: HTMLElement,
): IRoiBounds | null => {
  const videoWidth = video.videoWidth;
  const videoHeight = video.videoHeight;
  if (!videoWidth || !videoHeight) return null;

  const videoBox = video.getBoundingClientRect();
  const roiBox = roi.getBoundingClientRect();
  if (!videoBox.width || !videoBox.height) return null;

  const coverScale = Math.max(
    videoBox.width / videoWidth,
    videoBox.height / videoHeight,
  );
  const renderedWidth = videoWidth * coverScale;
  const renderedHeight = videoHeight * coverScale;
  const cropOffsetX = (renderedWidth - videoBox.width) / 2;
  const cropOffsetY = (renderedHeight - videoBox.height) / 2;

  const rawX = (roiBox.left - videoBox.left + cropOffsetX) / coverScale;
  const rawY = (roiBox.top - videoBox.top + cropOffsetY) / coverScale;
  const rawWidth = roiBox.width / coverScale;
  const rawHeight = roiBox.height / coverScale;
  const sx = Math.max(0, Math.min(videoWidth - 1, rawX));
  const sy = Math.max(0, Math.min(videoHeight - 1, rawY));

  return {
    sx,
    sy,
    sw: Math.max(1, Math.min(videoWidth - sx, rawWidth)),
    sh: Math.max(1, Math.min(videoHeight - sy, rawHeight)),
  };
};

export const expandRoiBounds = (
  bounds: IRoiBounds,
  videoWidth: number,
  videoHeight: number,
): IRoiBounds => {
  const paddingX = bounds.sw * CARD_DETECTION_CONFIG.analysisPaddingRatio;
  const paddingY = bounds.sh * CARD_DETECTION_CONFIG.analysisPaddingRatio;
  const sx = Math.max(0, bounds.sx - paddingX);
  const sy = Math.max(0, bounds.sy - paddingY);
  const right = Math.min(videoWidth, bounds.sx + bounds.sw + paddingX);
  const bottom = Math.min(videoHeight, bounds.sy + bounds.sh + paddingY);

  return { sx, sy, sw: right - sx, sh: bottom - sy };
};

export const captureRoiImage = (
  video: HTMLVideoElement,
  bounds: IRoiBounds,
): string | null => {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bounds.sw);
  canvas.height = Math.round(bounds.sh);
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.drawImage(
    video,
    bounds.sx,
    bounds.sy,
    bounds.sw,
    bounds.sh,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const dataUrl = canvas.toDataURL("image/png");
  context.clearRect(0, 0, canvas.width, canvas.height);
  return dataUrl;
};
