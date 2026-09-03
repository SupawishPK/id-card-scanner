'use client';

import { useCallback, useState } from 'react';

import Magnet from '@/components/reactbits/Magnet';
import SplitText from '@/components/reactbits/SplitText';
import StarBorder from '@/components/reactbits/StarBorder';
import CameraBackdrop from '@/components/ui/CameraBackdrop';
import CameraPicker from '@/components/ui/CameraPicker';
import CameraSwitchSheet from '@/components/ui/CameraSwitchSheet';
import ErrorOverlay from '@/components/ui/ErrorOverlay';
import IndexPicker from '@/components/ui/IndexPicker';
import LiveControls from '@/components/ui/LiveControls';
import LoadingOverlay from '@/components/ui/LoadingOverlay';
import ModeSelector from '@/components/ui/ModeSelector';
import useCamera from '@/hooks/useCamera';
import type { ICameraCandidate } from '@/lib/camera/types';

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
    selectMode,
    setSelectedDeviceId,
    setSelectedIndex,
    switchCamera,
  } = useCamera();

  const [showPicker, setShowPicker] = useState(false);

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
          <CameraBackdrop />
          <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center gap-8 p-6">
            <SplitText
              text="เปิดกล้อง"
              tag="h1"
              splitType="chars"
              className="text-4xl font-semibold tracking-tight sm:text-5xl"
            />

            <ModeSelector mode={mode} onChange={selectMode} />

            {mode === 'index' && (
              <IndexPicker
                cameras={cameras}
                loading={camerasLoading}
                selectedIndex={selectedIndex}
                onSelect={setSelectedIndex}
              />
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
                color="var(--color-accent)"
                backgroundColor="rgba(2, 6, 23, 0.6)"
                textColor="#ffffff"
                borderColor="var(--color-accent)"
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
          <CameraBackdrop />
          <div className="relative grid min-h-dvh place-items-center p-6">
            <ErrorOverlay message={error?.message} onRetry={() => void openCamera()} />
          </div>
        </div>
      )}

      {screen === 'live' && (
        <>
          <LiveControls
            label={activeCamera?.label || 'กล้องหลัง'}
            onSwitch={() => setShowPicker(true)}
          />
          {showPicker && (
            <CameraSwitchSheet
              cameras={cameras}
              selectedDeviceId={activeCamera?.deviceId}
              onSelect={handleSwitch}
              onClose={() => setShowPicker(false)}
            />
          )}
        </>
      )}
    </main>
  );
};

export default Home;
