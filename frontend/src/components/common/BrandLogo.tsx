import React from 'react';

interface BrandLogoProps {
  className?: string;
  inverted?: boolean; // For use on dark Forest Green surfaces
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  className = '',
  inverted = false,
  iconOnly = false,
  size = 'md',
}) => {
  const strokeColor = inverted ? '#E8DCC4' : '#1F3D2B';
  const textColor = inverted ? 'text-sand' : 'text-forest';

  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-11 h-11',
    xl: 'w-16 h-16',
  };

  const textSizes = {
    sm: 'text-base font-bold tracking-tight',
    md: 'text-xl font-bold tracking-tight',
    lg: 'text-2xl font-bold tracking-tight',
    xl: 'text-4xl font-bold tracking-tight',
  };

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Custom Vector Aperture & Uncovered Focal Point */}
      <svg
        className={`${iconSizes[size]} transition-transform duration-300 group-hover:rotate-12`}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Outer Aperture Ring with Interrupted Arc */}
        <circle
          cx="32"
          cy="32"
          r="27"
          stroke={strokeColor}
          strokeWidth="3.5"
          strokeDasharray="128 32"
          strokeLinecap="round"
        />
        {/* Opposing Geometric Focus Arc */}
        <path
          d="M17 32 C17 23.716 23.716 17 32 17 C40.284 17 47 23.716 47 32"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M47 32 C47 40.284 40.284 47 32 47 C23.716 47 17 40.284 17 32"
          stroke={strokeColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="28 14"
        />
        {/* Alignment Reticle Guides */}
        <line x1="32" y1="9" x2="32" y2="17" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="32" y1="47" x2="32" y2="55" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="9" y1="32" x2="17" y2="32" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
        <line x1="47" y1="32" x2="55" y2="32" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" />
        {/* Central Electric Purple Focal Point (The Uncovered Blindspot) */}
        <circle cx="32" cy="32" r="5" fill="#8B5CF6" />
      </svg>

      {!iconOnly && (
        <div className="flex flex-col leading-none">
          <span className={`font-sans ${textSizes[size]} ${textColor} tracking-tight`}>
            Blindspot<span className="text-purple ml-0.5">AI</span>
          </span>
        </div>
      )}
    </div>
  );
};
