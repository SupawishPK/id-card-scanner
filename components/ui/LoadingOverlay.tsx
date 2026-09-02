'use client';

import StarBorder from '@/components/reactbits/StarBorder';

interface ILoadingOverlayProps {
  message?: string;
}

const LoadingOverlay = ({ message = 'กำลังเปิดกล้อง…' }: ILoadingOverlayProps) => {
  return (
    <div className="grid h-full w-full place-items-center p-6">
      <StarBorder
        disabled
        color="#ffffff"
        speed="3s"
        backgroundColor="rgba(2, 6, 23, 0.6)"
        textColor="#ffffff"
        borderColor="rgba(255, 255, 255, 0.2)"
      >
        {message}
      </StarBorder>
    </div>
  );
};

export default LoadingOverlay;
