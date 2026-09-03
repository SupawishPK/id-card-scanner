'use client';

import StarBorder from '@/components/reactbits/StarBorder';

interface IErrorOverlayProps {
  message?: string;
  onRetry?: () => void;
}

const ErrorOverlay = ({ message, onRetry }: IErrorOverlayProps) => {
  return (
    <div className="flex flex-col items-center gap-6 px-6 text-center">
      <h2 className="text-xl font-semibold text-white">ไม่สามารถเปิดกล้องได้</h2>
      <p className="max-w-sm text-sm leading-6 text-slate-400">{message}</p>
      {onRetry && (
        <StarBorder
          onClick={onRetry}
          color="var(--color-accent)"
          backgroundColor="rgba(2, 6, 23, 0.6)"
          textColor="#ffffff"
          borderColor="var(--color-accent)"
        >
          ลองอีกครั้ง
        </StarBorder>
      )}
    </div>
  );
};

export default ErrorOverlay;
