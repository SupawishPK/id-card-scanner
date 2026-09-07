'use client';

import { useEffect } from 'react';

interface IZoomTouchEvent extends TouchEvent {
  scale?: number;
}

const DisableZoom = () => {
  useEffect(() => {
    const preventPinch = (event: TouchEvent): void => {
      const scale = (event as IZoomTouchEvent).scale;
      if (event.touches.length > 1 || (scale !== undefined && scale !== 1)) {
        event.preventDefault();
      }
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

    document.addEventListener('touchstart', preventPinch, { passive: false });
    document.addEventListener('touchmove', preventPinch, { passive: false });
    document.addEventListener('touchend', preventDoubleTap, { passive: false });
    document.addEventListener('gesturestart', preventGesture);
    document.addEventListener('gesturechange', preventGesture);
    document.addEventListener('gestureend', preventGesture);

    return () => {
      document.removeEventListener('touchstart', preventPinch);
      document.removeEventListener('touchmove', preventPinch);
      document.removeEventListener('touchend', preventDoubleTap);
      document.removeEventListener('gesturestart', preventGesture);
      document.removeEventListener('gesturechange', preventGesture);
      document.removeEventListener('gestureend', preventGesture);
    };
  }, []);

  return null;
};

export default DisableZoom;
