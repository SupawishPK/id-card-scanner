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
  const { activeCamera, cameras, error, open, retry, screen, selectCamera, switching, videoRef } =
    useCamera();
  const [showPicker, setShowPicker] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
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
    touchStart.current = event.touches[0]?.clientX ?? null;
    setDragOffset(0);
  };

  const onTouchMove = (event: React.TouchEvent) => {
    const start = touchStart.current;
    if (start === null || switching) return;
    const delta = (event.touches[0]?.clientX ?? start) - start;
    setDragOffset(Math.max(-72, Math.min(72, delta)));
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    setDragOffset(0);
    if (start === null || cameras.length < 2 || switching) return;
    const delta = (event.changedTouches[0]?.clientX ?? start) - start;
    if (Math.abs(delta) < 55) return;
    const current = cameras.findIndex((camera) => camera.deviceId === activeCamera?.deviceId);
    const nextIndex = (current + (delta < 0 ? 1 : -1) + cameras.length) % cameras.length;
    void selectCamera(cameras[nextIndex]);
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
      <div className="viewfinder" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="live-topbar">
        <div><span className="status-dot" /> LIVE</div>
        <button type="button" className="round-button" onClick={() => setShowPicker(true)} aria-label="เลือกกล้อง">
          <span className="camera-glyph">◉</span>
        </button>
      </div>
      {switching && <div className="switching-label">กำลังเปลี่ยนเลนส์...</div>}
      <section className="camera-dock" aria-label="เลือกกล้องหลัง">
        <div className="dock-heading"><span>กล้องหลัง</span><span>{cameras.length} เลนส์</span></div>
        <div className="lens-list" style={{ transform: `translate3d(${dragOffset}px, 0, 0)` }}>
          {cameras.map((camera, index) => {
            const selected = camera.deviceId === activeCamera?.deviceId;
            return <button key={camera.deviceId} type="button" className={`lens-pill ${selected ? 'is-selected' : ''}`} onClick={() => void selectCamera(camera)} disabled={switching}>
              <span className="lens-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="lens-name">{cameraTitle(camera, index)}</span>
              {selected && <span className="check">✓</span>}
            </button>;
          })}
        </div>
        <p className="gesture-hint">แตะเลนส์ หรือปัดซ้ายขวา</p>
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
