'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { formatLogClock, formatLogText } from '@/lib/camera/log';
import type { CameraLogLevel, ICameraLogEntry } from '@/lib/camera/log';

interface ICameraLogProps {
  logs: ICameraLogEntry[];
  onClose: () => void;
  onClear: () => void;
}

const LEVEL_BADGE_CLASS: Record<CameraLogLevel, string> = {
  info: 'bg-white/10 text-slate-300',
  success: 'bg-emerald-500/15 text-emerald-300',
  warn: 'bg-amber-500/15 text-amber-300',
  error: 'bg-red-500/15 text-red-300',
};

const LEVEL_TEXT_CLASS: Record<CameraLogLevel, string> = {
  info: 'text-slate-200',
  success: 'text-emerald-300',
  warn: 'text-amber-300',
  error: 'text-red-400',
};

const CameraLog = ({ logs, onClose, onClear }: ICameraLogProps) => {
  const [copied, setCopied] = useState(false);
  const listRef = useRef<HTMLUListElement | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [logs]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formatLogText(logs));
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable in some contexts — ignore.
    }
  }, [logs]);

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-black/90 p-6 backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-lg font-semibold">Log กล้อง</h2>
          <span className="text-xs text-slate-400">{logs.length} รายการ</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white"
          >
            {copied ? 'คัดลอกแล้ว' : 'คัดลอก'}
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-full border border-white/20 px-4 py-2 text-sm text-slate-300"
          >
            ล้าง
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/20 px-4 py-2 text-sm text-white"
          >
            ปิด
          </button>
        </div>
      </div>

      {logs.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">ยังไม่มี log</p>
      ) : (
        <ul
          ref={listRef}
          className="flex flex-1 flex-col gap-2 overflow-auto rounded-xl border border-white/10 bg-black/40 p-3"
        >
          {logs.map((entry) => (
            <li key={entry.id} className="border-b border-white/5 pb-2 last:border-0 last:pb-0">
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-slate-500">{formatLogClock(entry.timestamp)}</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${LEVEL_BADGE_CLASS[entry.level]}`}
                >
                  {entry.level}
                </span>
              </div>
              <p className={`mt-1 break-words text-xs ${LEVEL_TEXT_CLASS[entry.level]}`}>
                {entry.message}
              </p>
              {entry.detail && (
                <pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words rounded bg-black/40 p-2 font-mono text-[10px] leading-relaxed text-slate-400">
                  {entry.detail}
                </pre>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default CameraLog;
