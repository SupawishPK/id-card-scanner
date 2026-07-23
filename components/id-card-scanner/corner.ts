import { CORNER_RADIUS_RATIO, EDGE_LUMA_DELTA_THRESHOLD } from "./config";
import {
  alignDown,
  alignUp,
  type ICardEdges,
  type ICornerScores,
} from "./edge";

export type IMeasureCornerParams = {
  luma: Uint8Array;
  width: number;
  height: number;
  centerXRatio: number;
  centerYRatio: number;
  step: number;
};

export const measureCornerScore = ({
  luma,
  width,
  height,
  centerXRatio,
  centerYRatio,
  step,
}: IMeasureCornerParams): number => {
  const xRadius = width * CORNER_RADIUS_RATIO;
  const yRadius = height * CORNER_RADIUS_RATIO;
  const xStart = Math.max(step, alignUp(width * centerXRatio - xRadius, step));
  const xEnd = Math.min(
    width - step - 1,
    alignDown(width * centerXRatio + xRadius, step),
  );
  const yStart = Math.max(step, alignUp(height * centerYRatio - yRadius, step));
  const yEnd = Math.min(
    height - step - 1,
    alignDown(height * centerYRatio + yRadius, step),
  );
  let verticalSupports = 0;
  let horizontalSupports = 0;
  let verticalScanlines = 0;
  let horizontalScanlines = 0;

  for (let y = yStart; y <= yEnd; y += step) {
    let strongest = 0;
    for (let x = xStart; x <= xEnd; x += step) {
      strongest = Math.max(
        strongest,
        Math.abs(luma[y * width + x + step] - luma[y * width + x - step]),
      );
    }
    if (strongest >= EDGE_LUMA_DELTA_THRESHOLD) verticalSupports += 1;
    verticalScanlines += 1;
  }

  for (let x = xStart; x <= xEnd; x += step) {
    let strongest = 0;
    for (let y = yStart; y <= yEnd; y += step) {
      strongest = Math.max(
        strongest,
        Math.abs(luma[(y + step) * width + x] - luma[(y - step) * width + x]),
      );
    }
    if (strongest >= EDGE_LUMA_DELTA_THRESHOLD) horizontalSupports += 1;
    horizontalScanlines += 1;
  }

  const verticalScore = verticalScanlines
    ? verticalSupports / verticalScanlines
    : 0;
  const horizontalScore = horizontalScanlines
    ? horizontalSupports / horizontalScanlines
    : 0;
  return Math.sqrt(verticalScore * horizontalScore);
};

export type IScorerGridParams = {
  luma: Uint8Array;
  width: number;
  height: number;
  edges: ICardEdges;
  step: number;
};

export const measureAllCornersScores = ({
  luma,
  width,
  height,
  edges,
  step,
}: IScorerGridParams): ICornerScores => {
  const { top, right, bottom, left } = edges;
  return {
    topLeft: measureCornerScore({
      luma,
      width,
      height,
      centerXRatio: left.position,
      centerYRatio: top.position,
      step,
    }),
    topRight: measureCornerScore({
      luma,
      width,
      height,
      centerXRatio: right.position,
      centerYRatio: top.position,
      step,
    }),
    bottomRight: measureCornerScore({
      luma,
      width,
      height,
      centerXRatio: right.position,
      centerYRatio: bottom.position,
      step,
    }),
    bottomLeft: measureCornerScore({
      luma,
      width,
      height,
      centerXRatio: left.position,
      centerYRatio: top.position,
      step,
    }),
  };
};

export const calculateInteriorBackgroundContrast = ({
  luma,
  width,
  height,
  edges,
  step,
}: IScorerGridParams): number => {
  const interiorInset = 0.025;
  const backgroundInset = 0.012;
  const { top, right, bottom, left } = edges;

  const intLeft = (left.position + interiorInset) * width;
  const intRight = (right.position - interiorInset) * width;
  const intTop = (top.position + interiorInset) * height;
  const intBottom = (bottom.position - interiorInset) * height;

  const bgLeft = (left.position - backgroundInset) * width;
  const bgRight = (right.position + backgroundInset) * width;
  const bgTop = (top.position - backgroundInset) * height;
  const bgBottom = (bottom.position + backgroundInset) * height;

  let interiorSum = 0;
  let interiorSamples = 0;
  let backgroundSum = 0;
  let backgroundSamples = 0;

  for (let y = 0; y < height; y += step) {
    const isIntY = y > intTop && y < intBottom;
    const isBgY = y < bgTop || y > bgBottom;
    const rowOffset = y * width;

    for (let x = 0; x < width; x += step) {
      const isInterior = isIntY && x > intLeft && x < intRight;
      const isBackground = isBgY || x < bgLeft || x > bgRight;
      const value = luma[rowOffset + x];

      if (isInterior) {
        interiorSum += value;
        interiorSamples += 1;
      } else if (isBackground) {
        backgroundSum += value;
        backgroundSamples += 1;
      }
    }
  }

  if (!interiorSamples || !backgroundSamples) return 0;
  return Math.abs(
    interiorSum / interiorSamples - backgroundSum / backgroundSamples,
  );
};
