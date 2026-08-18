export type ICameraErrorType = 'permission-denied' | 'not-allowed' | 'no-camera' | 'generic'

const isDenialError = (error: unknown): boolean =>
  error instanceof DOMException &&
  (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError')

const isNoCameraError = (error: unknown): boolean =>
  error instanceof DOMException &&
  (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError')

/**
 * Maps a getUserMedia failure + the current camera permission state to a UI case.
 *
 * `NotAllowedError` alone cannot tell a user denial from a WKWebView whose host
 * app never granted camera — both throw the same name. The permission state does:
 *  - 'prompt' + NotAllowedError → the prompt never appeared: the host app blocks
 *    camera access, retrying will not help ('not-allowed')
 *  - 'denied'  + NotAllowedError → permission was refused before (OS prompt or
 *    web prompt): the user must enable it in Settings ('permission-denied')
 *
 * The state must be queried *after* the getUserMedia failure — WebKit only
 * settles the permission state once the first request has been made.
 */
const classifyCameraError = (
  error: unknown,
  permissionState: PermissionState | 'unsupported',
): ICameraErrorType => {
  if (!isDenialError(error)) {
    return isNoCameraError(error) ? 'no-camera' : 'generic'
  }

  switch (permissionState) {
    case 'denied':
      return 'permission-denied'
    case 'prompt':
      return 'not-allowed'
    case 'granted':
      // Denied while 'granted' is unexpected (e.g. permission revoked mid-session).
      return 'generic'
    case 'unsupported':
      // Old WebKit (< iOS 16) throws on camera permission queries — keep the
      // previous single "permission denied" case as the fallback.
      return 'permission-denied'
  }
}

export default classifyCameraError
