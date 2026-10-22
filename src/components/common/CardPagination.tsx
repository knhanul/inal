import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CardPaginationProps {
  total: number;
  activeIndex: number;
  labels?: string[];
  onSelect: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  canGoPrev: boolean;
  canGoNext: boolean;
}

export const CardPagination: React.FC<CardPaginationProps> = ({
  total,
  activeIndex,
  labels,
  onSelect,
  onPrev,
  onNext,
  canGoPrev,
  canGoNext,
}) => {
  if (total <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-2 px-1 py-1">
      <button
        type="button"
        onClick={onPrev}
        disabled={!canGoPrev}
        aria-label="이전 카드 보기"
        className="touch-target inline-flex items-center justify-center rounded-full border border-inal-border bg-inal-surface text-inal-text transition active:scale-95 disabled:opacity-35 disabled:pointer-events-none"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="flex flex-1 flex-col items-center gap-1 overflow-hidden">
        {labels && labels[activeIndex] && (
          <span className="truncate text-[11px] font-semibold text-inal-textMuted">
            {activeIndex + 1}/{total} · {labels[activeIndex]}
          </span>
        )}
        <div className="flex items-center justify-center gap-1.5" role="tablist" aria-label="카드 페이지 선택">
          {Array.from({ length: total }, (_, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={idx}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={labels?.[idx] ? `${idx + 1}번 카드: ${labels[idx]}` : `${idx + 1}번 카드`}
                onClick={() => onSelect(idx)}
                className="py-2 px-0.5 focus:outline-none"
              >
                <span
                  className={`block h-1.5 rounded-full transition-all duration-200 ${
                    isActive ? 'w-6 bg-inal-accent' : 'w-1.5 bg-inal-border hover:bg-inal-textSoft'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={!canGoNext}
        aria-label="다음 카드 보기"
        className="touch-target inline-flex items-center justify-center rounded-full border border-inal-border bg-inal-surface text-inal-text transition active:scale-95 disabled:opacity-35 disabled:pointer-events-none"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
};
