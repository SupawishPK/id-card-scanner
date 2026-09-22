'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import useCamera from '@/hooks/useCamera';
import type { ICameraCandidate } from '@/lib/camera/types';

const FLICK_DISTANCE = 55;
const FLICK_VELOCITY = 0.45;

const lensLabel = (index: number) => `กล้อง ${index + 1}`;

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
    canvasRef,
    debug,
    error,
    notice,
    open,
    retry,
    screen,
    selectCamera,
    switching,
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
      <main className="relative grid min-h-svh w-full min-w-[100vw] place-items-center overflow-hidden bg-[#0d0e10] px-6 py-8 text-ink sm:mx-auto sm:max-w-[430px]">
        <div className="absolute size-[75vw] max-h-[420px] max-w-[420px] translate-x-[24%] -translate-y-[30%] rounded-full bg-[#592313] opacity-[0.44] blur-[100px]" />
        <div className="relative w-[min(100%,360px)] pt-[6vh]">
          <div className="mb-12 grid size-12 rotate-45 place-items-center rounded-2xl border border-white/30" aria-hidden="true">
            <span className="size-4 rounded-full border-[3px] border-accent" />
          </div>
          <p className="mb-3.5 text-[11px] font-semibold tracking-[0.22em] text-accent">MOBILE CAMERA</p>
          <h1 className="text-[clamp(42px,13vw,64px)] font-medium leading-[1.02] tracking-[-0.065em]">
            เลือกภาพที่<br /><em className="not-italic text-accent">ชัดที่สุด</em>
          </h1>
          <p className="mb-9 mt-6 text-[15px] leading-[1.8] text-muted">
            สลับเลนส์กล้องหลังได้ทันที<br />เพื่อให้ได้ภาพที่เหมาะกับทุกระยะ
          </p>
          {error && <p className="-mt-[18px] mb-6 text-[13px] leading-[1.6] text-[#ff9c83]">{error}</p>}
          <button
            type="button"
            className="flex w-full cursor-pointer items-center justify-between rounded-2xl border-0 bg-accent py-[17px] pl-[22px] pr-5 text-[15px] font-semibold text-white shadow-[0_12px_34px_rgba(255,107,53,0.2)]"
            onClick={() => void (screen === 'error' ? retry() : open())}
          >
            {screen === 'error' ? 'ลองเปิดกล้องอีกครั้ง' : 'เปิดกล้อง'}
            <span className="text-2xl font-light leading-none" aria-hidden="true">→</span>
          </button>
          <p className="my-[18px] text-center text-[11px] text-[#767675]">
            <span className="align-[1px] text-[8px] text-[#62b77c]" aria-hidden="true">●</span> ภาพอยู่ในอุปกรณ์ของคุณ
          </p>
        </div>
      </main>
    );
  }

  return (
    <main
      className="relative flex h-dvh min-h-svh w-screen min-w-[100vw] flex-col justify-end overflow-hidden bg-[#111] text-ink"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 block h-full w-full object-cover opacity-0"
      />
      <canvas
        ref={canvasRef}
        aria-label="ภาพจากกล้องหลัง"
        className="absolute inset-0 block h-full w-full bg-black"
      />
      <div className="pointer-events-none absolute inset-[15%_10%_35%] z-[2] opacity-[0.42]" aria-hidden="true">
        <i className="absolute left-0 top-0 size-[22px] border-l border-t border-white" />
        <i className="absolute right-0 top-0 size-[22px] border-r border-t border-white" />
        <i className="absolute bottom-0 left-0 size-[22px] border-b border-l border-white" />
        <i className="absolute bottom-0 right-0 size-[22px] border-b border-r border-white" />
      </div>
      <div className="absolute left-0 right-0 top-0 z-[2] flex items-center justify-between bg-linear-to-b from-black/60 to-transparent px-5 pb-[18px] pt-[max(20px,env(safe-area-inset-top))] text-[10px] font-semibold tracking-[0.16em] text-[#ddd]">
        <div><span className="mr-1.5 inline-block size-1.5 rounded-full bg-[#f65e43] shadow-[0_0_10px_#f65e43]" /> LIVE</div>
        <button
          type="button"
          className="grid size-[42px] cursor-pointer place-items-center rounded-full border border-white/25 bg-black/40 text-white backdrop-blur-[10px]"
          onClick={() => setShowPicker(true)}
          aria-label="เลือกกล้อง"
        >
          <span className="text-[21px]">◉</span>
        </button>
      </div>
      {notice && (
        <div className="absolute left-1/2 top-[calc(50%_+_52px)] z-[3] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ff6b35]/90 px-4 py-2.5 text-xs font-medium text-white shadow-[0_10px_30px_rgba(0,0,0,0.47)]">
          {notice}
        </div>
      )}
      {debug && (
        <div
          className="pointer-events-none absolute bottom-[120px] left-2.5 z-[4] max-w-[240px] whitespace-pre rounded-[10px] bg-black/70 px-2.5 py-2 font-mono text-[10px] leading-[1.5] text-[#9fe3b0]"
          aria-hidden="true"
        >
          {`container ${debug.container}\nelement   ${debug.element}\nintrinsic ${debug.intrinsic}\ntrack     ${debug.track}\ncap       ${debug.cap}\nscale     ${debug.scale}\ncameras   ${cameras.length}\n${cameras
            .map((camera, index) => `${index}: ${camera.label || 'ไม่ระบุชื่อ'}${camera.deviceId === activeCamera?.deviceId ? ' *' : ''}`)
            .join('\n')}`}
        </div>
      )}
      <section
        className="relative z-[2] bg-[linear-gradient(transparent,#0b0c0def_18%,#0b0c0d_100%)] px-[18px] pb-[max(22px,env(safe-area-inset-bottom))] pt-[18px]"
        aria-label="เลือกกล้องหลัง"
      >
        <div
          className="w-full overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_16%,black_84%,transparent)]"
          aria-label="เลื่อนเลือกกล้องหลัง"
        >
          <div
            className={`grid min-h-[54px] w-full grid-cols-[1fr_1.2fr_1fr] items-center ${dragging ? 'transition-none' : 'transition-transform duration-[180ms] ease-[cubic-bezier(.22,1,.36,1)]'}`}
            style={{ transform: `translate3d(${dragOffset}px, 0, 0)` }}
          >
            <button
              type="button"
              className="flex min-h-[48px] min-w-0 cursor-pointer items-center justify-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap border-0 bg-transparent px-2 text-xs text-white/[0.27] transition-[color,opacity,transform] duration-[280ms] ease-[cubic-bezier(.34,1.56,.64,1)] disabled:cursor-default"
              onClick={() => switchTo(previousCamera)}
              disabled={!previousCamera || switching}
            >
              {previousCamera && (
                <>
                  <span className="overflow-hidden text-ellipsis">{lensLabel(activeIndex - 1)}</span>
                  <small className="text-xl leading-none text-white/[0.21]">‹</small>
                </>
              )}
            </button>
            <div className="flex scale-[1.08] flex-col items-center justify-center gap-[7px] text-sm font-medium text-white" aria-live="polite">
              <span>{activeCamera ? lensLabel(activeIndex) : 'กล้อง 1'}</span>
              <i className={`size-[5px] rounded-full bg-accent shadow-[0_0_10px_#ff6b35] ${switching ? 'animate-lens-pulse' : ''}`} />
            </div>
            <button
              type="button"
              className="flex min-h-[48px] min-w-0 cursor-pointer items-center justify-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap border-0 bg-transparent px-2 text-xs text-white/[0.27] transition-[color,opacity,transform] duration-[280ms] ease-[cubic-bezier(.34,1.56,.64,1)] disabled:cursor-default"
              onClick={() => switchTo(nextCamera)}
              disabled={!nextCamera || switching}
            >
              {nextCamera && (
                <>
                  <small className="text-xl leading-none text-white/[0.21]">›</small>
                  <span className="overflow-hidden text-ellipsis">{lensLabel(activeIndex + 1)}</span>
                </>
              )}
            </button>
          </div>
        </div>
        <p className="mt-2.5 text-center text-[10px] text-[#686868]">แตะเลนส์เพื่อสลับ · ปัดซ้ายขวาได้</p>
      </section>
      {showPicker && (
        <div className="fixed inset-0 z-[5] flex items-end" role="dialog" aria-modal="true" aria-label="เลือกกล้องหลัง">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[5px]" onClick={() => setShowPicker(false)} />
          <div className="relative w-full animate-sheet-in rounded-t-3xl bg-[#191a1c] px-[18px] pb-[max(24px,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-16px_50px_rgba(0,0,0,0.53)]">
            <div className="mx-auto mb-5 h-1 w-[38px] rounded-[9px] bg-white/[0.22]" />
            <div className="mb-3.5 flex items-center justify-between">
              <h2 className="m-0 text-lg font-medium">เลือกกล้องหลัง</h2>
              <button type="button" className="cursor-pointer border-0 bg-transparent text-[13px] text-accent" onClick={() => setShowPicker(false)}>ปิด</button>
            </div>
            {cameras.map((camera, index) => {
              const selected = camera.deviceId === activeCamera?.deviceId;
              return (
                <button
                  key={camera.deviceId}
                  type="button"
                  className="flex w-full cursor-pointer items-center gap-3.5 border-0 border-b border-white/[0.05] bg-transparent px-1 py-3.5 text-left text-[#ddd]"
                  onClick={() => {
                    switchTo(camera);
                    setShowPicker(false);
                  }}
                >
                  <span className={`grid size-9 place-items-center rounded-xl ${selected ? 'bg-accent/10 text-accent' : 'bg-white/[0.05] text-[#aaa]'}`}>{index + 1}</span>
                  <span className="min-w-0 flex-1">
                    <strong className="block text-sm font-medium">{lensLabel(index)}</strong>
                    <small className="mt-[3px] block truncate text-[11px] text-[#777]">
                      {camera.label || 'ไม่ระบุชื่อ'} · {camera.hasAutofocus ? 'โฟกัสอัตโนมัติ' : 'โฟกัสมาตรฐาน'}
                    </small>
                  </span>
                  <span className="ml-auto text-xl text-accent">{selected ? '✓' : '›'}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
};

export default Home;
