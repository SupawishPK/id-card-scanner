'use client';

import { useCallback, useState } from 'react';

import DotField from '@/components/reactbits/DotField';
import Magnet from '@/components/reactbits/Magnet';
import SplitText from '@/components/reactbits/SplitText';
import StarBorder from '@/components/reactbits/StarBorder';
import CameraPicker from '@/components/ui/CameraPicker';
import ErrorOverlay from '@/components/ui/ErrorOverlay';
import LoadingOverlay from '@/components/ui/LoadingOverlay';
import ModeSelector from '@/components/ui/ModeSelector';
import useCamera from '@/hooks/useCamera';
import type { CameraMode, ICameraCandidate } from '@/lib/camera/types';

const Home = () => {
  const {
    activeCamera,
    cameras,
    camerasLoading,
    error,
    mode,
    screen,
    selectedDeviceId,
    selectedIndex,
    videoRef,
    openCamera,
    prepareCameras,
    setMode,
    setSelectedDeviceId,
    setSelectedIndex,
    switchCamera,
  } = useCamera();

  const [showPicker, setShowPicker] = useState(false);

  const handleModeChange = useCallback(
    (next: CameraMode) => {
      setMode(next);
      if (next !== 'best') void prepareCameras();
    },
    [prepareCameras, setMode],
  );

  const handleSwitch = useCallback(
    (camera: ICameraCandidate) => {
      setShowPicker(false);
      void switchCamera(camera);
    },
    [switchCamera],
  );

  return (
    <main className="relative min-h-dvh w-full overflow-hidden bg-slate-950 text-white">
      <video
        ref={videoRef}
        aria-label="video feed from camera"
        autoPlay
        muted
        playsInline
        disablePictureInPicture
        className={
          screen === 'live'
            ? 'absolute inset-0 size-full object-cover'
            : 'invisible absolute inset-0 size-full object-cover'
        }
      />

      {screen === 'intro' && (
        <>
          <div className="absolute inset-0">
            <DotField
              dotRadius={1.2}
              dotSpacing={18}
              gradientFrom="rgba(255, 90, 0, 0.22)"
              gradientTo="rgba(30, 41, 59, 0.12)"
              glowColor="#0f172a"
            />
          </div>
          <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center gap-8 p-6">
            <SplitText
              text="เปิดกล้อง"
              tag="h1"
              splitType="chars"
              className="text-4xl font-semibold tracking-tight sm:text-5xl"
            />

            <ModeSelector mode={mode} onChange={handleModeChange} />

            {mode === 'index' && (
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-slate-400">เลือกกล้องหลังตาม index</p>
                {camerasLoading ? (
                  <p className="text-sm text-slate-500">กำลังโหลดรายการกล้อง…</p>
                ) : cameras.length > 0 ? (
                  <div className="flex flex-wrap justify-center gap-2">
                    {cameras.map((camera) => (
                      <button
                        key={camera.deviceId}
                        type="button"
                        onClick={() => setSelectedIndex(camera.index)}
                        className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                          selectedIndex === camera.index
                            ? 'border-[#ff5a00] bg-[#ff5a00]/15 text-white'
                            : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/25'
                        }`}
                      >
                        กล้องหลัง {camera.index}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            )}

            {mode === 'manual' && (
              <div className="w-full max-w-sm">
                <p className="mb-3 text-center text-sm text-slate-400">เลือกกล้องหลังด้วยตัวเอง</p>
                <CameraPicker
                  cameras={cameras}
                  loading={camerasLoading}
                  selectedDeviceId={selectedDeviceId}
                  onSelect={(camera) => setSelectedDeviceId(camera.deviceId)}
                />
              </div>
            )}

            {error && <p className="max-w-sm text-sm text-red-400">{error.message}</p>}

            <Magnet padding={80} magnetStrength={2}>
              <StarBorder
                onClick={() => void openCamera()}
                color="#ff5a00"
                backgroundColor="rgba(2, 6, 23, 0.6)"
                textColor="#ffffff"
                borderColor="rgba(255, 90, 0, 0.5)"
              >
                เปิดกล้อง
              </StarBorder>
            </Magnet>
          </div>
        </>
      )}

      {screen === 'loading' && (
        <div className="absolute inset-0 z-20">
          <LoadingOverlay />
        </div>
      )}

      {screen === 'error' && (
        <div className="absolute inset-0 z-20">
          <div className="absolute inset-0">
            <DotField
              dotRadius={1.2}
              dotSpacing={18}
              gradientFrom="rgba(255, 90, 0, 0.22)"
              gradientTo="rgba(30, 41, 59, 0.12)"
              glowColor="#0f172a"
            />
          </div>
          <div className="relative grid min-h-dvh place-items-center p-6">
            <ErrorOverlay message={error?.message} onRetry={() => void openCamera()} />
          </div>
        </div>
      )}

      {screen === 'live' && (
        <>
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 bg-gradient-to-b from-black/70 to-transparent p-4">
            <span className="truncate text-sm text-white/90">
              {activeCamera?.label || 'กล้องหลัง'}
            </span>
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="shrink-0 rounded-full border border-white/20 bg-black/40 px-4 py-2 text-sm text-white backdrop-blur"
            >
              สลับกล้อง
            </button>
          </div>

          {showPicker && (
            <div className="absolute inset-0 z-30 flex flex-col bg-black/80 p-6 backdrop-blur">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">เลือกกล้องหลัง</h2>
                <button
                  type="button"
                  onClick={() => setShowPicker(false)}
                  className="rounded-full border border-white/20 px-4 py-2 text-sm text-white"
                >
                  ปิด
                </button>
              </div>
              <CameraPicker
                cameras={cameras}
                selectedDeviceId={activeCamera?.deviceId}
                onSelect={handleSwitch}
              />
            </div>
          )}
        </>
      )}
    </main>
  );
};

export default Home;
