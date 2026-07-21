import {
  CARD_DETECTION_CONFIG,
  CAPTURE_RULES,
  CORNER_RADIUS_RATIO,
  DEFAULT_DETECTION_THRESHOLDS,
  EDGE_DELTA_THRESHOLD,
  EDGE_LUMA_DELTA_THRESHOLD,
  EDGE_SCAN_INSET_RATIO,
  ID_CARD_ASPECT_RATIO,
  PRESENCE_RULES,
  RELAXED_CAPTURE_RULES,
  RELAXED_PRESENCE_RULES,
  SCANNER_TIMING,
} from "./id-card-scanner-config";

// -----------------------------------------------------------------------------
// 1. Camera Management & Utilities
// -----------------------------------------------------------------------------

export type CameraState = "idle" | "requesting" | "ready" | "error";

export function cameraErrorMessage(error: unknown): string {
  if (!(error instanceof DOMException)) {
    return "ไม่สามารถเปิดกล้องได้ กรุณาลองใหม่อีกครั้ง";
  }

  switch (error.name) {
    case "NotAllowedError":
    case "SecurityError":
      return "ไม่ได้รับสิทธิ์ใช้กล้อง กรุณาอนุญาต Camera ในการตั้งค่าเบราว์เซอร์";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "ไม่พบกล้องบนอุปกรณ์นี้";
    case "NotReadableError":
    case "TrackStartError":
      return "กล้องกำลังถูกใช้งานโดยแอปอื่น กรุณาปิดแอปนั้นแล้วลองใหม่";
    case "OverconstrainedError":
      return "กล้องไม่รองรับค่าที่ร้องขอ กรุณาลองใช้อุปกรณ์หรือเบราว์เซอร์อื่น";
    default:
      return "เปิดกล้องไม่สำเร็จ กรุณาใช้ HTTPS และตรวจสอบสิทธิ์กล้อง";
  }
}

export function isConstraintError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === "OverconstrainedError" || error.name === "NotFoundError")
  );
}

export async function requestCamera(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { exact: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
  } catch (error) {
    if (!isConstraintError(error)) throw error;

    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    });
  }
}

/** Checks whether the current video track supports torch/flashlight toggling. */
export function isTorchSupported(stream: MediaStream): boolean {
  const track = stream.getVideoTracks()[0];
  if (!track) return false;
  try {
    const capabilities = track.getCapabilities?.();
    if (!capabilities) return false;
    // torch is part of Media Capture spec but not yet in all TS DOM type declarations
    return "torch" in capabilities && Reflect.get(capabilities, "torch") === true;
  } catch {
    return false;
  }
}

/** Toggles the torch/flashlight on the video track. Returns the new state. */
export async function setTorch(
  stream: MediaStream,
  on: boolean,
): Promise<boolean> {
  const track = stream.getVideoTracks()[0];
  if (!track) return false;
  try {
    // `torch` is a valid constraint per Media Capture spec but missing from TS DOM types
    // @ts-expect-error — torch constraint
    await track.applyConstraints({ advanced: [{ torch: on }] });
    return on;
  } catch {
    // Target state failed, retain previous state (!on)
    return !on;
  }
}

// -----------------------------------------------------------------------------
// 2. Geometry & ROI Helper Functions
// -----------------------------------------------------------------------------

export type SourceRect = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
};

/** Maps the visible CSS ROI to native video pixels when object-fit is cover. */
export function getSourceRect(
  video: HTMLVideoElement,
  roi: HTMLElement,
): SourceRect | null {
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
}

export function expandSourceRect(
  rect: SourceRect,
  videoWidth: number,
  videoHeight: number,
): SourceRect {
  const paddingX = rect.sw * CARD_DETECTION_CONFIG.analysisPaddingRatio;
  const paddingY = rect.sh * CARD_DETECTION_CONFIG.analysisPaddingRatio;
  const sx = Math.max(0, rect.sx - paddingX);
  const sy = Math.max(0, rect.sy - paddingY);
  const right = Math.min(videoWidth, rect.sx + rect.sw + paddingX);
  const bottom = Math.min(videoHeight, rect.sy + rect.sh + paddingY);

  return { sx, sy, sw: right - sx, sh: bottom - sy };
}

