import React from 'react';
import { useSwipeCarousel } from '../../hooks/useSwipeCarousel';
import { CardPagination } from './CardPagination';

interface CardCarouselProps {
  children: React.ReactNode[];
  cardLabels?: string[];
  initialIndex?: number;
  onIndexChange?: (index: number) => void;
  ariaLabel?: string;
}

export const CardCarousel: React.FC<CardCarouselProps> = ({
  children,
  cardLabels,
  initialIndex = 0,
  onIndexChange,
  ariaLabel = '날씨 카드 목록',
}) => {
  const validSlides = React.Children.toArray(children);
  const totalCount = validSlides.length;

  const {
    activeIndex,
    dragOffsetPx,
    isDragging,
    canGoPrev,
    canGoNext,
    goToIndex,
    goPrev,
    goNext,
    touchHandlers,
  } = useSwipeCarousel({ totalCount, initialIndex, onIndexChange });

  if (totalCount === 0) return null;

  return (
    <section aria-label={ariaLabel} className="flex w-full flex-col gap-2.5 overflow-hidden">
      {cardLabels && cardLabels.length > 1 && (
        <div
          className="no-scrollbar flex items-center gap-1.5 overflow-x-auto px-0.5 py-0.5"
          data-no-carousel-swipe="true"
        >
          {cardLabels.map((label, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={label + idx}
                type="button"
                onClick={() => goToIndex(idx)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? 'bg-inal-text text-white shadow-sm'
                    : 'bg-inal-surface text-inal-textMuted border border-inal-border hover:text-inal-text'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      )}

      <div className="relative w-full overflow-hidden rounded-card" {...touchHandlers}>
        <div
          className={`flex w-full ${isDragging ? '' : 'transition-transform duration-300 ease-out'}`}
          style={{
            transform: `translate3d(calc(-${activeIndex * 100}% + ${dragOffsetPx}px), 0, 0)`,
          }}
        >
          {validSlides.map((slide, idx) => (
            <div key={idx} aria-hidden={idx !== activeIndex} className="w-full shrink-0 grow-0 basis-full px-0.5">
              {slide}
            </div>
          ))}
        </div>
      </div>

      <CardPagination
        total={totalCount}
        activeIndex={activeIndex}
        labels={cardLabels}
        onSelect={goToIndex}
        onPrev={goPrev}
        onNext={goNext}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
      />
    </section>
  );
};
