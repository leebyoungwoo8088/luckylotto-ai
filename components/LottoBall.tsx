import React from 'react';
import { getBallColor, getBallTailwindColors } from '../utils/lottoUtils';

interface LottoBallProps {
  number: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  isRolling?: boolean;
}

const LottoBall: React.FC<LottoBallProps> = ({ number, size = 'md', className = '', isRolling = false }) => {
  const color = getBallColor(number);
  const styles = getBallTailwindColors(color);

  let sizeClass = 'w-10 h-10 text-lg';
  if (size === 'sm') sizeClass = 'w-8 h-8 text-sm';
  if (size === 'lg') sizeClass = 'w-16 h-16 text-2xl';
  if (size === 'xl') sizeClass = 'w-24 h-24 text-4xl';

  return (
    <div
      className={`
        relative rounded-full flex items-center justify-center font-bold font-sans
        border-b-4 ${styles.border} ${styles.bg} ${styles.text} ${styles.shadow}
        shadow-[inset_-5px_-5px_15px_rgba(0,0,0,0.3),inset_5px_5px_15px_rgba(255,255,255,0.4)]
        ${sizeClass} ${className}
        ${isRolling ? 'animate-spin' : ''}
      `}
      style={{
        boxShadow: `
          inset -4px -4px 8px rgba(0,0,0,0.4),
          inset 4px 4px 8px rgba(255,255,255,0.4),
          0px 4px 6px rgba(0,0,0,0.3)
        `
      }}
    >
      {/* Glossy highlight for 3D effect */}
      <div className="absolute top-2 left-2 w-1/3 h-1/3 bg-white opacity-40 rounded-full blur-[1px]"></div>
      
      <span className="drop-shadow-md z-10">{number}</span>
    </div>
  );
};

export default LottoBall;