import React from 'react';
import type { DataProvenance } from '../../types/domain';

interface DataSourceLabelProps {
  provenance: DataProvenance;
  compact?: boolean;
}

const KIND_BADGE_MAP: Record<DataProvenance['kind'], { label: string; badgeClass: string }> = {
  obs: { label: '관측 실황', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  fcst: { label: '기상예보', badgeClass: 'bg-sky-50 text-sky-800 border-sky-200' },
  stats: { label: '과거 통계', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200' },
  mix: { label: '관측+예보', badgeClass: 'bg-purple-50 text-purple-800 border-purple-200' },
};

export const DataSourceLabel: React.FC<DataSourceLabelProps> = ({ provenance, compact = false }) => {
  const meta = KIND_BADGE_MAP[provenance.kind] || KIND_BADGE_MAP.obs;
  const rawRef = provenance.referenceTime as unknown;
  const safeRefTime =
    typeof rawRef === 'string'
      ? rawRef
      : rawRef && typeof rawRef === 'object' && 'base' in rawRef && typeof (rawRef as { base?: unknown }).base === 'string'
      ? (rawRef as { base: string }).base
      : '';
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-inal-textMuted">
      <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-none ${meta.badgeClass}`}>
        {meta.label}
      </span>
      <span className="font-medium text-inal-textMuted">{String(provenance.sourceName || '')}</span>
      {safeRefTime && (
        <>
          <span aria-hidden="true" className="text-inal-textSoft">·</span>
          <span className="tabular-nums text-inal-textSoft">{safeRefTime}</span>
        </>
      )}
      {!compact && provenance.note && (
        <p className="w-full text-[10px] leading-relaxed text-inal-textSoft">{String(provenance.note)}</p>
      )}
    </div>
  );
};
