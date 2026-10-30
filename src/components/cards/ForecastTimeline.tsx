import React from 'react';
import type { HourlyTimelineSlotViewModel } from '../../types/viewmodel';
import { WeatherIcon } from '../common/WeatherIcon';

interface ForecastTimelineProps {
  slots: HourlyTimelineSlotViewModel[];
  showWind?: boolean;
}

export const ForecastTimeline: React.FC<ForecastTimelineProps> = ({ slots, showWind = true }) => {
  if (!slots || slots.length === 0) {
    return (
      <div className="rounded-xl bg-inal-surfaceSubtle p-4 text-center text-xs text-inal-textMuted">
        시간별 예보 자료가 아직 수집되지 않았습니다.
      </div>
    );
  }

  return (
    <div data-no-carousel-swipe="true" className="no-scrollbar flex items-stretch gap-2 overflow-x-auto py-1">
      {slots.map((slot, idx) => {
        const isHighPop = (slot.popValue ?? 0) >= 60;
        const is3h = (slot.stepHours ?? 1) >= 3;
        return (
          <React.Fragment key={`${slot.timeLabel}-${idx}`}>
          {slot.isStepStart && (
            <div className="flex shrink-0 flex-col items-center justify-center px-0.5" aria-label="이후 3시간 간격">
              <div className="h-full border-l-2 border-dashed border-sky-400" />
              <span className="mt-1 whitespace-nowrap text-[9px] font-bold text-sky-700 [writing-mode:vertical-rl]">이후 3시간 간격</span>
            </div>
          )}
          <div
            className={`flex ${is3h ? 'min-w-[110px]' : 'min-w-[66px]'} shrink-0 flex-col items-center justify-between rounded-2xl border px-2.5 py-2.5 text-center ${
              isHighPop ? 'border-sky-200 bg-sky-50/70' : 'border-inal-border/80 bg-inal-surfaceSubtle/60'
            }`}
          >
            <span className="text-[11px] font-semibold tabular-nums text-inal-textMuted">
              {idx === 0 ? '지금' : slot.dayLabel ? `${slot.dayLabel} ${slot.timeLabel}` : slot.timeLabel}
            </span>
            {is3h && <span className="text-[9px] font-semibold text-sky-700">3시간 간격</span>}
            <div className="my-1.5">
              <WeatherIcon condition={slot.conditionIcon} size="sm" label={slot.conditionText} />
            </div>
            <span className="text-sm font-bold tabular-nums text-inal-text">{slot.tempText}</span>
            <span className={`mt-1 text-[10px] font-semibold tabular-nums ${isHighPop ? 'text-sky-700' : 'text-inal-textSoft'}`}>
              강수 {slot.popText}
            </span>
            {showWind && (
              <span className="mt-0.5 text-[10px] tabular-nums text-inal-textMuted">{slot.windText}</span>
            )}
          </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
