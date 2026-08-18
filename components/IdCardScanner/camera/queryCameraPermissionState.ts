/**
 * Current camera permission state, or 'unsupported' when the browser does not
 * expose it (Safari < 16 / old WKWebView throw on camera permission queries).
 */
const queryCameraPermissionState = async (): Promise<PermissionState | 'unsupported'> => {
  try {
    const permission = await navigator.permissions.query({ name: 'camera' })
    return permission.state
  } catch {
    return 'unsupported'
  }
}

export default queryCameraPermissionState
