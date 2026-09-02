'use client';

import type { ICameraCandidate } from '@/lib/camera/types';

interface ICameraPickerProps {
  cameras: ICameraCandidate[];
  loading?: boolean;
  selectedDeviceId?: string | null;
  onSelect: (camera: ICameraCandidate) => void;
}

const CameraPicker = ({
  cameras,
  loading,
  selectedDeviceId,
  onSelect,
}: ICameraPickerProps) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-400">
        <span className="size-4 animate-spin rounded-full border-2 border-white/25 border-t-white" />
        กำลังโหลดรายการกล้อง…
      </div>
    );
  }

  if (cameras.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">ไม่พบกล้องหลังบนอุปกรณ์นี้</p>;
  }

  return (
    <ul className="flex max-h-[40dvh] flex-col gap-2 overflow-auto">
      {cameras.map((camera) => {
        const active = camera.deviceId === selectedDeviceId;
        const megapixels =
          camera.maxResolution > 0 ? `${(camera.maxResolution / 1_000_000).toFixed(1)} MP` : null;

        return (
          <li key={camera.deviceId}>
            <button
              type="button"
              onClick={() => onSelect(camera)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
                active
                  ? 'border-[#ff5a00] bg-[#ff5a00]/15 text-white'
                  : 'border-white/10 bg-white/5 text-slate-200 hover:border-white/25'
              }`}
            >
              <span className="flex flex-col">
                <span className="text-sm font-medium">{camera.label || `กล้องหลัง ${camera.index}`}</span>
                <span className="text-xs text-slate-400">กล้องหลัง {camera.index}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-xs">
                {camera.hasAutofocus && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-300">AF</span>
                )}
                {megapixels && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-slate-300">{megapixels}</span>
                )}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
};

export default CameraPicker;
