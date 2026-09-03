'use client';

interface ILiveControlsProps {
  label: string;
  onSwitch: () => void;
}

const LiveControls = ({ label, onSwitch }: ILiveControlsProps) => {
  return (
    <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 bg-gradient-to-b from-black/70 to-transparent p-4">
      <span className="truncate text-sm text-white/90">{label}</span>
      <button
        type="button"
        onClick={onSwitch}
        className="shrink-0 rounded-full border border-white/20 bg-black/40 px-4 py-2 text-sm text-white backdrop-blur"
      >
        สลับกล้อง
      </button>
    </div>
  );
};

export default LiveControls;
