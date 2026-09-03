'use client';

import type { ICameraCandidate } from '@/lib/camera/types';

interface IIndexPickerProps {
  cameras: ICameraCandidate[];
  loading: boolean;
  selectedIndex: number;
  onSelect: (index: number) => void;
}

const IndexPicker = ({ cameras, loading, selectedIndex, onSelect }: IIndexPickerProps) => {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="text-sm text-slate-400">เลือกกล้องหลังตาม index</p>
      {loading ? (
        <p className="text-sm text-slate-500">กำลังโหลดรายการกล้อง…</p>
      ) : cameras.length > 0 ? (
        <div className="flex flex-wrap justify-center gap-2">
          {cameras.map((camera) => (
            <button
              key={camera.deviceId}
              type="button"
              onClick={() => onSelect(camera.index)}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                selectedIndex === camera.index
                  ? 'border-accent bg-accent/15 text-white'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/25'
              }`}
            >
              กล้องหลัง {camera.index}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export default IndexPicker;
