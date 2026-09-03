'use client';

import type { IZoomRange } from '@/lib/camera/capabilities';
import type { ICameraCandidate, LensKind } from '@/lib/camera/types';

import CameraSpec from './CameraSpec';

interface ICameraPickerProps {
  cameras: ICameraCandidate[];
  loading?: boolean;
  selectedDeviceId?: string | null;
  onSelect: (camera: ICameraCandidate) => void;
}

const LENS_LABEL: Partial<Record<LensKind, string>> = {
  'main-wide': 'กล้องหลัก',
  'ultra-wide': 'Ultra-wide',
};

const LENS_BADGE_CLASS: Partial<Record<LensKind, string>> = {
  'main-wide': 'bg-emerald-500/15 text-emerald-300',
  'ultra-wide': 'bg-amber-500/15 text-amber-300',
};

const formatZoom = (zoom: IZoomRange): string => {
  const min = zoom.min.toFixed(1).replace(/\.0$/, '');
  const max = zoom.max.toFixed(1).replace(/\.0$/, '');
  return `${min}–${max}×`;
};

const CameraPicker = ({ cameras, loading, selectedDeviceId, onSelect }: ICameraPickerProps) => {
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
    <ul className="flex max-h-[60dvh] flex-col gap-2 overflow-auto">
      {cameras.map((camera) => {
        const active = camera.deviceId === selectedDeviceId;
        const lensLabel = LENS_LABEL[camera.lensKind];
        const lensBadgeClass = LENS_BADGE_CLASS[camera.lensKind];
        const zoom = camera.capabilities.zoom;
        const megapixels =
          camera.maxResolution > 0 ? `${(camera.maxResolution / 1_000_000).toFixed(1)} MP` : null;

        return (
          <li
            key={camera.deviceId}
            className={`rounded-xl border transition-colors ${
              active ? 'border-accent bg-accent/10' : 'border-white/10 bg-white/5'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(camera)}
              className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium">
                  {camera.label || `กล้องหลัง ${camera.index}`}
                </span>
                <span className="text-xs text-slate-400">กล้องหลัง {camera.index}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2 text-xs">
                {lensLabel && lensBadgeClass && (
                  <span className={`rounded-full px-2 py-0.5 ${lensBadgeClass}`}>{lensLabel}</span>
                )}
                {zoom && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-slate-300">
                    {formatZoom(zoom)}
                  </span>
                )}
                {camera.hasAutofocus && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-300">
                    AF
                  </span>
                )}
                {megapixels && (
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-slate-300">
                    {megapixels}
                  </span>
                )}
              </span>
            </button>
            <details className="group border-t border-white/10 px-4">
              <summary className="cursor-pointer list-none py-2 text-xs text-slate-400 transition-colors hover:text-slate-200">
                ดูสเปก
              </summary>
              <div className="pb-3">
                <CameraSpec camera={camera} />
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
};

export default CameraPicker;
