export const FOCUS_MODES = ['continuous', 'auto', 'single-shot'] as const;

export type FocusMode = (typeof FOCUS_MODES)[number];

export const FOCUSABLE_MODES: readonly string[] = FOCUS_MODES;

export interface IZoomRange {
  min: number;
  max: number;
}

export interface IMinMaxRange {
  min?: number;
  max?: number;
  step?: number;
}

/**
 * Camera capabilities reported by `MediaStreamTrack.getCapabilities()`.
 * Extends the standard `MediaTrackCapabilities` with the non-standard (but
 * widely supported) video fields that Chromium exposes on mobile devices.
 */
export interface ICameraCapabilities extends MediaTrackCapabilities {
  focusMode?: string[];
  focusDistance?: IMinMaxRange;
  zoom?: IZoomRange;
  iso?: IMinMaxRange;
  exposureTime?: IMinMaxRange;
  exposureCompensation?: IMinMaxRange;
  colorTemperature?: IMinMaxRange;
  whiteBalanceMode?: string[];
  exposureMode?: string[];
  torch?: boolean;
  pan?: IMinMaxRange;
  tilt?: IMinMaxRange;
}

/** Actual track values reported by `MediaStreamTrack.getSettings()`. */
export interface ICameraSettings extends MediaTrackSettings {
  focusMode?: string;
  focusDistance?: number;
  iso?: number;
  exposureTime?: number;
  exposureCompensation?: number;
  colorTemperature?: number;
  exposureMode?: string;
  pan?: number;
  tilt?: number;
}

export interface IFocusConstraint extends MediaTrackConstraintSet {
  focusMode?: FocusMode;
}
