import type { ICameraCandidate } from './types';

/**
 * Pick the sharpest rear camera from an already-probed list:
 * autofocus (continuous/auto/single-shot) wins above all else, then the
 * highest-resolution sensor breaks the tie.
 */
const selectBestRearCamera = (cameras: ICameraCandidate[]): ICameraCandidate | null => {
  let best: ICameraCandidate | null = null;

  for (const candidate of cameras) {
    if (!best) {
      best = candidate;
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
