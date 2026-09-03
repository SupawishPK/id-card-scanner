import { LENS_PRIORITY } from './lens';
import type { ICameraCandidate } from './types';

/**
 * Pick the sharpest rear camera from an already-probed list.
 *
 * Priority:
 *   1. main-wide lens (zoom.min >= 1) over ultra-wide over unknown,
 *   2. autofocus (continuous/auto/single-shot) over fixed-focus,
 *   3. highest-resolution sensor.
 */
const selectBestRearCamera = (cameras: ICameraCandidate[]): ICameraCandidate | null => {
  let best: ICameraCandidate | null = null;

  for (const candidate of cameras) {
    if (!best) {
      best = candidate;
      continue;
    }

    const bestPriority = LENS_PRIORITY[best.lensKind];
    const candidatePriority = LENS_PRIORITY[candidate.lensKind];
    if (candidatePriority !== bestPriority) {
      if (candidatePriority > bestPriority) best = candidate;
      continue;
    }

    if (candidate.hasAutofocus !== best.hasAutofocus) {
      if (candidate.hasAutofocus) best = candidate;
      continue;
    }

    if (candidate.maxResolution > best.maxResolution) best = candidate;
  }

  return best;
};

export default selectBestRearCamera;
