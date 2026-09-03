import type { IZoomRange } from './types';

export const FOCUS_MODES = ['continuous', 'auto', 'single-shot'] as const;

export type FocusMode = (typeof FOCUS_MODES)[number];

export interface ICameraCapabilities extends MediaTrackCapabilities {
  focusMode?: FocusMode[];
  zoom?: IZoomRange;
}

export interface IFocusConstraint extends MediaTrackConstraintSet {
  focusMode?: FocusMode;
}
