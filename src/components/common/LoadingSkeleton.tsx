import React from 'react';

interface LoadingSkeletonProps {
  lines?: number;
  heightClass?: string;
  label?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  lines = 4,
  heightClass = 'min-h-[340px]',
  label = '날씨 이야기를 불러오는 중입니다…',
}) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex w-full flex-col justify-between rounded-card border border-inal-border bg-inal-surface p-5 shadow-card ${heightClass}`}
    >
      <div className="space-y-3 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-5 w-24 rounded-md bg-inal-surfaceSubtle" />
          <div className="h-5 w-16 rounded-md bg-inal-surfaceSubtle" />
        </div>
        <div className="h-10 w-36 rounded-lg bg-inal-surfaceSubtle" />
        <div className="h-4 w-4/5 rounded bg-inal-surfaceSubtle" />
        <div className="pt-3 space-y-2">
          {Array.from({ length: lines }, (_, idx) => (
            <div key={idx} className="h-10 w-full rounded-xl bg-inal-surfaceSubtle/80" />
          ))}
        </div>
      </div>
      <p className="mt-4 text-center text-xs font-medium text-inal-textSoft">{label}</p>
    </div>
  );
};
