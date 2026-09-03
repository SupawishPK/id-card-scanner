'use client';

import type { ResolutionPreset } from '@/lib/camera/resolution';

const OPTIONS: { value: ResolutionPreset; label: string }[] = [
  { value: '4k', label: '4K' },
  { value: '8k', label: '8K' },
];

interface IResolutionSelectorProps {
  value: ResolutionPreset;
  onChange: (preset: ResolutionPreset) => void;
}

const ResolutionSelector = ({ value, onChange }: IResolutionSelectorProps) => {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-400">ความละเอียดสูงสุด</span>
      <div className="flex gap-1 rounded-full border border-white/10 bg-white/5 p-1">
        {OPTIONS.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                active ? 'bg-white text-slate-900' : 'text-slate-300 hover:text-white'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ResolutionSelector;