export function captureRoiImage(
  video: HTMLVideoElement,
  rect: SourceRect,
  quality: number,
): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(rect.sw);
  canvas.height = Math.round(rect.sh);
  const context = canvas.getContext("2d");
  if (!context) return null;

  context.drawImage(
    video,
    rect.sx,
    rect.sy,
    rect.sw,
    rect.sh,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  context.clearRect(0, 0, canvas.width, canvas.height);
  return dataUrl;
}

// -----------------------------------------------------------------------------
// 3. Pixel Analysis & Luma Metrics
// -----------------------------------------------------------------------------

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
        if (
          Math.abs(luma - currentLuma[pixelIndex - step]) > EDGE_DELTA_THRESHOLD
        ) {
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
    motion: previousLuma ? motionSum / samples : Number.POSITIVE_INFINITY,
    edgeDensity: comparisons ? edgeCount / comparisons : 0,
  };
}

// -----------------------------------------------------------------------------
// 4. Readiness Accumulator
// -----------------------------------------------------------------------------

export type ReadinessConfig = {
  stableFrames: number;
  minimumStableMs: number;
  acquireMissGraceFrames: number;
  readyMissGraceFrames: number;
};

export type ReadinessState = {
  stableSince: number | null;
  stableFrames: number;
  acquireMisses: number;
  readyMisses: number;
  isReady: boolean;
};

export function createReadinessState(): ReadinessState {
  return {
    stableSince: null,
    stableFrames: 0,
    acquireMisses: 0,
    readyMisses: 0,
    isReady: false,
  };
}

export function resetReadiness(state: ReadinessState) {
  state.stableSince = null;
  state.stableFrames = 0;
  state.acquireMisses = 0;
  state.readyMisses = 0;
  state.isReady = false;
}

export function updateReadiness(
  state: ReadinessState,
  isCandidate: boolean,
  now: number,
  config: ReadinessConfig,
) {
  if (isCandidate) {
    state.acquireMisses = 0;
    state.readyMisses = 0;

    if (!state.isReady) {
      state.stableFrames += 1;
      state.stableSince ??= now;
      state.isReady =
        state.stableFrames >= config.stableFrames &&
        now - state.stableSince >= config.minimumStableMs;
    }
    return state.isReady;
  }

  if (
    !state.isReady &&
    state.stableFrames > 0 &&
    state.acquireMisses < config.acquireMissGraceFrames
  ) {
    state.acquireMisses += 1;
    return false;
  }

  if (state.isReady && state.readyMisses < config.readyMissGraceFrames) {
    state.readyMisses += 1;
    return true;
  }

  resetReadiness(state);
  return false;
}

// -----------------------------------------------------------------------------
// 5. Card Edge Detection, Presence & Alignment Math
// -----------------------------------------------------------------------------

type EdgeMeasurement = {
  score: number;
  position: number;
};

type CardEdges = {
  top: EdgeMeasurement;
  right: EdgeMeasurement;
  bottom: EdgeMeasurement;
  left: EdgeMeasurement;
};

type EdgeScores = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type CornerScores = {
  topLeft: number;
  topRight: number;
  bottomRight: number;
  bottomLeft: number;
};

type GeometryMetrics = {
  edgeScores: EdgeScores;
  cornerScores: CornerScores;
  interiorBackgroundContrast: number;
  contrastScore: number;
  aspectScore: number;
  widthCoverage: number;
  heightCoverage: number;
  spanCoverage: number;
  averageEdgeScore: number;
  averageCornerScore: number;
  minimumEdgeScore: number;
  minimumCornerScore: number;
};

export type CardPresenceMetrics = {
  cardPresenceConfidence: number;
  spanCoverage: number;
  aspectScore: number;
  minimumEdgeScore: number;
  minimumCornerScore: number;
  meetsMinimumCard: boolean;
  meetsRelaxedCard: boolean;
};

