import type { ICameraCandidate } from './types';

/**
 * Rank a rear lens for close-range scanning. A lens with autofocus is the most
 * important property; the main wide sensor is preferred over the ultra-wide,
 * which usually has fixed focus and looks soft up close.
 */
const score = (camera: ICameraCandidate): number => {
  let value = 0;
  if (camera.hasAutofocus) value += 2;
  if (camera.lensKind === 'main-wide') value += 1;
  if (camera.lensKind === 'ultra-wide') value -= 1;
  return value;
};

const selectDefaultCamera = (cameras: ICameraCandidate[]): ICameraCandidate | null => {
  if (cameras.length === 0) return null;
  return [...cameras].sort((a, b) => score(b) - score(a))[0];
};

export default selectDefaultCamera;
