import React from 'react';
import { ChevronRight } from 'lucide-react';
import type {
  HourlyTimelineSlotViewModel,
  DailyForecastItemViewModel,
  BottomSheetDetailPayload,
} from '../../types/viewmodel';
import type { DataProvenance } from '../../types/domain';
import type { ApiRtTodayOutfitSegment } from '../../types/api';
import { ForecastTimeline } from './ForecastTimeline';
import { WeatherIcon } from '../common/WeatherIcon';
import { DataSourceLabel } from '../common/DataSourceLabel';
import { InfoTip, InfoTipAuto } from '../common/InfoTip';
import { formatTemp, isValidNumber } from '../../api/mappers';

interface ForecastCardProps {
  title: string;
  subtitle: string;
  provenance: DataProvenance;
  hourlySlots?: HourlyTimelineSlotViewModel[];
  dailyItems?: DailyForecastItemViewModel[];
  outfitSegments?: ApiRtTodayOutfitSegment[];
  detail?: BottomSheetDetailPayload;
  onOpenDetail?: (detail: BottomSheetDetailPayload) => void;
}

export const ForecastCard: React.FC<ForecastCardProps> = ({
  title,
  subtitle,
  provenance,
  hourlySlots,
  dailyItems,
  outfitSegments,
  detail,
  onOpenDetail,
}) => {
  return (
    <article className="flex flex-col justify-between rounded-card border border-inal-border bg-inal-surface p-5 shadow-card">
      <div>
        <DataSourceLabel provenance={provenance} compact />
        <h3 className="mt-2 text-base font-bold leading-snug text-inal-text">{title}</h3>
        <InfoTipAuto text={subtitle} max={44} label="안내" className="mt-0.5" />
      </div>

      {hourlySlots && hourlySlots.length > 0 && (
        <div className="my-3.5">
          <ForecastTimeline slots={hourlySlots} />
        </div>
      )}

      {outfitSegments && outfitSegments.length > 0 && (
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center gap-0.5 text-[11px] font-bold text-inal-textMuted">
            <span>옷차림 가이드</span>
            <InfoTip
              label="옷차림 기준"
              detail="구간에서 가장 추운 시각 기온으로 겉옷을, 가장 따뜻한 시각 기온으로 안에 입을 옷을 고른 참고용 가이드입니다. 강수·바람 안내는 예보값 기준입니다."
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {outfitSegments.slice(0, 4).map((seg) => (
              <div key={seg.id} className="rounded-xl border border-inal-border/70 bg-inal-surfaceSubtle/60 p-2.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-inal-text">
                  <span>{seg.label}</span>
                  <span className="tabular-nums text-inal-accent">
                    {isValidNumber(seg.minTa) && isValidNumber(seg.maxTa) ? `${seg.minTa}~${seg.maxTa}℃` : ''}
                  </span>
                </div>
                <p className="mt-1 text-[11px] font-medium text-inal-text">겉: {seg.outer}</p>
                <p className="text-[10px] text-inal-textMuted">안: {seg.inner}</p>
                {seg.note && <p className="mt-0.5 text-[10px] font-semibold text-sky-700">{seg.note}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {dailyItems && dailyItems.length > 0 && (
        <div className="my-3 space-y-2">
          {dailyItems.map((day) => {
            const diffFromNormal =
              isValidNumber(day.maxVal) && isValidNumber(day.normalMaxVal)
                ? Math.round((day.maxVal - day.normalMaxVal) * 10) / 10
                : null;
            return (
              <div
                key={day.date}
                className={`flex items-center justify-between rounded-xl px-3 py-2 text-xs ${
                  day.isToday ? 'bg-inal-accentSoft/70 font-semibold' : 'bg-inal-surfaceSubtle/60'
                }`}
              >
                <div className="flex items-center gap-2 min-w-[78px]">
                  <span className="font-bold text-inal-text">{day.dayOfWeek}</span>
                  <span className="tabular-nums text-[11px] text-inal-textMuted">{day.dateLabel}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <WeatherIcon condition={day.conditionIcon} size="sm" label={day.conditionText} />
                  <span className="text-[11px] tabular-nums text-sky-700 font-semibold">{day.popText}</span>
                </div>
                <div className="flex items-center gap-2 text-right tabular-nums">
                  <span className="text-sky-700 font-semibold">{day.minTempText}</span>
                  <span className="text-inal-textSoft">/</span>
                  <span className="text-inal-accent font-bold">{day.maxTempText}</span>
                  {isValidNumber(diffFromNormal) && (
                    <span className="hidden min-[360px]:inline rounded bg-white px-1.5 py-0.5 text-[10px] text-inal-textMuted">
                      평년 {formatTemp(diffFromNormal, true)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {detail && onOpenDetail && (
        <button
          type="button"
          onClick={() => onOpenDetail(detail)}
          className="touch-target mt-3 flex w-full items-center justify-between rounded-xl border border-inal-border bg-inal-surfaceSubtle/50 px-3.5 py-2.5 text-xs font-semibold text-inal-text transition hover:bg-inal-surfaceSubtle"
        >
          <span>자세히 보기</span>
          <ChevronRight className="h-4 w-4 text-inal-textMuted" />
        </button>
      )}
    </article>
  );
};
