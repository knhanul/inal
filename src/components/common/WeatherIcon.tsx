import React from 'react';
import type { WeatherConditionTheme } from '../../types/domain';

interface WeatherIconProps {
  condition: WeatherConditionTheme;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

const SIZE_CLASSES: Record<NonNullable<WeatherIconProps['size']>, string> = {
  sm: 'w-5 h-5',
  md: 'w-7 h-7',
  lg: 'w-11 h-11',
  xl: 'w-14 h-14',
};

export const WeatherIcon: React.FC<WeatherIconProps> = ({
  condition,
  size = 'md',
  className = '',
  label,
}) => {
  const sizeClass = SIZE_CLASSES[size];

  if (condition === 'rain') {
    return (
      <svg viewBox="0 0 48 48" fill="none" role="img" aria-label={label || '비'} className={`${sizeClass} ${className}`}>
        <path d="M15 30H34C38.4183 30 42 26.4183 42 22C42 17.8559 38.8501 14.4478 34.815 14.0419C33.4281 8.83909 28.6939 5 23.0667 5C16.3472 5 10.9 10.4472 10.9 17.1667C10.9 17.788 10.9466 18.3986 11.0365 18.9949C8.16535 19.9923 6 22.7219 6 25.9333C6 29.8361 9.16389 30 13.0667 30H15Z" fill="#64748B" />
        <path d="M17 35L14.5 42M25 35L22.5 42M33 35L30.5 42" stroke="#2B6CB0" strokeWidth="3.2" strokeLinecap="round" />
      </svg>
    );
  }
  if (condition === 'snow') {
    return (
      <svg viewBox="0 0 48 48" fill="none" role="img" aria-label={label || '눈'} className={`${sizeClass} ${className}`}>
        <path d="M15 29H34C38.4183 29 42 25.4183 42 21C42 16.8559 38.8501 13.4478 34.815 13.0419C33.4281 7.83909 28.6939 4 23.0667 4C16.3472 4 10.9 9.4472 10.9 16.1667C10.9 16.788 10.9466 17.3986 11.0365 17.9949C8.16535 18.9923 6 21.7219 6 24.9333C6 28.8361 9.16389 29 13.0667 29H15Z" fill="#7C93A8" />
        <circle cx="17" cy="36" r="2.5" fill="#4A90B8" />
        <circle cx="25" cy="39" r="2.5" fill="#4A90B8" />
        <circle cx="33" cy="36" r="2.5" fill="#4A90B8" />
      </svg>
    );
  }
  if (condition === 'cloudy') {
    return (
      <svg viewBox="0 0 48 48" fill="none" role="img" aria-label={label || '구름많음·흐림'} className={`${sizeClass} ${className}`}>
        <circle cx="17" cy="17" r="7.5" fill="#E59A28" fillOpacity="0.85" />
        <path d="M16 36H35C39.4183 36 43 32.4183 43 28C43 23.8559 39.8501 20.4478 35.815 20.0419C34.4281 14.8391 29.6939 11 24.0667 11C17.3472 11 11.9 16.4472 11.9 23.1667C11.9 23.788 11.9466 24.3986 12.0365 24.9949C9.16535 25.9923 7 28.7219 7 31.9333C7 34.1793 8.82071 36 11.0667 36H16Z" fill="#64748B" />
      </svg>
    );
  }
  if (condition === 'night') {
    return (
      <svg viewBox="0 0 48 48" fill="none" role="img" aria-label={label || '밤 하늘'} className={`${sizeClass} ${className}`}>
        <path d="M31.5 29.8C25.2 29.8 20.2 24.8 20.2 18.5C20.2 14.5 22.3 11 25.4 9C17.6 9.8 11.5 16.4 11.5 24.4C11.5 33 18.5 40 27.1 40C33.8 40 39.5 35.7 41.7 29.8C38.6 30.8 35.1 29.8 31.5 29.8Z" fill="#E06D44" />
        <circle cx="35" cy="14" r="2" fill="#E59A28" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" fill="none" role="img" aria-label={label || '맑음'} className={`${sizeClass} ${className}`}>
      <circle cx="24" cy="24" r="10.5" fill="#E59A28" />
      <path d="M24 6V10M24 38V42M6 24H10M38 24H42M11.27 11.27L14.1 14.1M33.9 33.9L36.73 36.73M36.73 11.27L33.9 14.1M14.1 33.9L11.27 36.73" stroke="#E06D44" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
};
