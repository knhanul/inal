import React from 'react';
import { AlertCircle, RotateCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = '날씨 데이터를 불러오지 못했어요',
  message = '일시적인 네트워크 지연이거나 기상 서버 응답을 기다리는 중입니다.',
  onRetry,
}) => {
  return (
    <div
      role="alert"
      className="flex min-h-[280px] w-full flex-col items-center justify-center rounded-card border border-amber-200/80 bg-inal-surface p-6 text-center shadow-card"
    >
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-inal-accent">
        <AlertCircle className="h-5 w-5" />
      </div>
      <h3 className="text-base font-bold text-inal-text">{title}</h3>
      <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-inal-textMuted">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="touch-target mt-4 inline-flex items-center gap-1.5 rounded-xl bg-inal-text px-4 py-2.5 text-xs font-semibold text-white transition active:scale-95"
        >
          <RotateCw className="h-3.5 w-3.5" />
          다시 시도
        </button>
      )}
    </div>
  );
};
