import React from 'react';

interface BrandLogoProps {
  customLogoUrl?: string;
  compact?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ customLogoUrl, compact = false }) => {
  if (customLogoUrl) {
    return (
      <img
        src={customLogoUrl}
        alt="이날 — 이야기가 있는 날씨"
        className="h-7 w-auto object-contain"
      />
    );
  }

  return (
    <div className="inline-flex items-center gap-2 select-none">
      <span
        className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-inal-accentSoft text-inal-accent"
        aria-hidden="true"
      >
        <svg viewBox="0 0 32 32" className="h-4 w-4" fill="none">
          <circle cx="13" cy="12" r="5.5" fill="currentColor" />
          <path
            d="M13.5 23.5H23C25.4853 23.5 27.5 21.4853 27.5 19C27.5 16.655 25.705 14.729 23.416 14.519C22.667 11.634 20.044 9.5 16.917 9.5C13.235 9.5 10.25 12.485 10.25 16.167C10.25 16.528 10.279 16.882 10.334 17.228C8.993 17.759 8 19.068 8 20.6C8 22.202 9.298 23.5 10.9 23.5H13.5Z"
            fill="#23262E"
          />
        </svg>
      </span>
      <div className="flex flex-col leading-none">
        <span className="text-base font-bold tracking-tight text-inal-text">이날</span>
        {!compact && (
          <span className="mt-0.5 text-[10px] font-medium tracking-tight text-inal-textMuted">
            이야기가 있는 날씨
          </span>
        )}
      </div>
    </div>
  );
};
