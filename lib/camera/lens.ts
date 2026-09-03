import type { IZoomRange } from './capabilities';
import type { LensKind } from './types';

export const MAIN_WIDE_MIN_ZOOM = 1;

export const LENS_PRIORITY: Record<LensKind, number> = {
  'main-wide': 2,
  unknown: 1,
  'ultra-wide': 0,
};

/**
 * Classify a rear camera's lens from its zoom capability.
 *
 * Samsung devices report `zoom.min ≈ 0.5` for the ultra-wide lens and
 * `zoom.min >= 1` for the main wide sensor. Browsers without zoom capability
 * (e.g. Safari on iOS) fall back to 'unknown', where the autofocus/resolution
 * heuristic takes over.
 */
export const classifyLens = (zoom: IZoomRange | null): LensKind => {
  if (!zoom) return 'unknown';
  return zoom.min >= MAIN_WIDE_MIN_ZOOM ? 'main-wide' : 'ultra-wide';
};
