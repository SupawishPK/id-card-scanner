'use client'

import { useEffect, useState } from 'react'

const readOrientationAngle = (): number => {
  if (typeof window === 'undefined') return 0

  const orientation = screen.orientation
  if (orientation && typeof orientation.angle === 'number') {
    return orientation.angle
  }

  const legacyAngle = (window as unknown as { orientation?: number }).orientation
  return typeof legacyAngle === 'number' ? legacyAngle : 0
}

const useScreenOrientation = () => {
  const [angle, setAngle] = useState<number>(0)

  useEffect(() => {
    const update = () => {
      setAngle(readOrientationAngle())
    }

    update()

    window.addEventListener('orientationchange', update)

    const orientation = screen.orientation
    if (orientation && typeof orientation.addEventListener === 'function') {
      orientation.addEventListener('change', update)
    }

    return () => {
      window.removeEventListener('orientationchange', update)
      if (orientation && typeof orientation.removeEventListener === 'function') {
        orientation.removeEventListener('change', update)
      }
    }
  }, [])

  return angle
}

export default useScreenOrientation
