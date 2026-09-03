export type ResolutionPreset = '4k' | '8k';

export const RESOLUTION_PRESETS: Record<ResolutionPreset, { width: number; height: number }> = {
  '4k': { width: 3840, height: 2160 },
  '8k': { width: 7680, height: 4320 },
};
