import React from 'react';
import type { DataProvenance } from '../../types/domain';
import { InfoTip, cleanSourceLabel, formatProvenanceDetail, safeText } from './InfoTip';

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

function shortTag(provenance: DataProvenance): string {
  const ref = safeText(provenance.referenceTime);
  const source = cleanSourceLabel(provenance.sourceName);
  // 시각·기간 꼬리표가 짧으면 그걸 우선(예: 2016~2025, 발표 시각)
  if (ref && ref.length <= 36 && ref !== '[object Object]') return ref;
  if (source) {
    // "기상청 ASOS 공식 일자료 (1990~2025)" → "ASOS 일자료 · 1990~2025" 정도만
    const m = source.match(/\(([^)]{4,24})\)/);
    if (m) return m[1];
    if (source.length <= 28) return source;
    return cutSource(source);
  }
  return '';
}

function cutSource(s: string): string {
  if (s.includes('ASOS')) return 'ASOS 관측';
  if (s.includes('초단기') && s.includes('단기')) return '초단기·단기예보';
  if (s.includes('초단기실황')) return '초단기실황';
  if (s.includes('중기')) return '중기예보';
  if (s.includes('단기')) return '단기예보';
  return `${s.slice(0, 24)}…`;
}

export const DataSourceLabel: React.FC<DataSourceLabelProps> = ({ provenance, compact = false }) => {
  const meta = KIND_BADGE_MAP[provenance.kind] || KIND_BADGE_MAP.obs;
  const tag = shortTag(provenance);
  const detail = formatProvenanceDetail({
    sourceName: provenance.sourceName,
    referenceTime: provenance.referenceTime,
    note: compact ? undefined : provenance.note,
    extra: provenance.isDevFallback ? '개발용 대체 자료' : undefined,
  });
  // compact여도 note가 길면 ⓘ 안에 넣음(화면에는 안 펼침)
  const detailWithNote =
    compact && provenance.note
      ? formatProvenanceDetail({
          sourceName: provenance.sourceName,
          referenceTime: provenance.referenceTime,
          note: provenance.note,
          extra: provenance.isDevFallback ? '개발용 대체 자료' : undefined,
        })
      : detail;

  return (
    <div className="flex flex-wrap items-center gap-1 text-[11px] text-inal-textMuted">
      <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-none ${meta.badgeClass}`}>
        {meta.label}
      </span>
      <InfoTip tag={tag} detail={detailWithNote || undefined} label="자료 출처" />
    </div>
  );
};
