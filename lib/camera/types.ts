import type { ICameraCapabilities, ICameraSettings } from './capabilities';

export type CameraMode = 'auto' | 'best' | 'index' | 'manual';

export type CameraScreen = 'intro' | 'loading' | 'live' | 'error';

export type CameraErrorKind = 'denied' | 'not-allowed' | 'no-camera' | 'generic';

export interface ICameraCandidate {
  deviceId: string;
  label: string;
  index: number;
  hasAutofocus: boolean;
  maxResolution: number;
  capabilities: ICameraCapabilities;
  settings: ICameraSettings;
}

export interface ICameraError {
  kind: CameraErrorKind;
  message: string;
}
