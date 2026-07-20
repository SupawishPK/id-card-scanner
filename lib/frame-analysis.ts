const EDGE_DELTA_THRESHOLD = 24;

export type FrameAnalysis = {
  mean: number;
  variance: number;
  motion: number;
  edgeDensity: number;
};

/** Converts sampled RGBA pixels to luma and computes low-cost frame metrics. */
export function analyzeFramePixels(
  pixels: Uint8ClampedArray,
  currentLuma: Uint8Array,
  previousLuma: Uint8Array | null,
  width: number,
  height: number,
  step: number,
): FrameAnalysis {
  let sum = 0;
  let sumSquares = 0;
  let motionSum = 0;
  let edgeCount = 0;
  let comparisons = 0;
  let samples = 0;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const pixelIndex = y * width + x;
      const rgbaIndex = pixelIndex * 4;
      const luma = Math.round(
        pixels[rgbaIndex] * 0.299 +
          pixels[rgbaIndex + 1] * 0.587 +
          pixels[rgbaIndex + 2] * 0.114,
      );
      currentLuma[pixelIndex] = luma;
      sum += luma;
      sumSquares += luma * luma;
      samples += 1;

      if (previousLuma) {
        motionSum += Math.abs(luma - previousLuma[pixelIndex]);
      }
      if (x >= step) {
        if (Math.abs(luma - currentLuma[pixelIndex - step]) > EDGE_DELTA_THRESHOLD) {
          edgeCount += 1;
        }
        comparisons += 1;
      }
      if (y >= step) {
        if (
          Math.abs(luma - currentLuma[pixelIndex - step * width]) >
          EDGE_DELTA_THRESHOLD
        ) {
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
    motion: previousLuma
      ? motionSum / samples
      : Number.POSITIVE_INFINITY,
    edgeDensity: comparisons ? edgeCount / comparisons : 0,
  };
}
