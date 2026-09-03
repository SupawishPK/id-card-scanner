export type CameraMode = 'best' | 'index' | 'manual';

export type CameraScreen = 'intro' | 'loading' | 'live' | 'error';

export type CameraErrorKind = 'denied' | 'not-allowed' | 'no-camera' | 'generic';

export type LensKind = 'main-wide' | 'ultra-wide' | 'unknown';

export interface IZoomRange {
  min: number;
  max: number;
}

export interface ICameraCandidate {
  deviceId: string;
  label: string;
  index: number;
  facingMode: string[];
  focusModes: string[];
  hasAutofocus: boolean;
  zoom: IZoomRange | null;
  maxWidth: number;
  maxHeight: number;
  maxResolution: number;
  lensKind: LensKind;
}

export interface ICameraError {
  kind: CameraErrorKind;
  message: string;
}
