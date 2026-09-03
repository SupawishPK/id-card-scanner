'use client';

import type { CameraMode } from '@/lib/camera/types';

const MODES: { value: CameraMode; label: string }[] = [
  { value: 'auto', label: 'อัตโนมัติ' },
  { value: 'best', label: 'ดีที่สุด' },
  { value: 'index', label: 'ตาม index' },
  { value: 'manual', label: 'เลือกเอง' },
];

interface IModeSelectorProps {
  mode: CameraMode;
  onChange: (mode: CameraMode) => void;
  disabled?: boolean;
}

const ModeSelector = ({ mode, onChange, disabled }: IModeSelectorProps) => {
  return (
    <div className="flex gap-1 rounded-full border border-white/10 bg-white/5 p-1">
      {MODES.map((item) => {
        const active = mode === item.value;
        return (
          <button
            key={item.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(item.value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? 'bg-white text-slate-900'
                : 'text-slate-300 hover:text-white disabled:opacity-50'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
};

export default ModeSelector;
