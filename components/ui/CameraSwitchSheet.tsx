'use client';

import type { ICameraCandidate } from '@/lib/camera/types';

import CameraPicker from './CameraPicker';

interface ICameraSwitchSheetProps {
  cameras: ICameraCandidate[];
  loading?: boolean;
  selectedDeviceId?: string | null;
  isAuto: boolean;
  onSelect: (camera: ICameraCandidate) => void;
  onSelectAuto: () => void;
  onClose: () => void;
}

const CameraSwitchSheet = ({
  cameras,
  loading,
  selectedDeviceId,
  isAuto,
  onSelect,
  onSelectAuto,
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

      <button
        type="button"
        onClick={onSelectAuto}
        className={`mb-2 flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
          isAuto
            ? 'border-accent bg-accent/10 text-white'
            : 'border-white/10 bg-white/5 text-slate-200 hover:border-white/25'
        }`}
      >
        <span className="flex flex-col">
          <span className="text-sm font-medium">อัตโนมัติ</span>
          <span className="text-xs text-slate-400">ให้ระบบเลือกกล้องหลังเอง</span>
        </span>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300">Auto</span>
      </button>

      <CameraPicker
        cameras={cameras}
        loading={loading}
        selectedDeviceId={selectedDeviceId}
        onSelect={onSelect}
      />
    </div>
  );
};

export default CameraSwitchSheet;
