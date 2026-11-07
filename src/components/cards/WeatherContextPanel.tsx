import React, { useEffect, useRef } from "react";

// Shared read-only renderer with weather WEB. Never calculates different winners on mobile.
export const WeatherContextPanel: React.FC<{
  stationId: string;
  mode: "today" | "battle" | "season";
}> = ({ stationId, mode }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    const url = "/weather-context.mjs";
    import(/* @vite-ignore */ url)
      .then(({ mountWeatherContext }) => {
        if (!disposed && ref.current)
          cleanup = mountWeatherContext(ref.current, {
            mode,
            station: stationId,
            compact: true,
          });
      })
      .catch(() => {
        if (!disposed && ref.current)
          ref.current.textContent =
            "비교 화면을 불러오지 못했어요. 새로고침해 주세요.";
      });
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [stationId, mode]);
  return <div ref={ref} data-no-carousel-swipe="true" />;
};
