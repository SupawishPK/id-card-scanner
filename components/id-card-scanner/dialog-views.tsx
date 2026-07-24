"use client";

export type IValidationDialogsProps = {
  cameraState: string;
  cameraError: string | null;
  onRetryCamera: () => void;
};

export const ValidationDialogs = ({
  cameraState,
  cameraError,
  onRetryCamera,
}: IValidationDialogsProps) => {
  if (cameraState !== "ready") {
    return (
      <div className="absolute inset-0 z-20 grid place-items-center bg-slate-950 px-8 text-center text-white">
        {cameraState === "error" ? (
          <div>
            <div
              className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-rose-500/15 text-2xl"
              aria-hidden
            >
              !
            </div>
            <h2 className="text-lg font-semibold">ไม่สามารถเปิดกล้องได้</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">{cameraError}</p>
            <button
              type="button"
              onClick={() => void onRetryCamera()}
              className="mt-6 min-h-11 rounded-xl bg-white px-6 py-2.5 font-semibold text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              ลองเปิดกล้องอีกครั้ง
            </button>
          </div>
        ) : (
          <div role="status">
            <div className="mx-auto size-9 animate-spin rounded-full border-2 border-white/25 border-t-white" />
            <p className="mt-4 text-sm text-slate-300">กำลังเปิดกล้อง…</p>
          </div>
        )}
      </div>
    );
  }

  return null;
};
