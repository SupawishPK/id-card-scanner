import type { ICameraDiagnostics } from '../camera/readCameraDiagnostics'

interface ICameraDebugOverlayProps {
  diagnostics: ICameraDiagnostics | null
}

const CameraDebugOverlay = ({ diagnostics }: ICameraDebugOverlayProps) => {
  if (!diagnostics) return null

  return (
    <div className="pointer-events-none absolute left-2 top-2 z-50 rounded-md bg-black/70 px-2 py-1 font-mono text-[10px] leading-tight text-lime-300">
      <div>
        res: {diagnostics.actualWidth}×{diagnostics.actualHeight} ({diagnostics.actualFrameRate}fps)
      </div>
      <div>
        max: {diagnostics.maxWidth}×{diagnostics.maxHeight}
      </div>
      <div>focusMode: {diagnostics.actualFocusMode ?? '—'}</div>
      <div>focusModes: {diagnostics.supportedFocusModes?.join(',') ?? '—'}</div>
      <div>
        focusDist: {diagnostics.focusDistanceMin}–{diagnostics.focusDistanceMax}
      </div>
    </div>
  )
}

export default CameraDebugOverlay
