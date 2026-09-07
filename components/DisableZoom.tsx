'use client';

import { useEffect } from 'react';

const DisableZoom = () => {
  useEffect(() => {
    const preventMultiTouch = (event: TouchEvent): void => {
      if (event.touches.length > 1) event.preventDefault();
    };

    const preventGesture = (event: Event): void => {
      event.preventDefault();
    };

    let lastTouchEnd = 0;
    const preventDoubleTap = (event: TouchEvent): void => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) event.preventDefault();
      lastTouchEnd = now;
    };

    document.addEventListener('touchstart', preventMultiTouch, { passive: false });
    document.addEventListener('touchmove', preventMultiTouch, { passive: false });
    document.addEventListener('touchend', preventDoubleTap, { passive: false });
    document.addEventListener('gesturestart', preventGesture);
    document.addEventListener('gesturechange', preventGesture);
    document.addEventListener('gestureend', preventGesture);

    return () => {
      document.removeEventListener('touchstart', preventMultiTouch);
      document.removeEventListener('touchmove', preventMultiTouch);
      document.removeEventListener('touchend', preventDoubleTap);
      document.removeEventListener('gesturestart', preventGesture);
      document.removeEventListener('gesturechange', preventGesture);
      document.removeEventListener('gestureend', preventGesture);
    };
  }, []);

  return null;
};

export default DisableZoom;
