import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { HeroCardViewModel, BottomSheetDetailPayload } from '../../types/viewmodel';
import { WeatherIcon } from '../common/WeatherIcon';
import { WeatherMetric } from '../common/WeatherMetric';
import { DataSourceLabel } from '../common/DataSourceLabel';
import { formatTemp, isValidNumber } from '../../api/mappers';

interface WeatherHeroCardProps {
  vm: HeroCardViewModel;
  onOpenDetail: (detail: BottomSheetDetailPayload) => void;
}

const THEME_ACCENT_BORDERS: Record<HeroCardViewModel['theme'], string> = {
  sunny: 'border-amber-200/80',
  cloudy: 'border-slate-200/90',
  rain: 'border-sky-200/90',
  snow: 'border-cyan-200/90',
  night: 'border-stone-300/80',
};

export const WeatherHeroCard: React.FC<WeatherHeroCardProps> = ({ vm, onOpenDetail }) => {
  const borderClass = THEME_ACCENT_BORDERS[vm.theme] || 'border-inal-border';
  const dist = vm.distribution;

  return (
    <article className={`flex flex-col justify-between rounded-card border ${borderClass} bg-inal-surface p-5 shadow-card`}>
      <div className="flex items-center justify-between gap-2">
        <DataSourceLabel provenance={vm.provenance} compact />
        <span className="shrink-0 rounded-full bg-inal-surfaceSubtle px-2.5 py-0.5 text-[11px] font-semibold text-inal-textMuted">
          {vm.conditionLabel}
        </span>
      </div>

      <div className="my-4 flex items-center justify-between gap-3">
        <div>
          <span
            className={`font-extrabold tracking-tight tabular-nums ${
              vm.isTempMissing ? 'text-2xl text-inal-textMuted' : 'text-[44px] leading-none text-inal-text'
            }`}
          >
            {vm.temperatureText}
          </span>
          <div className="mt-2 flex items-center gap-2 text-xs font-medium text-inal-textMuted tabular-nums">
            <span>
              오늘 최저 <strong className="font-bold text-sky-700">{vm.todayLowText}</strong>
            </span>
            <span aria-hidden="true" className="text-inal-border">/</span>
            <span>
              최고 <strong className="font-bold text-inal-accent">{vm.todayHighText}</strong>
            </span>
          </div>
        </div>

        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-inal-surfaceSubtle/70">
          <WeatherIcon condition={vm.theme} size="xl" label={vm.conditionLabel} />
        </div>
      </div>

      <div className="rounded-2xl bg-inal-accentSoft/65 p-3.5">
        <p className="text-sm font-bold leading-snug text-inal-text">{vm.anomalyHeadline}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-inal-textMuted">{vm.anomalySubline}</p>

        {isValidNumber(dist.p10) && isValidNumber(dist.p90) && (
          <div className="mt-2.5">
            <div className="relative h-2 w-full rounded-full bg-white/90 overflow-hidden">
              <div className="absolute top-0 bottom-0 rounded-full bg-amber-300/75" style={{ left: '15%', width: '70%' }} />
              <div
                className="absolute top-0 bottom-0 w-2 -ml-1 rounded-full bg-inal-accent"
                style={{ left: `${Math.min(95, Math.max(5, dist.percentile ?? 50))}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] tabular-nums text-inal-textMuted">
              <span>보통 범위(10~90%) {formatTemp(dist.p10)}~{formatTemp(dist.p90)}</span>
              <span>평균 {formatTemp(dist.mean)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3.5 grid grid-cols-3 gap-2">
        {vm.metrics.map((m) => (
          <WeatherMetric key={m.label} metric={m} compact />
        ))}
      </div>

      <button
        type="button"
        onClick={() => onOpenDetail(vm.detail)}
        className="touch-target mt-3.5 flex w-full items-center justify-between rounded-xl border border-inal-border bg-inal-surfaceSubtle/50 px-3.5 py-2.5 text-xs font-semibold text-inal-text transition hover:bg-inal-surfaceSubtle active:scale-[0.99]"
      >
        <span>3대 기준 기간 분포 · 계산 근거 상세보기</span>
        <ChevronRight className="h-4 w-4 text-inal-textMuted" />
      </button>
    </article>
  );
};
