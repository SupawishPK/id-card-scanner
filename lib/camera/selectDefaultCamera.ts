import type { ICameraCandidate } from './types';

/**
 * Pick the default rear camera from capabilities only — no device-label text
 * and no lens-type guessing. Prefer autofocus (important for close-up scans),
 * then the highest sensor resolution.
 */
const selectDefaultCamera = (cameras: ICameraCandidate[]): ICameraCandidate | null => {
  if (cameras.length === 0) return null;
  return [...cameras].sort((a, b) => {
    if (a.hasAutofocus !== b.hasAutofocus) return a.hasAutofocus ? -1 : 1;
    return b.maxResolution - a.maxResolution;
  })[0];
};

export default selectDefaultCamera;
