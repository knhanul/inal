import React from 'react';
import type { DataProvenance } from '../../types/domain';

interface DataSourceLabelProps {
  provenance: DataProvenance;
  compact?: boolean;
}

/** inal shows weather meaning/time, not technical provenance or source tooltips. */
export const DataSourceLabel: React.FC<DataSourceLabelProps> = ({ provenance }) => {
  const kind = { obs: '실황', fcst: '예보', stats: '', mix: '실황·예보' }[provenance.kind];
  const time = provenance.kind !== 'stats' && typeof provenance.referenceTime === 'string'
    ? provenance.referenceTime.match(/\d{4}-\d{2}-\d{2}(?:[ T]\d{1,2}:\d{2})?|\d{1,2}:\d{2}/)?.[0]
    : '';
  const text = [kind, time, provenance.isDevFallback ? '개발용 자료' : ''].filter(Boolean).join(' · ');
  return text ? <span className="text-[11px] text-inal-textMuted">{text}</span> : null;
};
