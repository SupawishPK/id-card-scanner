import { EDGE_DELTA_THRESHOLD } from "./config";

export type IFrameAnalysis = {
  mean: number;
  variance: number;
  motion: number;
  edgeDensity: number;
};

export type IAnalyzePixelsParams = {
  pixels: Uint8ClampedArray;
  currentLuma: Uint8Array;
  previousLuma: Uint8Array | null;
  width: number;
  height: number;
  step: number;
};

export const analyzeFramePixels = ({
  pixels,
  currentLuma,
  previousLuma,
  width,
  height,
  step,
}: IAnalyzePixelsParams): IFrameAnalysis => {
  let sum = 0;
  let sumSquares = 0;
  let motionSum = 0;
  let edgeCount = 0;
  let comparisons = 0;
  let samples = 0;

  for (let y = 0; y < height; y += step) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x += step) {
      const pixelIndex = rowOffset + x;
      const rgbaIndex = pixelIndex << 2;
      const r = pixels[rgbaIndex];
      const g = pixels[rgbaIndex + 1];
      const b = pixels[rgbaIndex + 2];
      const luma = (r * 77 + g * 150 + b * 29) >> 8;

      currentLuma[pixelIndex] = luma;
      sum += luma;
      sumSquares += luma * luma;
      samples += 1;

      if (previousLuma) {
        const diff = luma - previousLuma[pixelIndex];
        motionSum += diff < 0 ? -diff : diff;
      }
      if (x >= step) {
        const hDiff = luma - currentLuma[pixelIndex - step];
        if ((hDiff < 0 ? -hDiff : hDiff) > EDGE_DELTA_THRESHOLD) {
          edgeCount += 1;
        }
        comparisons += 1;
      }
      if (y >= step) {
        const vDiff = luma - currentLuma[pixelIndex - step * width];
        if ((vDiff < 0 ? -vDiff : vDiff) > EDGE_DELTA_THRESHOLD) {
          edgeCount += 1;
        }
        comparisons += 1;
      }
    }
  }

  const mean = sum / samples;
  return {
    mean,
    variance: Math.max(0, sumSquares / samples - mean * mean),
    motion: previousLuma ? motionSum / samples : Number.POSITIVE_INFINITY,
    edgeDensity: comparisons ? edgeCount / comparisons : 0,
  };
};

export type IReadinessConfig = {
  stableFrames: number;
  minimumStableMs: number;
  acquireMissGraceFrames: number;
  readyMissGraceFrames: number;
};

export type IReadinessState = {
  stableSince: number | null;
  stableFrames: number;
  acquireMisses: number;
  readyMisses: number;
  isReady: boolean;
};

export const INITIAL_READINESS_STATE: IReadinessState = Object.freeze({
  stableSince: null,
  stableFrames: 0,
  acquireMisses: 0,
  readyMisses: 0,
  isReady: false,
});

export const createReadinessState = (): IReadinessState => ({
  ...INITIAL_READINESS_STATE,
});

export type IUpdateReadinessParams = {
  state: IReadinessState;
  isCandidate: boolean;
  now: number;
  config: IReadinessConfig;
};

export type IReadinessResult = {
  nextState: IReadinessState;
  isReady: boolean;
};

export const updateReadinessState = ({
  state,
  isCandidate,
  now,
  config,
}: IUpdateReadinessParams): IReadinessResult => {
  if (isCandidate) {
    if (!state.isReady) {
      const stableFrames = state.stableFrames + 1;
      const stableSince = state.stableSince ?? now;
      const isReady =
        stableFrames >= config.stableFrames &&
        now - stableSince >= config.minimumStableMs;

      return {
        isReady,
        nextState: {
          stableSince,
          stableFrames,
          acquireMisses: 0,
          readyMisses: 0,
          isReady,
        },
      };
    }

    return {
      isReady: true,
      nextState: { ...state, acquireMisses: 0, readyMisses: 0 },
    };
  }

  if (
    !state.isReady &&
    state.stableFrames > 0 &&
    state.acquireMisses < config.acquireMissGraceFrames
  ) {
    return {
      isReady: false,
      nextState: { ...state, acquireMisses: state.acquireMisses + 1 },
    };
  }

  if (state.isReady && state.readyMisses < config.readyMissGraceFrames) {
    return {
      isReady: true,
      nextState: { ...state, readyMisses: state.readyMisses + 1 },
    };
  }

  return {
    isReady: false,
    nextState: createReadinessState(),
  };
};
