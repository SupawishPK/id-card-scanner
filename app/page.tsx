'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import useCamera from '@/hooks/useCamera';
import type { ICameraCandidate } from '@/lib/camera/types';

const FLICK_DISTANCE = 55;
const FLICK_VELOCITY = 0.45;

const cameraTitle = (camera: ICameraCandidate, index: number) => {
  const label = camera.label.toLowerCase();
  if (label.includes('ultra') || label.includes('wide')) return 'มุมกว้าง';
  if (label.includes('tele') || label.includes('zoom')) return 'ซูม';
  return index === 0 ? 'กล้องหลัก' : `กล้องหลัง ${index + 1}`;
};

const haptic = () => {
  try {
    navigator.vibrate?.(10);
  } catch {
    // Vibration is optional and unsupported on iOS.
  }
};

const Home = () => {
  const {
    activeCamera,
    cameras,
    debug,
    error,
    notice,
    open,
    retry,
    revealing,
    screen,
    selectCamera,
    switching,
    transitionFrame,
    videoRef,
  } = useCamera();
  const [showPicker, setShowPicker] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<{ x: number; t: number } | null>(null);

  useEffect(() => {
    if (!showPicker) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowPicker(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showPicker]);

  const activeIndex = Math.max(
    0,
    cameras.findIndex((camera) => camera.deviceId === activeCamera?.deviceId),
  );
  const previousCamera = cameras[activeIndex - 1];
  const nextCamera = cameras[activeIndex + 1];

  const switchTo = useCallback(
    (camera?: ICameraCandidate) => {
      if (!camera || switching) return;
      haptic();
      void selectCamera(camera);
    },
    [selectCamera, switching],
  );

  const step = useCallback(
    (direction: 1 | -1) => {
      if (cameras.length < 2 || switching) return;
      const next = (activeIndex + direction + cameras.length) % cameras.length;
      switchTo(cameras[next]);
    },
    [activeIndex, cameras, switchTo, switching],
  );

  const onTouchStart = (event: React.TouchEvent) => {
    if (switching) return;
    const touch = event.touches[0];
    gesture.current = { x: touch.clientX, t: Date.now() };
    setDragOffset(0);
    setDragging(true);
  };

  const onTouchMove = (event: React.TouchEvent) => {
    if (!gesture.current || switching) return;
    const delta = event.touches[0].clientX - gesture.current.x;
    setDragOffset(Math.max(-120, Math.min(120, delta)));
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    const start = gesture.current;
    gesture.current = null;
    setDragging(false);
    setDragOffset(0);
    if (!start || cameras.length < 2 || switching) return;

    const endX = event.changedTouches[0]?.clientX ?? start.x;
    const delta = endX - start.x;
    const elapsed = Math.max(1, Date.now() - start.t);
    const velocity = delta / elapsed;

    if (delta <= -FLICK_DISTANCE || velocity <= -FLICK_VELOCITY) step(1);
    else if (delta >= FLICK_DISTANCE || velocity >= FLICK_VELOCITY) step(-1);
  };

  if (screen === 'intro' || screen === 'error') {
    return (
      <main className="camera-app camera-app--intro">
        <div className="intro-glow" />
        <div className="intro-content">
          <div className="brand-mark" aria-hidden="true"><span /></div>
          <p className="eyebrow">MOBILE CAMERA</p>
          <h1>เลือกภาพที่<br /><em>ชัดที่สุด</em></h1>
          <p className="intro-copy">สลับเลนส์กล้องหลังได้ทันที<br />เพื่อให้ได้ภาพที่เหมาะกับทุกระยะ</p>
          {error && <p className="error-message">{error}</p>}
          <button type="button" className="primary-button" onClick={() => void (screen === 'error' ? retry() : open())}>
            {screen === 'error' ? 'ลองเปิดกล้องอีกครั้ง' : 'เปิดกล้อง'}
            <span aria-hidden="true">→</span>
          </button>
          <p className="privacy-note"><span aria-hidden="true">●</span> ภาพอยู่ในอุปกรณ์ของคุณ</p>
        </div>
      </main>
    );
  }

  return (
    <main className="camera-app camera-app--live" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <video ref={videoRef} autoPlay muted playsInline aria-label="ภาพจากกล้องหลัง" className="camera-video" />
      {transitionFrame && <div className={`transition-frame ${revealing ? 'is-leaving' : ''}`} style={{ backgroundImage: `url(${transitionFrame})` }} aria-hidden="true" />}
      <div className="viewfinder" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="live-topbar">
        <div><span className="status-dot" /> LIVE</div>
        <button type="button" className="round-button" onClick={() => setShowPicker(true)} aria-label="เลือกกล้อง">
          <span className="camera-glyph">◉</span>
        </button>
      </div>
      {notice && <div className="camera-notice">{notice}</div>}
      {debug && (
        <div className="camera-debug" aria-hidden="true">
          {`container ${debug.container}\nelement   ${debug.element}\nintrinsic ${debug.intrinsic}\ntrack     ${debug.track}\ncap       ${debug.cap}\nscale     ${debug.scale}\ncameras   ${cameras.length}\n${cameras
            .map((camera, index) => `${index}: ${camera.label || 'ไม่ระบุชื่อ'}${camera.deviceId === activeCamera?.deviceId ? ' *' : ''}`)
            .join('\n')}`}
        </div>
      )}
      <section className="camera-dock" aria-label="เลือกกล้องหลัง">
        <div className="lens-selector" aria-label="เลื่อนเลือกกล้องหลัง">
          <div className={`lens-track ${dragging ? 'is-dragging' : ''}`} style={{ transform: `translate3d(${dragOffset}px, 0, 0)` }}>
            <button type="button" className="lens-slot lens-slot--side" onClick={() => switchTo(previousCamera)} disabled={!previousCamera || switching}>
              {previousCamera && <><span>{cameraTitle(previousCamera, activeIndex - 1)}</span><small>‹</small></>}
            </button>
            <div className={`lens-slot lens-slot--active ${switching ? 'is-loading' : ''}`} aria-live="polite">
              <span>{activeCamera ? cameraTitle(activeCamera, activeIndex) : 'กล้องหลัก'}</span>
              <i />
            </div>
            <button type="button" className="lens-slot lens-slot--side" onClick={() => switchTo(nextCamera)} disabled={!nextCamera || switching}>
              {nextCamera && <><small>›</small><span>{cameraTitle(nextCamera, activeIndex + 1)}</span></>}
            </button>
          </div>
        </div>
        <p className="gesture-hint">แตะเลนส์เพื่อสลับ · ปัดซ้ายขวาได้</p>
      </section>
      {showPicker && <div className="picker-sheet" role="dialog" aria-modal="true" aria-label="เลือกกล้องหลัง">
        <div className="sheet-backdrop" onClick={() => setShowPicker(false)} />
        <div className="sheet-content"><div className="sheet-handle" /><div className="sheet-header"><h2>เลือกกล้องหลัง</h2><button type="button" onClick={() => setShowPicker(false)}>ปิด</button></div>
          {cameras.map((camera, index) => <button key={camera.deviceId} type="button" className={`sheet-option ${camera.deviceId === activeCamera?.deviceId ? 'is-selected' : ''}`} onClick={() => { switchTo(camera); setShowPicker(false); }}><span className="sheet-number">{index + 1}</span><span><strong>{cameraTitle(camera, index)}</strong><small>{camera.hasAutofocus ? 'โฟกัสอัตโนมัติ' : 'โฟกัสมาตรฐาน'}</small></span><span>{camera.deviceId === activeCamera?.deviceId ? '✓' : '›'}</span></button>)}
        </div>
      </div>}
    </main>
  );
};

export default Home;
