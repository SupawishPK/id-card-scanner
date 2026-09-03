'use client';

import type { ICameraCandidate } from '@/lib/camera/types';

import CameraPicker from './CameraPicker';

interface ICameraSwitchSheetProps {
  cameras: ICameraCandidate[];
  selectedDeviceId?: string | null;
  onSelect: (camera: ICameraCandidate) => void;
  onClose: () => void;
}

const CameraSwitchSheet = ({
  cameras,
  selectedDeviceId,
  onSelect,
  onClose,
}: ICameraSwitchSheetProps) => {
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-black/80 p-6 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">เลือกกล้องหลัง</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/20 px-4 py-2 text-sm text-white"
        >
          ปิด
        </button>
      </div>
      <CameraPicker cameras={cameras} selectedDeviceId={selectedDeviceId} onSelect={onSelect} />
    </div>
  );
};

export default CameraSwitchSheet;
