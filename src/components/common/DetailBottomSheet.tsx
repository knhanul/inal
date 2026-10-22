import React, { useEffect } from 'react';
import { X, Info } from 'lucide-react';
import type { BottomSheetDetailPayload } from '../../types/viewmodel';
import { DataSourceLabel } from './DataSourceLabel';
import { formatTemp, isValidNumber } from '../../api/mappers';

interface DetailBottomSheetProps {
  detail: BottomSheetDetailPayload | null;
  onClose: () => void;
}

export const DetailBottomSheet: React.FC<DetailBottomSheetProps> = ({ detail, onClose }) => {
  useEffect(() => {
    if (!detail) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [detail, onClose]);

  if (!detail) return null;
  const dist = detail.distribution;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-[1px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-sheet-title"
    >
      <div
        className="flex max-h-[86dvh] w-full max-w-[430px] flex-col rounded-t-3xl bg-inal-surface shadow-sheet"
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 1rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-inal-border px-5 pt-3.5 pb-3">
          <span className="rounded-md bg-inal-accentSoft px-2 py-0.5 text-[11px] font-bold text-inal-accent">
            {detail.categoryBadge}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="상세 화면 닫기"
            className="touch-target -mr-2 inline-flex items-center justify-center rounded-full text-inal-textMuted hover:bg-inal-surfaceSubtle"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <h2 id="detail-sheet-title" className="text-lg font-bold leading-snug text-inal-text">
              {detail.title}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-inal-textMuted">{detail.subtitle}</p>
            <div className="mt-2.5">
              <DataSourceLabel provenance={detail.provenance} />
            </div>
          </div>

          {dist && isValidNumber(dist.p10) && isValidNumber(dist.p90) && (
            <div className="rounded-2xl border border-inal-border bg-inal-surfaceSubtle/60 p-4">
              <div className="flex items-center justify-between text-xs font-semibold text-inal-text">
                <span>같은 시기·시각 분포 ({dist.periodLabel})</span>
                {isValidNumber(dist.percentile) && (
                  <span className="text-inal-accent tabular-nums">백분위 {dist.percentile}%</span>
                )}
              </div>
              <div className="mt-3 relative h-3 w-full rounded-full bg-inal-border overflow-hidden">
                <div className="absolute top-0 bottom-0 rounded-full bg-amber-300/70" style={{ left: '15%', width: '70%' }} />
                <div
                  className="absolute top-0 bottom-0 w-2.5 -ml-1 rounded-full bg-inal-accent ring-2 ring-white"
                  style={{ left: `${Math.min(96, Math.max(4, dist.percentile ?? 50))}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] tabular-nums text-inal-textMuted">
                <span>보통 하한(10%) {formatTemp(dist.p10)}</span>
                <span className="font-semibold text-inal-text">평균 {formatTemp(dist.mean)}</span>
                <span>보통 상한(90%) {formatTemp(dist.p90)}</span>
              </div>
            </div>
          )}

          {detail.chartSeries && detail.chartSeries.points.length > 0 && (
            <div className="rounded-2xl border border-inal-border bg-inal-surfaceSubtle/50 p-4">
              <div className="mb-2.5 flex items-center justify-between text-xs font-semibold text-inal-text">
                <span>상세 추이 그래프 ({detail.chartSeries.unit})</span>
              </div>
              <div className="no-scrollbar flex items-end gap-2 overflow-x-auto pt-4 pb-1">
                {(() => {
                  const vals = detail.chartSeries!.points.map((p) => p.primaryValue).filter(isValidNumber);
                  const minV = vals.length ? Math.min(...vals) : 0;
                  const maxV = vals.length ? Math.max(...vals) : 30;
                  const span = Math.max(4, maxV - minV);
                  return detail.chartSeries!.points.map((pt, i) => {
                    const heightPct = isValidNumber(pt.primaryValue) ? Math.round(((pt.primaryValue - minV) / span) * 64 + 20) : 12;
                    const barColor = pt.kind === 'fcst' ? 'bg-sky-500/85 border border-dashed border-sky-700' : 'bg-inal-accent';
                    return (
                      <div key={pt.label + i} className="flex min-w-[34px] flex-col items-center gap-1">
                        <span className="text-[10px] font-semibold tabular-nums text-inal-text">
                          {isValidNumber(pt.primaryValue) ? pt.primaryValue : '-'}
                        </span>
                        <div className="flex h-20 w-full items-end justify-center">
                          <div className={`w-3.5 rounded-t-md ${barColor}`} style={{ height: `${heightPct}%` }} />
                        </div>
                        <span className="text-[10px] tabular-nums text-inal-textMuted">{pt.label}</span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {detail.tableRows && detail.tableRows.length > 0 && (
            <div className="overflow-hidden rounded-2xl border border-inal-border">
              <table className="w-full text-left text-xs">
                <thead className="bg-inal-surfaceSubtle text-[11px] font-semibold text-inal-textMuted">
                  <tr>
                    <th className="px-3 py-2">구분</th>
                    <th className="px-3 py-2 text-right">기준값</th>
                    <th className="px-3 py-2 text-right">차이/결과</th>
                    {detail.tableRows.some((r) => r.col3) && <th className="px-3 py-2 text-right">비고</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-inal-border bg-inal-surface tabular-nums">
                  {detail.tableRows.map((row, idx) => (
                    <tr key={row.label + idx} className={row.highlight ? 'bg-inal-accentSoft/60 font-semibold' : ''}>
                      <td className="px-3 py-2.5 text-inal-text">{row.label}</td>
                      <td className="px-3 py-2.5 text-right text-inal-textMuted">{row.col1}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-inal-accent">{row.col2}</td>
                      {detail.tableRows!.some((r) => r.col3) && (
                        <td className="px-3 py-2.5 text-right text-inal-textSoft">{row.col3 || '-'}</td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {detail.explanationBody.length > 0 && (
            <div className="rounded-2xl bg-inal-surfaceSubtle/80 p-4 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-inal-text">
                <Info className="h-3.5 w-3.5 text-inal-accent" />
                <span>{detail.explanationTitle || '계산 기준 및 데이터 안내'}</span>
              </div>
              <ul className="space-y-1 text-xs leading-relaxed text-inal-textMuted list-disc pl-4">
                {detail.explanationBody.map((line, idx) => (
                  <li key={idx}>{line}</li>
                ))}
              </ul>
              {detail.cautionNote && (
                <p className="pt-1 text-[11px] leading-relaxed text-inal-textSoft">※ {detail.cautionNote}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
