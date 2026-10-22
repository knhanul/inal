import { useState, useRef, useCallback, useEffect } from 'react';
import type React from 'react';

interface UseSwipeCarouselOptions {
  totalCount: number;
  initialIndex?: number;
  swipeThresholdPx?: number;
  onIndexChange?: (index: number) => void;
}

export function useSwipeCarousel({
  totalCount,
  initialIndex = 0,
  swipeThresholdPx = 44,
  onIndexChange,
}: UseSwipeCarouselOptions) {
  const [activeIndex, setActiveIndex] = useState<number>(() =>
    Math.min(Math.max(0, initialIndex), Math.max(0, totalCount - 1))
  );
  const [dragOffsetPx, setDragOffsetPx] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const touchStartRef = useRef<{ x: number; y: number; lockedAxis: 'x' | 'y' | null } | null>(null);

  useEffect(() => {
    if (activeIndex >= totalCount && totalCount > 0) {
      setActiveIndex(totalCount - 1);
    }
  }, [activeIndex, totalCount]);

  const goToIndex = useCallback(
    (nextIndex: number) => {
      if (totalCount <= 0) return;
      const clamped = Math.min(Math.max(0, nextIndex), totalCount - 1);
      setActiveIndex(clamped);
      setDragOffsetPx(0);
      setIsDragging(false);
      onIndexChange?.(clamped);
    },
    [totalCount, onIndexChange]
  );

  const goPrev = useCallback(() => {
    if (activeIndex > 0) goToIndex(activeIndex - 1);
  }, [activeIndex, goToIndex]);

  const goNext = useCallback(() => {
    if (activeIndex < totalCount - 1) goToIndex(activeIndex + 1);
  }, [activeIndex, totalCount, goToIndex]);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLElement>) => {
    const target = e.target as HTMLElement | null;
    if (target && target.closest('[data-no-carousel-swipe="true"]')) {
      touchStartRef.current = null;
      return;
    }
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, lockedAxis: null };
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLElement>) => {
      if (!touchStartRef.current || e.touches.length !== 1) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;

      if (!touchStartRef.current.lockedAxis) {
        if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return;
        touchStartRef.current.lockedAxis = Math.abs(deltaX) > Math.abs(deltaY) ? 'x' : 'y';
      }
      if (touchStartRef.current.lockedAxis === 'y') {
        setIsDragging(false);
        setDragOffsetPx(0);
        return;
      }

      const isAtFirstAndPullingRight = activeIndex === 0 && deltaX > 0;
      const isAtLastAndPullingLeft = activeIndex === totalCount - 1 && deltaX < 0;
      const dampedDelta = isAtFirstAndPullingRight || isAtLastAndPullingLeft ? deltaX * 0.28 : deltaX;
      setDragOffsetPx(dampedDelta);
    },
    [activeIndex, totalCount]
  );

  const handleTouchEnd = useCallback(() => {
    if (!touchStartRef.current) return;
    const lockedAxis = touchStartRef.current.lockedAxis;
    touchStartRef.current = null;
    setIsDragging(false);

    if (lockedAxis === 'x') {
      if (dragOffsetPx <= -swipeThresholdPx && activeIndex < totalCount - 1) {
        goToIndex(activeIndex + 1);
        return;
      }
      if (dragOffsetPx >= swipeThresholdPx && activeIndex > 0) {
        goToIndex(activeIndex - 1);
        return;
      }
    }
    setDragOffsetPx(0);
  }, [activeIndex, dragOffsetPx, goToIndex, swipeThresholdPx, totalCount]);

  return {
    activeIndex,
    dragOffsetPx,
    isDragging,
    canGoPrev: activeIndex > 0,
    canGoNext: activeIndex < totalCount - 1,
    goToIndex,
    goPrev,
    goNext,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchEnd,
    },
  };
}
