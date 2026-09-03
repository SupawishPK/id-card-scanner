'use client';

import DotField from '@/components/reactbits/DotField';

const CameraBackdrop = () => {
  return (
    <div className="absolute inset-0">
      <DotField
        dotRadius={1.2}
        dotSpacing={18}
        gradientFrom="rgba(255, 90, 0, 0.22)"
        gradientTo="rgba(30, 41, 59, 0.12)"
        glowColor="#0f172a"
      />
    </div>
  );
};

export default CameraBackdrop;
