export interface ICameraDiagnostics {
  actualWidth?: number
  actualHeight?: number
  actualFrameRate?: number
  actualFocusMode?: string
  maxWidth?: number
  maxHeight?: number
  supportedFocusModes?: string[]
  focusDistanceMin?: number
  focusDistanceMax?: number
}

type ISettingsWithFocus = MediaTrackSettings & { focusMode?: string }

type ICapabilitiesWithFocus = MediaTrackCapabilities & {
  focusMode?: string[]
  focusDistance?: { min: number; max: number }
}

const readCameraDiagnostics = (stream: MediaStream | null): ICameraDiagnostics | null => {
  if (!stream) return null

  const track = stream.getVideoTracks()[0]
  if (!track) return null

  const settings = track.getSettings() as ISettingsWithFocus
  const capabilities = track.getCapabilities() as ICapabilitiesWithFocus

  return {
    actualWidth: settings.width,
    actualHeight: settings.height,
    actualFrameRate: settings.frameRate,
    actualFocusMode: settings.focusMode,
    maxWidth: capabilities.width?.max,
    maxHeight: capabilities.height?.max,
    supportedFocusModes: capabilities.focusMode,
    focusDistanceMin: capabilities.focusDistance?.min,
    focusDistanceMax: capabilities.focusDistance?.max,
  }
}

export default readCameraDiagnostics
