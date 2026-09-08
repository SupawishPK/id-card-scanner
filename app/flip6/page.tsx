'use client';

import { useCallback, useRef, useState } from 'react';

import requestFlip6RearCameraConstraints from '@/lib/camera/requestFlip6RearCamera';

interface ILogLine {
  id: number;
  text: string;
}

const Flip6Page = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const logIdRef = useRef(0);
  const [logs, setLogs] = useState<ILogLine[]>([]);
  const [loading, setLoading] = useState(false);

  const pushLog = useCallback((message: string, detail?: unknown) => {
    const text =
      detail === undefined
        ? message
        : `${message}\n${typeof detail === 'string' ? detail : JSON.stringify(detail, null, 2)}`;
    logIdRef.current += 1;
    setLogs((prev) => [...prev, { id: logIdRef.current, text }]);
  }, []);

  const openCamera = useCallback(async () => {
    setLoading(true);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    try {
      const constraints = await requestFlip6RearCameraConstraints(pushLog);
      if (!constraints) {
        pushLog('ไม่พบกล้องหลัง (camera 0)');
        return;
      }

      pushLog('เปิดสตรีมด้วย constraints', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        pushLog('video element not mounted');
        return;
      }
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      await video.play();
      pushLog('สตรีมเริ่มทำงานแล้ว (video.play สำเร็จ)');
    } catch (err) {
      pushLog('เกิดข้อผิดพลาด', err);
    } finally {
      setLoading(false);
    }
  }, [pushLog]);

  return (
    <main className="min-h-dvh w-full bg-slate-950 p-6 text-white">
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <h1 className="text-2xl font-semibold">Flip6 กล้องหลัง camera 0</h1>

        <button
          type="button"
          onClick={() => void openCamera()}
          disabled={loading}
          className="w-fit rounded-full bg-[var(--color-accent)] px-8 py-3 font-medium text-white disabled:opacity-50"
        >
          {loading ? 'กำลังเปิด…' : 'เปิดกล้อง'}
        </button>

        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="aspect-video w-full rounded-xl bg-black object-cover"
        />

        <div className="rounded-xl border border-white/10 bg-black/40 p-4">
          <h2 className="mb-2 text-sm font-medium text-slate-400">Log</h2>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-slate-200">
            {logs.length === 0
              ? 'ยังไม่มี log — กด "เปิดกล้อง"'
              : logs.map((log) => log.text).join('\n\n')}
          </pre>
        </div>
      </div>
    </main>
  );
};

export default Flip6Page;
