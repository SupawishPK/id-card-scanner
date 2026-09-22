'use client';

import { useEffect, useRef, useState } from 'react';

import useCamera from '@/hooks/useCamera';
import type { ICameraCandidate } from '@/lib/camera/types';

const cameraTitle = (camera: ICameraCandidate, index: number) => {
  const label = camera.label.toLowerCase();
  if (label.includes('ultra') || label.includes('wide')) return 'มุมกว้าง';
  if (label.includes('tele') || label.includes('zoom')) return 'ซูม';
  return index === 0 ? 'กล้องหลัก' : `กล้องหลัง ${index + 1}`;
};

const Home = () => {
  const {
    activeCamera,
    cameras,
    debug,
    error,
    open,
    retry,
    screen,
    selectCamera,
    switching,
    transitionFrame,
    videoRef,
  } = useCamera();
  const [showPicker, setShowPicker] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [settling, setSettling] = useState(false);
  const touchStart = useRef<number | null>(null);

  useEffect(() => {
    if (!showPicker) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowPicker(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showPicker]);

  const onTouchStart = (event: React.TouchEvent) => {
    if (switching || settling) return;
    touchStart.current = event.touches[0]?.clientX ?? null;
    setDragOffset(0);
    setDragging(true);
  };

  const onTouchMove = (event: React.TouchEvent) => {
    const start = touchStart.current;
    if (start === null || switching || settling) return;
    const delta = (event.touches[0]?.clientX ?? start) - start;
    setDragOffset(Math.max(-72, Math.min(72, delta)));
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    setDragging(false);
    setDragOffset(0);
    if (start === null || cameras.length < 2 || switching || settling) return;
    const delta = (event.changedTouches[0]?.clientX ?? start) - start;
    if (Math.abs(delta) < 55) return;
    const current = cameras.findIndex((camera) => camera.deviceId === activeCamera?.deviceId);
    const nextIndex = (current + (delta < 0 ? 1 : -1) + cameras.length) % cameras.length;
    setSettling(true);
    setDragOffset(delta < 0 ? -110 : 110);
    window.setTimeout(() => {
      setDragOffset(0);
      setSettling(false);
      void selectCamera(cameras[nextIndex]);
    }, 180);
  };

  const activeIndex = Math.max(0, cameras.findIndex((camera) => camera.deviceId === activeCamera?.deviceId));
  const previousCamera = cameras[activeIndex - 1];
  const nextCamera = cameras[activeIndex + 1];
  const selectNeighbor = (camera?: ICameraCandidate) => {
    if (!camera || switching || settling) return;
    void selectCamera(camera);
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
      <video ref={videoRef} autoPlay muted playsInline aria-label="ภาพจากกล้องหลัง" className={`camera-video ${switching ? 'is-switching' : ''}`} />
      {transitionFrame && <div className="transition-frame" style={{ backgroundImage: `url(${transitionFrame})` }} aria-hidden="true" />}
      <div className="viewfinder" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="live-topbar">
        <div><span className="status-dot" /> LIVE</div>
        <button type="button" className="round-button" onClick={() => setShowPicker(true)} aria-label="เลือกกล้อง">
          <span className="camera-glyph">◉</span>
        </button>
      </div>
      {switching && <div className="switching-label">กำลังเปลี่ยนเลนส์...</div>}
      {debug && (
        <div className="camera-debug" aria-hidden="true">
          {`container ${debug.container}\nelement   ${debug.element}\nintrinsic ${debug.intrinsic}\ntrack     ${debug.track}\nscale     ${debug.scale}`}
        </div>
      )}
      <section className="camera-dock" aria-label="เลือกกล้องหลัง">
        <div className="lens-selector" aria-label="เลื่อนเลือกกล้องหลัง">
          <div className={`lens-track ${dragging ? 'is-dragging' : ''}`} style={{ transform: `translate3d(${dragOffset}px, 0, 0)` }}>
            <button type="button" className="lens-slot lens-slot--side" onClick={() => selectNeighbor(previousCamera)} disabled={!previousCamera || switching || settling}>
              {previousCamera && <><span>{cameraTitle(previousCamera, activeIndex - 1)}</span><small>‹</small></>}
            </button>
            <div className="lens-slot lens-slot--active" aria-live="polite">
              <span>{activeCamera ? cameraTitle(activeCamera, activeIndex) : 'กล้องหลัก'}</span>
              <i />
            </div>
            <button type="button" className="lens-slot lens-slot--side" onClick={() => selectNeighbor(nextCamera)} disabled={!nextCamera || switching || settling}>
              {nextCamera && <><small>›</small><span>{cameraTitle(nextCamera, activeIndex + 1)}</span></>}
            </button>
          </div>
        </div>
        <p className="gesture-hint">ปัดเพื่อเปลี่ยนกล้อง</p>
      </section>
      {showPicker && <div className="picker-sheet" role="dialog" aria-modal="true" aria-label="เลือกกล้องหลัง">
        <div className="sheet-backdrop" onClick={() => setShowPicker(false)} />
        <div className="sheet-content"><div className="sheet-handle" /><div className="sheet-header"><h2>เลือกกล้องหลัง</h2><button type="button" onClick={() => setShowPicker(false)}>ปิด</button></div>
          {cameras.map((camera, index) => <button key={camera.deviceId} type="button" className={`sheet-option ${camera.deviceId === activeCamera?.deviceId ? 'is-selected' : ''}`} onClick={() => { void selectCamera(camera); setShowPicker(false); }}><span className="sheet-number">{index + 1}</span><span><strong>{cameraTitle(camera, index)}</strong><small>{camera.hasAutofocus ? 'โฟกัสอัตโนมัติ' : 'โฟกัสมาตรฐาน'}</small></span><span>{camera.deviceId === activeCamera?.deviceId ? '✓' : '›'}</span></button>)}
        </div>
      </div>}
    </main>
  );
};

export default Home;
