'use client';

import { Fragment } from 'react';

import type { ICameraCandidate, LensKind } from '@/lib/camera/types';

interface IRange {
  min?: number;
  max?: number;
}

const LENS_LABEL: Record<LensKind, string> = {
  'main-wide': 'กล้องหลัก (Main Wide)',
  'ultra-wide': 'Ultra-wide',
  unknown: 'ไม่ระบุ',
};

const formatNumber = (value?: number): string => {
  if (value === undefined) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
};

const formatRange = (range?: IRange): string => {
  if (!range || (range.min === undefined && range.max === undefined)) return '—';
  if (range.min !== undefined && range.max !== undefined) {
    return `${formatNumber(range.min)} – ${formatNumber(range.max)}`;
  }
  return formatNumber(range.min ?? range.max);
};

const formatList = (items?: string[]): string =>
  items && items.length > 0 ? items.join(', ') : '—';

const formatBoolean = (value?: boolean): string => {
  if (value === undefined) return '—';
  return value ? 'รองรับ' : 'ไม่รองรับ';
};

interface ISpecRow {
  label: string;
  value: string;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const sortObject = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortObject);
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortObject(value[key])]),
    );
  }
  return value;
};

const stringify = (value: unknown): string => JSON.stringify(sortObject(value), null, 2);

const buildSpecRows = (camera: ICameraCandidate): ISpecRow[] => {
  const cap = camera.capabilities;
  const settings = camera.settings;

  const maxWidth = cap.width?.max;
  const maxHeight = cap.height?.max;
  const resolution = maxWidth && maxHeight ? `${maxWidth} × ${maxHeight}` : '—';
  const megapixels =
    camera.maxResolution > 0 ? `${(camera.maxResolution / 1_000_000).toFixed(1)} MP` : null;
  const currentResolution =
    settings.width && settings.height ? `${settings.width} × ${settings.height}` : '—';

  return [
    { label: 'เลนส์', value: LENS_LABEL[camera.lensKind] },
    {
      label: 'ความละเอียดสูงสุด',
      value: megapixels ? `${resolution} (${megapixels})` : resolution,
    },
    { label: 'เฟรมเรต', value: `${formatRange(cap.frameRate)} fps` },
    { label: 'อัตราส่วนภาพ', value: formatRange(cap.aspectRatio) },
    {
      label: 'Zoom',
      value: cap.zoom ? `${formatNumber(cap.zoom.min)}× – ${formatNumber(cap.zoom.max)}×` : '—',
    },
    { label: 'โหมดโฟกัส', value: formatList(cap.focusMode) },
    { label: 'ระยะโฟกัส', value: formatRange(cap.focusDistance) },
    { label: 'ISO', value: formatRange(cap.iso) },
    { label: 'เวลารับแสง', value: formatRange(cap.exposureTime) },
    { label: 'ชดเชยแสง', value: formatRange(cap.exposureCompensation) },
    { label: 'อุณหภูมิสี', value: formatRange(cap.colorTemperature) },
    { label: 'ไวต์บาลานซ์', value: formatList(cap.whiteBalanceMode) },
    { label: 'โหมดวัดแสง', value: formatList(cap.exposureMode) },
    { label: 'ไฟฉาย', value: formatBoolean(cap.torch) },
    { label: 'ทิศทาง', value: formatList(cap.facingMode) },
    { label: 'ความละเอียดปัจจุบัน', value: currentResolution },
    {
      label: 'เฟรมเรตปัจจุบัน',
      value: settings.frameRate ? `${settings.frameRate} fps` : '—',
    },
    { label: 'โหมดโฟกัสปัจจุบัน', value: settings.focusMode ?? '—' },
    { label: 'Zoom ปัจจุบัน', value: settings.zoom !== undefined ? `${settings.zoom}×` : '—' },
  ];
};

const CameraSpec = ({ camera }: { camera: ICameraCandidate }) => {
  const rows = buildSpecRows(camera);

  return (
    <div>
      <dl className="grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-4 gap-y-1.5 text-xs">
        {rows.map((row) => (
          <Fragment key={row.label}>
            <dt className="text-slate-500">{row.label}</dt>
            <dd className="break-words text-slate-300">{row.value}</dd>
          </Fragment>
        ))}
      </dl>

      <div className="mt-3 border-t border-white/10 pt-3">
        <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          getCapabilities()
        </h4>
        <pre className="max-h-48 overflow-auto rounded-lg bg-black/40 p-2 text-[10px] leading-relaxed text-emerald-300/90">
          {stringify(camera.capabilities)}
        </pre>
      </div>

      <div className="mt-2">
        <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          getSettings()
        </h4>
        <pre className="max-h-48 overflow-auto rounded-lg bg-black/40 p-2 text-[10px] leading-relaxed text-sky-300/90">
          {stringify(camera.settings)}
        </pre>
      </div>
    </div>
  );
};

export default CameraSpec;
