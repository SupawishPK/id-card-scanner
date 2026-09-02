export type CameraMode = 'best' | 'index' | 'manual';

export type CameraErrorKind =
  | 'denied'
  | 'not-allowed'
  | 'no-camera'
  | 'generic';

export interface ICameraCandidate {
  deviceId: string;
  label: string;
  hasAutofocus: boolean;
  maxResolution: number;
  index: number;
}
