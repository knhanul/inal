import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { BottomSheetDetailPayload, MetricDisplayItem } from '../../types/viewmodel';
import type { DataProvenance } from '../../types/domain';
import { DataSourceLabel } from '../common/DataSourceLabel';
import { WeatherMetric } from '../common/WeatherMetric';

interface ComparisonRowItem {
  id: string;
  title: string;
  subtitle?: string;
  primaryText: string;
  secondaryText?: string;
  badgeText?: string;
  onSelect?: () => void;
}

interface ComparisonCardProps {
  badgeText: string;
  title: string;
  summary: string;
  provenance: DataProvenance;
  metrics?: MetricDisplayItem[];
  rows?: ComparisonRowItem[];
  children?: React.ReactNode;
  detail?: BottomSheetDetailPayload;
  onOpenDetail?: (detail: BottomSheetDetailPayload) => void;
}

export const ComparisonCard: React.FC<ComparisonCardProps> = ({
  badgeText,
  title,
  summary,
  provenance,
  metrics,
  rows,
  children,
  detail,
  onOpenDetail,
}) => {
  return (
    <article className="flex flex-col justify-between rounded-card border border-inal-border bg-inal-surface p-5 shadow-card">
      <div>
        <div className="flex items-center justify-between gap-2">
          <DataSourceLabel provenance={provenance} compact />
          <span className="shrink-0 rounded-full bg-inal-accentSoft px-2.5 py-0.5 text-[11px] font-bold text-inal-accent">
            {badgeText}
          </span>
        </div>
        <h3 className="mt-2.5 text-base font-bold leading-snug text-inal-text">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-inal-textMuted">{summary}</p>
      </div>

      {metrics && metrics.length > 0 && (
        <div className="mt-3.5 grid grid-cols-3 gap-2">
          {metrics.map((m) => (
            <WeatherMetric key={m.label} metric={m} compact />
          ))}
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="mt-3.5 space-y-2">
          {rows.map((row) => {
            const isInteractive = typeof row.onSelect === 'function';
            const Wrapper = isInteractive ? 'button' : 'div';
            return (
              <Wrapper
                key={row.id}
                type={isInteractive ? 'button' : undefined}
                onClick={row.onSelect}
                className={`flex w-full items-center justify-between rounded-xl border border-inal-border/70 bg-inal-surfaceSubtle/60 px-3.5 py-2.5 text-left ${
                  isInteractive ? 'transition hover:bg-inal-surfaceSubtle active:scale-[0.99]' : ''
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-inal-text">{row.title}</span>
                    {row.badgeText && (
                      <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-inal-accent">
                        {row.badgeText}
                      </span>
                    )}
                  </div>
                  {row.subtitle && (
                    <p className="mt-0.5 truncate text-[11px] text-inal-textMuted">{row.subtitle}</p>
                  )}
                </div>
                <div className="shrink-0 text-right tabular-nums">
                  <span className="block text-xs font-bold text-inal-text">{row.primaryText}</span>
                  {row.secondaryText && (
                    <span className="block text-[10px] font-semibold text-inal-accent">{row.secondaryText}</span>
                  )}
                </div>
              </Wrapper>
            );
          })}
        </div>
      )}

      {children && <div className="mt-3.5">{children}</div>}

      {detail && onOpenDetail && (
        <button
          type="button"
          onClick={() => onOpenDetail(detail)}
          className="touch-target mt-3.5 flex w-full items-center justify-between rounded-xl border border-inal-border bg-inal-surfaceSubtle/50 px-3.5 py-2.5 text-xs font-semibold text-inal-text transition hover:bg-inal-surfaceSubtle"
        >
          <span>그래프 · 비교 기준 상세보기</span>
          <ChevronRight className="h-4 w-4 text-inal-textMuted" />
        </button>
      )}
    </article>
  );
};
