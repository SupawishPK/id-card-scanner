'use client'

import { useEffect, useRef, useState } from 'react'

export type ScreenOrientationMode = 'portrait' | 'landscape-left' | 'landscape-right' | 'upside-down'

export interface IScreenOrientationState {
  mode: ScreenOrientationMode
  /** Viewport itself is landscape (auto-rotate ON) — the UI needs no counter-rotation. */
  isViewportLandscape: boolean
  /** Viewport stays portrait while the device is physically landscape (auto-rotate locked) — overlay UI must counter-rotate. */
  isLockedLandscape: boolean
}

const SENSOR_QUADRANT_TOLERANCE_DEG = 35
const SENSOR_FLAT_THRESHOLD_DEG = 20
const SENSOR_COMMIT_DELAY_MS = 250

const SENSOR_MODES: readonly ScreenOrientationMode[] = [
  'portrait',
  'landscape-left',
  'upside-down',
  'landscape-right',
]

const viewportAngleToMode = (angle: number): ScreenOrientationMode => {
  const normalized = ((angle % 360) + 360) % 360
  if (normalized === 90) return 'landscape-left'
  if (normalized === 270) return 'landscape-right'
  if (normalized === 180) return 'upside-down'
  return 'portrait'
}

const readViewport = (): { angle: number; isLandscape: boolean } => {
  if (typeof window === 'undefined') return { angle: 0, isLandscape: false }

  const orientation = screen.orientation
  if (orientation) {
    const angle = typeof orientation.angle === 'number' ? orientation.angle : 0
    return { angle, isLandscape: orientation.type.startsWith('landscape') }
  }

  const legacyAngle = (window as unknown as { orientation?: number }).orientation
  if (typeof legacyAngle === 'number') {
    const normalized = ((legacyAngle % 360) + 360) % 360
    return { angle: legacyAngle, isLandscape: normalized === 90 || normalized === 270 }
  }

  return { angle: 0, isLandscape: false }
}

/**
 * Maps accelerometer tilt (beta/gamma) to the nearest screen quadrant.
 * Returns null when the reading is ambiguous (device flat, or in a diagonal dead zone).
 * beta: tilt of the device's top edge from horizontal — 90° upright, -90° upside down.
 * gamma: tilt of the device's right edge from horizontal — +90° when the right edge points up.
 */
const resolveSensorMode = (beta: number, gamma: number): ScreenOrientationMode | null => {
  // Flat on a surface — gravity is perpendicular to the screen, in-plane direction is undefined.
  if (Math.abs(beta) < SENSOR_FLAT_THRESHOLD_DEG && Math.abs(gamma) < SENSOR_FLAT_THRESHOLD_DEG) {
    return null
  }

  // Normalize gamma to [-90, 90] so the ±180° gimbal flip while upside down still resolves to 180°.
  const normalizedGamma = gamma > 90 ? 180 - gamma : gamma < -90 ? -180 - gamma : gamma
  const angle = (Math.atan2(normalizedGamma, beta) * 180) / Math.PI
  const normalized = ((angle % 360) + 360) % 360
  const snappedIndex = Math.round(normalized / 90) % 4
  const delta = Math.abs(normalized - snappedIndex * 90)
  if (delta > SENSOR_QUADRANT_TOLERANCE_DEG) return null
  return SENSOR_MODES[snappedIndex]
}

const useSensorMode = (): ScreenOrientationMode | null => {
  const [mode, setMode] = useState<ScreenOrientationMode | null>(null)
  const lastModeRef = useRef<ScreenOrientationMode | null>(null)
  const pendingRef = useRef<ScreenOrientationMode | null>(null)
  const pendingSinceRef = useRef(0)

  useEffect(() => {
    const commit = (next: ScreenOrientationMode) => {
      if (next === lastModeRef.current) return
      lastModeRef.current = next
      setMode(next)
    }

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const { beta, gamma } = event
      if (beta === null || gamma === null) return

      const candidate = resolveSensorMode(beta, gamma)
      if (candidate === null || candidate === lastModeRef.current) {
        // Ambiguous reading (flat/diagonal) or back at the committed mode — drop any pending change.
        pendingRef.current = null
        pendingSinceRef.current = 0
        return
      }

      const now = Date.now()
      if (candidate !== pendingRef.current) {
        pendingRef.current = candidate
        pendingSinceRef.current = now
        return
      }
      if (now - pendingSinceRef.current >= SENSOR_COMMIT_DELAY_MS) {
        pendingRef.current = null
        pendingSinceRef.current = 0
        commit(candidate)
      }
    }

    window.addEventListener('deviceorientation', handleOrientation)
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation)
    }
  }, [])

  return mode
}

const useScreenOrientation = (): IScreenOrientationState => {
  const [viewport, setViewport] = useState(() => readViewport())
  const sensorMode = useSensorMode()

  useEffect(() => {
    const update = () => setViewport(readViewport())
    update()

    window.addEventListener('orientationchange', update)
    const orientation = screen.orientation
    if (orientation && typeof orientation.addEventListener === 'function') {
      orientation.addEventListener('change', update)
    }

    // iOS requires the orientation sensor permission to be requested from a user gesture.
    const requestPermission = () => {
      const DeviceOrientation = window.DeviceOrientationEvent as unknown as
        | { requestPermission?: () => Promise<string> }
        | undefined
      if (DeviceOrientation && typeof DeviceOrientation.requestPermission === 'function') {
        DeviceOrientation.requestPermission().catch(() => undefined)
      }
    }
    const onFirstGesture = () => {
      requestPermission()
      window.removeEventListener('pointerdown', onFirstGesture)
      window.removeEventListener('touchstart', onFirstGesture)
      window.removeEventListener('click', onFirstGesture)
    }
    window.addEventListener('pointerdown', onFirstGesture, { passive: true })
    window.addEventListener('touchstart', onFirstGesture, { passive: true })
    window.addEventListener('click', onFirstGesture, { passive: true })

    return () => {
      window.removeEventListener('orientationchange', update)
      if (orientation && typeof orientation.removeEventListener === 'function') {
        orientation.removeEventListener('change', update)
      }
      window.removeEventListener('pointerdown', onFirstGesture)
      window.removeEventListener('touchstart', onFirstGesture)
      window.removeEventListener('click', onFirstGesture)
    }
  }, [])

  const viewportMode = viewportAngleToMode(viewport.angle)
  const mode = viewport.isLandscape ? viewportMode : (sensorMode ?? viewportMode)
  const isLandscape = mode === 'landscape-left' || mode === 'landscape-right'

  return {
    mode,
    isViewportLandscape: viewport.isLandscape,
    isLockedLandscape: isLandscape && !viewport.isLandscape,
  }
}

export default useScreenOrientation