export type CaptureAlignmentMetrics = {
  edgeScores: EdgeScores;
  cornerScores: CornerScores;
  interiorBackgroundContrast: number;
  aspectScore: number;
  coverageScore: number;
  captureConfidence: number;
  meetsMinimumGeometry: boolean;
  meetsRelaxedGeometry: boolean;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function alignUp(value: number, step: number) {
  return Math.ceil(value / step) * step;
}

function alignDown(value: number, step: number) {
  return Math.floor(value / step) * step;
}

function scoreEdgePositions(
  positionCount: number,
  positionSum: number,
  positionSquaredSum: number,
  positiveDirectionCount: number,
  scanlines: number,
  bandWidth: number,
  dimension: number,
): EdgeMeasurement {
  if (!positionCount || !scanlines) return { score: 0, position: 0 };

  const mean = positionSum / positionCount;
  const variance = Math.max(
    0,
    positionSquaredSum / positionCount - mean * mean,
  );
  const support = positionCount / scanlines;
  const alignment = clamp01(
    1 - Math.sqrt(variance) / Math.max(1, bandWidth * 0.45),
  );
  const consistentDirections = Math.max(
    positiveDirectionCount,
    positionCount - positiveDirectionCount,
  );
  const directionScore = clamp01(
    (consistentDirections / positionCount - 0.5) * 2,
  );

  return {
    score: support * (0.08 + alignment * 0.72 + directionScore * 0.2),
    position: mean / dimension,
  };
}

function measureVerticalEdge(
  luma: Uint8Array,
  width: number,
  height: number,
  bandStartRatio: number,
  bandEndRatio: number,
  step: number,
  scanStartRatio = EDGE_SCAN_INSET_RATIO,
  scanEndRatio = 1 - EDGE_SCAN_INSET_RATIO,
): EdgeMeasurement {
  const xStart = Math.max(step, alignUp(width * bandStartRatio, step));
  const xEnd = Math.min(
    width - step - 1,
    alignDown(width * bandEndRatio, step),
  );
  const yStart = Math.max(0, alignUp(height * scanStartRatio, step));
  const yEnd = Math.min(height - 1, alignDown(height * scanEndRatio, step));
  if (xEnd < xStart || yEnd < yStart) return { score: 0, position: 0 };

  let positionCount = 0;
  let positionSum = 0;
  let positionSquaredSum = 0;
  let positiveDirectionCount = 0;
  let scanlines = 0;

  for (let y = yStart; y <= yEnd; y += step) {
    let strongestDelta = 0;
    let strongestSignedDelta = 0;
    let strongestPosition = xStart;

    for (let x = xStart; x <= xEnd; x += step) {
      const signedDelta =
        luma[y * width + x + step] - luma[y * width + x - step];
      const delta = Math.abs(signedDelta);
      if (delta > strongestDelta) {
        strongestDelta = delta;
        strongestSignedDelta = signedDelta;
        strongestPosition = x;
      }
    }

    if (strongestDelta >= EDGE_LUMA_DELTA_THRESHOLD) {
      positionCount += 1;
      positionSum += strongestPosition;
      positionSquaredSum += strongestPosition * strongestPosition;
      if (strongestSignedDelta >= 0) positiveDirectionCount += 1;
    }
    scanlines += 1;
  }

  return scoreEdgePositions(
    positionCount,
    positionSum,
    positionSquaredSum,
    positiveDirectionCount,
    scanlines,
    xEnd - xStart + step,
    width,
  );
}

function measureHorizontalEdge(
  luma: Uint8Array,
  width: number,
  height: number,
  bandStartRatio: number,
  bandEndRatio: number,
  step: number,
  scanStartRatio = EDGE_SCAN_INSET_RATIO,
  scanEndRatio = 1 - EDGE_SCAN_INSET_RATIO,
): EdgeMeasurement {
  const yStart = Math.max(step, alignUp(height * bandStartRatio, step));
  const yEnd = Math.min(
    height - step - 1,
    alignDown(height * bandEndRatio, step),
  );
  const xStart = Math.max(0, alignUp(width * scanStartRatio, step));
  const xEnd = Math.min(width - 1, alignDown(width * scanEndRatio, step));
  if (yEnd < yStart || xEnd < xStart) return { score: 0, position: 0 };

  let positionCount = 0;
  let positionSum = 0;
  let positionSquaredSum = 0;
  let positiveDirectionCount = 0;
  let scanlines = 0;

  for (let x = xStart; x <= xEnd; x += step) {
    let strongestDelta = 0;
    let strongestSignedDelta = 0;
    let strongestPosition = yStart;

    for (let y = yStart; y <= yEnd; y += step) {
      const signedDelta =
        luma[(y + step) * width + x] - luma[(y - step) * width + x];
      const delta = Math.abs(signedDelta);
      if (delta > strongestDelta) {
        strongestDelta = delta;
        strongestSignedDelta = signedDelta;
        strongestPosition = y;
      }
    }

    if (strongestDelta >= EDGE_LUMA_DELTA_THRESHOLD) {
      positionCount += 1;
      positionSum += strongestPosition;
      positionSquaredSum += strongestPosition * strongestPosition;
      if (strongestSignedDelta >= 0) positiveDirectionCount += 1;
    }
    scanlines += 1;
  }

  return scoreEdgePositions(
    positionCount,
    positionSum,
    positionSquaredSum,
    positiveDirectionCount,
    scanlines,
    yEnd - yStart + step,
    height,
  );
}

function measureCorner(
  luma: Uint8Array,
  width: number,
  height: number,
  centerXRatio: number,
  centerYRatio: number,
  step: number,
) {
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
}

function measureCorners(
  luma: Uint8Array,
  width: number,
  height: number,
  edges: CardEdges,
  step: number,
): CornerScores {
  const { top, right, bottom, left } = edges;
  return {
    topLeft: measureCorner(
      luma,
      width,
      height,
      left.position,
      top.position,
      step,
    ),
    topRight: measureCorner(
      luma,
      width,
      height,
      right.position,
      top.position,
      step,
    ),
    bottomRight: measureCorner(
      luma,
      width,
      height,
      right.position,
      bottom.position,
      step,
    ),
    bottomLeft: measureCorner(
      luma,
      width,
      height,
      left.position,
      bottom.position,
      step,
    ),
  };
}

function measureInteriorBackgroundContrast(
  luma: Uint8Array,
  width: number,
  height: number,
  edges: CardEdges,
  step: number,
) {
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
}

function analyzeGeometry(
  luma: Uint8Array,
  width: number,
  height: number,
  edges: CardEdges,
  expectedSpan: number,
  aspectTolerance: number,
  step: number,
): GeometryMetrics {
  const edgeScores = {
    top: edges.top.score,
    right: edges.right.score,
    bottom: edges.bottom.score,
    left: edges.left.score,
  };
  const cornerScores = measureCorners(luma, width, height, edges, step);
  const detectedWidth =
    Math.max(0, edges.right.position - edges.left.position) * width;
  const detectedHeight =
    Math.max(0, edges.bottom.position - edges.top.position) * height;
  const detectedAspect = detectedHeight ? detectedWidth / detectedHeight : 0;
  const expectedAspect = width / height;
  const aspectError = detectedAspect
    ? Math.abs(Math.log(detectedAspect / expectedAspect))
    : Number.POSITIVE_INFINITY;
  const interiorBackgroundContrast = measureInteriorBackgroundContrast(
    luma,
    width,
    height,
    edges,
    step,
  );

  return {
    edgeScores,
    cornerScores,
    interiorBackgroundContrast,
    contrastScore: clamp01((interiorBackgroundContrast - 4) / 20),
    aspectScore: clamp01(1 - aspectError / aspectTolerance),
    widthCoverage: detectedWidth / (width * expectedSpan),
    heightCoverage: detectedHeight / (height * expectedSpan),
    spanCoverage: Math.min(
      detectedWidth / (width * expectedSpan),
      detectedHeight / (height * expectedSpan),
    ),
    averageEdgeScore:
      (edgeScores.top +
        edgeScores.right +
        edgeScores.bottom +
        edgeScores.left) /
      4,
    averageCornerScore:
      (cornerScores.topLeft +
        cornerScores.topRight +
        cornerScores.bottomRight +
        cornerScores.bottomLeft) /
      4,
    minimumEdgeScore: Math.min(
      edgeScores.top,
      edgeScores.right,
      edgeScores.bottom,
      edgeScores.left,
    ),
    minimumCornerScore: Math.min(
      cornerScores.topLeft,
      cornerScores.topRight,
      cornerScores.bottomRight,
      cornerScores.bottomLeft,
    ),
  };
}

function passesCoverageRules(
  metrics: GeometryMetrics,
  rules: {
    minEdgeScore: number;
    minCornerScore: number;
    minAspectScore: number;
    minSpanCoverage: number;
    maxSpanCoverage: number;
  },
) {
  return (
    metrics.minimumEdgeScore >= rules.minEdgeScore &&
    metrics.minimumCornerScore >= rules.minCornerScore &&
    metrics.aspectScore >= rules.minAspectScore &&
    metrics.widthCoverage >= rules.minSpanCoverage &&
    metrics.heightCoverage >= rules.minSpanCoverage &&
    metrics.widthCoverage <= rules.maxSpanCoverage &&
    metrics.heightCoverage <= rules.maxSpanCoverage
  );
}

const GUIDELINE_EDGES = (() => {
  const near =
    CARD_DETECTION_CONFIG.analysisPaddingRatio /
    (1 + CARD_DETECTION_CONFIG.analysisPaddingRatio * 2);
  return { near, far: 1 - near, span: 1 - near * 2 };
})();

export function detectCardPresence(
  luma: Uint8Array,
  width: number,
  height: number,
  step = 2,
): CardPresenceMetrics {
  const guide = GUIDELINE_EDGES;
  const searchOuterEdge = Math.max(0.02, guide.near - 0.025);
  const coarseEdges: CardEdges = {
    left: measureVerticalEdge(luma, width, height, searchOuterEdge, 0.46, step),
    right: measureVerticalEdge(
      luma,
      width,
      height,
      0.54,
      1 - searchOuterEdge,
      step,
    ),
    top: measureHorizontalEdge(
      luma,
      width,
      height,
      searchOuterEdge,
      0.46,
      step,
    ),
    bottom: measureHorizontalEdge(
      luma,
      width,
      height,
      0.54,
      1 - searchOuterEdge,
      step,
    ),
  };

  const refinementBand = 0.04;
  const spanInset = 0.018;
  const edges: CardEdges = {
    left: measureVerticalEdge(
      luma,
      width,
      height,
      coarseEdges.left.position - refinementBand,
      coarseEdges.left.position + refinementBand,
      step,
      coarseEdges.top.position + spanInset,
      coarseEdges.bottom.position - spanInset,
    ),
    right: measureVerticalEdge(
      luma,
      width,
      height,
      coarseEdges.right.position - refinementBand,
      coarseEdges.right.position + refinementBand,
      step,
      coarseEdges.top.position + spanInset,
      coarseEdges.bottom.position - spanInset,
    ),
    top: measureHorizontalEdge(
      luma,
      width,
      height,
      coarseEdges.top.position - refinementBand,
      coarseEdges.top.position + refinementBand,
      step,
      coarseEdges.left.position + spanInset,
      coarseEdges.right.position - spanInset,
    ),
    bottom: measureHorizontalEdge(
      luma,
      width,
      height,
      coarseEdges.bottom.position - refinementBand,
      coarseEdges.bottom.position + refinementBand,
      step,
      coarseEdges.left.position + spanInset,
      coarseEdges.right.position - spanInset,
    ),
  };
  const metrics = analyzeGeometry(
    luma,
    width,
    height,
    edges,
    guide.span,
    0.18,
    step,
  );
  const coverageConfidence = clamp01(
    (metrics.spanCoverage - PRESENCE_RULES.minSpanCoverage) / 0.35,
  );
  const cardPresenceConfidence = clamp01(
    metrics.averageEdgeScore * 0.42 +
      metrics.averageCornerScore * 0.23 +
      metrics.aspectScore * 0.18 +
      metrics.contrastScore * 0.1 +
      coverageConfidence * 0.07,
  );

  return {
    cardPresenceConfidence,
    spanCoverage: metrics.spanCoverage,
    aspectScore: metrics.aspectScore,
    minimumEdgeScore: metrics.minimumEdgeScore,
    minimumCornerScore: metrics.minimumCornerScore,
    meetsMinimumCard: passesCoverageRules(metrics, PRESENCE_RULES),
    meetsRelaxedCard: passesCoverageRules(metrics, RELAXED_PRESENCE_RULES),
  };
}

function isInsideGuide(
  edges: CardEdges,
  near: number,
  far: number,
  tolerance: number,
) {
  return (
    edges.left.position >= near - tolerance &&
    edges.right.position <= far + tolerance &&
    edges.top.position >= near - tolerance &&
    edges.bottom.position <= far + tolerance
  );
}

export function detectCaptureAlignment(
  luma: Uint8Array,
  width: number,
  height: number,
  step = 2,
): CaptureAlignmentMetrics {
  const guide = GUIDELINE_EDGES;
  const innerSearchAllowance = guide.span * 0.12;
  const nearStart = Math.max(0, guide.near - CAPTURE_RULES.outerTolerance);
  const nearEnd = guide.near + innerSearchAllowance;
  const farStart = guide.far - innerSearchAllowance;
  const farEnd = Math.min(1, guide.far + CAPTURE_RULES.outerTolerance);
  const edges: CardEdges = {
    top: measureHorizontalEdge(luma, width, height, nearStart, nearEnd, step),
    right: measureVerticalEdge(luma, width, height, farStart, farEnd, step),
    bottom: measureHorizontalEdge(luma, width, height, farStart, farEnd, step),
    left: measureVerticalEdge(luma, width, height, nearStart, nearEnd, step),
  };
  const metrics = analyzeGeometry(
    luma,
    width,
    height,
    edges,
    guide.span,
    0.14,
    step,
  );
  const captureConfidence = clamp01(
    metrics.averageEdgeScore * 0.42 +
      metrics.averageCornerScore * 0.18 +
      metrics.contrastScore * 0.15 +
      metrics.aspectScore * 0.15 +
      clamp01(metrics.spanCoverage) * 0.1,
  );

  return {
    edgeScores: metrics.edgeScores,
    cornerScores: metrics.cornerScores,
    interiorBackgroundContrast: metrics.interiorBackgroundContrast,
    aspectScore: metrics.aspectScore,
    coverageScore: clamp01(metrics.spanCoverage),
    captureConfidence,
    meetsMinimumGeometry:
      passesCoverageRules(metrics, CAPTURE_RULES) &&
      isInsideGuide(edges, guide.near, guide.far, CAPTURE_RULES.outerTolerance),
    meetsRelaxedGeometry:
      passesCoverageRules(metrics, RELAXED_CAPTURE_RULES) &&
      isInsideGuide(
        edges,
        guide.near,
        guide.far,
        RELAXED_CAPTURE_RULES.outerTolerance,
      ),
  };
}

// -----------------------------------------------------------------------------
// 6. Frame Processing Pipeline Evaluation
// -----------------------------------------------------------------------------

export type DetectionState =
  | "searching"
  | "card-detected"
  | "hold-still"
  | "stable";

export type ScannerDetectionThresholds = {
  sampleIntervalMs: number;
  motionEnterThreshold: number;
  motionExitThreshold: number;
  presenceConfidenceEnter: number;
  presenceConfidenceExit: number;
  captureConfidenceEnter: number;
  captureConfidenceExit: number;
};

export type FrameProcessingParams = {
  video: HTMLVideoElement;
  roi: HTMLElement;
  now: number;
  canvas: HTMLCanvasElement | null;
  previousLuma: Uint8Array | null;
  currentLuma: Uint8Array | null;
  readiness: ReadinessState;
  readinessConfig: ReadinessConfig;
  hasDetectedCard: boolean;
  isCaptureAligned: boolean;
  thresholds?: Partial<ScannerDetectionThresholds>;
  sourceRect?: SourceRect | null;
};

export type FrameProcessingResult = {
  sourceRect: SourceRect;
  canvas: HTMLCanvasElement;
  previousLuma: Uint8Array;
  currentLuma: Uint8Array;
  detectionState: DetectionState;
  hasDetectedCard: boolean;
  isCaptureAligned: boolean;
  isCaptureReady: boolean;
};

export function processScannerFrame({
  video,
  roi,
  now,
  canvas: inputCanvas,
  previousLuma,
  currentLuma: inputCurrentLuma,
  readiness,
  readinessConfig,
  hasDetectedCard: prevHasDetectedCard,
  isCaptureAligned: prevIsCaptureAligned,
  thresholds: customThresholds,
  sourceRect: inputSourceRect,
}: FrameProcessingParams): FrameProcessingResult | null {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null;

  const thresholds = { ...DEFAULT_DETECTION_THRESHOLDS, ...customThresholds };

  const sourceRect = inputSourceRect ?? getSourceRect(video, roi);
  if (!sourceRect) return null;

  const analysisSourceRect = expandSourceRect(
    sourceRect,
    video.videoWidth,
    video.videoHeight,
  );

  let canvas = inputCanvas;
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = SCANNER_TIMING.ANALYSIS_WIDTH;
    canvas.height = SCANNER_TIMING.ANALYSIS_HEIGHT;
  }
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  context.drawImage(
    video,
    analysisSourceRect.sx,
    analysisSourceRect.sy,
    analysisSourceRect.sw,
    analysisSourceRect.sh,
    0,
    0,
    SCANNER_TIMING.ANALYSIS_WIDTH,
    SCANNER_TIMING.ANALYSIS_HEIGHT,
  );

  const pixels = context.getImageData(
    0,
    0,
    SCANNER_TIMING.ANALYSIS_WIDTH,
    SCANNER_TIMING.ANALYSIS_HEIGHT,
  ).data;

  const pixelCount =
    SCANNER_TIMING.ANALYSIS_WIDTH * SCANNER_TIMING.ANALYSIS_HEIGHT;
  let currentLuma = inputCurrentLuma;
  if (!currentLuma || currentLuma.length !== pixelCount) {
    currentLuma = new Uint8Array(pixelCount);
  }

  const step = 2;
  const { mean, variance, motion, edgeDensity } = analyzeFramePixels(
    pixels,
    currentLuma,
    previousLuma,
    SCANNER_TIMING.ANALYSIS_WIDTH,
    SCANNER_TIMING.ANALYSIS_HEIGHT,
    step,
  );

  const nextPreviousLuma = currentLuma;
  const nextCurrentLuma = previousLuma ?? new Uint8Array(pixelCount);

  const hasUsableLight = mean > 42 && mean < 225;
  const hasCardDetails =
    hasUsableLight && variance > 260 && edgeDensity > 0.012;
  const hasPresenceDetails =
    mean > 24 && mean < 235 && variance > 120 && edgeDensity > 0.003;

  const cardPresence = detectCardPresence(
    currentLuma,
    SCANNER_TIMING.ANALYSIS_WIDTH,
    SCANNER_TIMING.ANALYSIS_HEIGHT,
    step,
  );

  const presenceConfidenceThreshold = prevHasDetectedCard
    ? thresholds.presenceConfidenceExit
    : thresholds.presenceConfidenceEnter;

  const meetsPresenceGeometry = prevHasDetectedCard
    ? cardPresence.meetsRelaxedCard
    : cardPresence.meetsMinimumCard;

  const hasPresenceCard =
    hasPresenceDetails &&
    meetsPresenceGeometry &&
    cardPresence.cardPresenceConfidence >= presenceConfidenceThreshold;

  const captureAlignment = hasCardDetails
    ? detectCaptureAlignment(
        currentLuma,
        SCANNER_TIMING.ANALYSIS_WIDTH,
        SCANNER_TIMING.ANALYSIS_HEIGHT,
        step,
      )
    : null;

  const captureConfidenceThreshold = prevIsCaptureAligned
    ? thresholds.captureConfidenceExit
    : thresholds.captureConfidenceEnter;

  const meetsCaptureGeometry = prevIsCaptureAligned
    ? captureAlignment?.meetsRelaxedGeometry
    : captureAlignment?.meetsMinimumGeometry;

  const isCaptureAligned =
    captureAlignment !== null &&
    meetsCaptureGeometry === true &&
    captureAlignment.captureConfidence >= captureConfidenceThreshold;

  const hasDetectedCard = hasPresenceCard || isCaptureAligned;

  const wasCaptureReady = readiness.isReady;
  const motionThreshold = wasCaptureReady
    ? thresholds.motionExitThreshold
    : thresholds.motionEnterThreshold;

  const isMotionStable = previousLuma !== null && motion < motionThreshold;

  const isCaptureReady = updateReadiness(
    readiness,
    isCaptureAligned && isMotionStable,
    now,
    readinessConfig,
  );

  const detectionState: DetectionState = isCaptureReady
    ? "stable"
    : isCaptureAligned
      ? "hold-still"
      : hasDetectedCard
        ? "card-detected"
        : "searching";

  return {
    sourceRect,
    canvas,
    previousLuma: nextPreviousLuma,
    currentLuma: nextCurrentLuma,
    detectionState,
    hasDetectedCard,
    isCaptureAligned,
    isCaptureReady,
  };
}
