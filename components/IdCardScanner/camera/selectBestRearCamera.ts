/**
 * Samsung-style devices expose two rear cameras: a sharp main sensor (with
 * autofocus) and an ultrawide that is fixed-focus — soft when scanning a card
 * up close. `facingMode: "environment"` lets the browser pick either, and it
 * often lands on the blurry ultrawide.
 *
 * This probes every video input to find the best rear camera:
 *   1. rear-facing only,
 *   2. autofocus (continuous/auto/single-shot) wins over fixed-focus,
 *   3. tiebreak on highest max resolution.
 */
interface ICameraCapabilities extends MediaTrackCapabilities {
  facingMode?: string[]
  focusMode?: string[]
  width?: { max?: number }
  height?: { max?: number }
}

interface ICameraCandidate {
  deviceId: string
  label: string
  hasAutofocus: boolean
  maxArea: number
}

const FOCUSABLE_MODES = ["continuous", "auto", "single-shot"]

const probeCamera = async (deviceId: string, label: string): Promise<ICameraCandidate | null> => {
  let stream: MediaStream
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId } },
    })
  } catch {
    return null
  }

  try {
    const track = stream.getVideoTracks()[0]
    const capabilities = track.getCapabilities() as ICameraCapabilities

    const facing = capabilities.facingMode ?? []
    // Skip the selfie camera — explicit "user", or an unlabeled front-facing hint.
    if (facing.includes("user")) return null
    if (facing.length === 0 && /front/i.test(label)) return null

    const focusModes = capabilities.focusMode ?? []
    const hasAutofocus = focusModes.some((mode) => FOCUSABLE_MODES.includes(mode))
    const maxWidth = capabilities.width?.max ?? 0
    const maxHeight = capabilities.height?.max ?? 0

    return { deviceId, label, hasAutofocus, maxArea: maxWidth * maxHeight }
  } finally {
    stream.getTracks().forEach((track) => track.stop())
  }
}

const selectBestRearCamera = async (): Promise<{ deviceId: string; label: string } | null> => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const videoInputs = devices.filter(
      (device) => device.kind === "videoinput" && device.deviceId && !device.deviceId.startsWith("default"),
    )

    let best: ICameraCandidate | null = null

    for (const device of videoInputs) {
      const candidate = await probeCamera(device.deviceId, device.label)
      if (!candidate) continue

      if (!best) {
        best = candidate
        continue
      }

      // Autofocus is the sharpness signal — prefer it above all else.
      if (candidate.hasAutofocus !== best.hasAutofocus) {
        if (candidate.hasAutofocus) best = candidate
        continue
      }

      // Both the same focus class: pick the higher-resolution sensor.
      if (candidate.maxArea > best.maxArea) best = candidate
    }

    return best ? { deviceId: best.deviceId, label: best.label } : null
  } catch {
    return null
  }
}

export default selectBestRearCamera
