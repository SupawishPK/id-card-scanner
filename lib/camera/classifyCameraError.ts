import type { CameraErrorKind } from './types';

const queryPermissionState = async (): Promise<PermissionState | 'unsupported'> => {
  try {
    const permission = await navigator.permissions.query({ name: 'camera' });
    return permission.state;
  } catch {
    return 'unsupported';
  }
};

/**
 * Map a getUserMedia failure to a user-facing category.
 *
 * A NotAllowedError while the permission is still 'prompt' means the prompt
 * never appeared (the host app does not allow camera) — 'not-allowed'.
 * If the permission settled to 'denied', the user refused it — 'denied'.
 */
const classifyCameraError = async (error: unknown): Promise<CameraErrorKind> => {
  if (error instanceof TypeError) return 'generic';

  if (error instanceof DOMException) {
    switch (error.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
      case 'SecurityError': {
        const state = await queryPermissionState();
        return state === 'prompt' ? 'not-allowed' : 'denied';
      }
      case 'NotFoundError':
      case 'DevicesNotFoundError':
      case 'OverconstrainedError':
        return 'no-camera';
      default:
        return 'generic';
    }
  }

  return 'generic';
};

export default classifyCameraError;
