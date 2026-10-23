import React from 'react';
import { Award, Calendar, ChevronRight } from 'lucide-react';
import type { BottomSheetDetailPayload } from '../../types/viewmodel';
import type { DataProvenance } from '../../types/domain';
import { DataSourceLabel } from '../common/DataSourceLabel';
import { InfoTip, InfoTipAuto } from '../common/InfoTip';

export interface RecordItemDisplay {
  id: string;
  title: string;
  valueText: string;
  dateText: string;
  subNote?: string;
}

interface RecordCardProps {
  title: string;
  subtitle: string;
  provenance: DataProvenance;
  records: RecordItemDisplay[];
  rainCalendarSummary?: {
    rainyDays: number;
    dryDays: number;
    missingDays: number;
    totalMmText: string;
    lastRainText: string;
  };
  detail?: BottomSheetDetailPayload;
  onOpenDetail?: (detail: BottomSheetDetailPayload) => void;
}

export const RecordCard: React.FC<RecordCardProps> = ({
  title,
  subtitle,
  provenance,
  records,
  rainCalendarSummary,
  detail,
  onOpenDetail,
}) => {
  return (
    <article className="flex flex-col justify-between rounded-card border border-inal-border bg-inal-surface p-5 shadow-card">
      <div>
        <DataSourceLabel provenance={provenance} compact />
        <h3 className="mt-2 text-base font-bold leading-snug text-inal-text">{title}</h3>
        <InfoTipAuto text={subtitle} max={44} label="기록 기준" className="mt-0.5" />
      </div>

      <div className="my-3.5 space-y-2">
        {records.map((rec) => (
          <div
            key={rec.id}
            className="flex items-center justify-between rounded-xl border border-inal-border/75 bg-inal-surfaceSubtle/60 px-3.5 py-2.5"
          >
            <div className="flex items-start gap-2 pr-2">
              <Award className="mt-0.5 h-4 w-4 shrink-0 text-inal-accent" />
              <div>
                <span className="block text-xs font-bold text-inal-text">{rec.title}</span>
                {rec.subNote && <span className="block text-[10px] text-inal-textMuted">{rec.subNote}</span>}
              </div>
            </div>
            <div className="shrink-0 text-right tabular-nums">
              <span className="block text-sm font-extrabold text-inal-accent">{rec.valueText}</span>
              <span className="block text-[10px] text-inal-textSoft">{rec.dateText}</span>
            </div>
          </div>
        ))}
      </div>

      {rainCalendarSummary && (
        <div className="rounded-2xl border border-sky-200/80 bg-sky-50/50 p-3.5">
          <div className="flex items-center gap-0.5 text-xs font-bold text-inal-text">
            <Calendar className="h-3.5 w-3.5 text-sky-700" />
            <span>최근 30일 비 달력</span>
            <InfoTip label="자료 출처" detail="기상청 ASOS 공식 일자료 기준입니다. 비 온 날은 일강수량 0.1mm 이상입니다." />
          </div>
          <p className="mt-1 text-xs text-inal-textMuted">
            비 온 날 <strong className="text-sky-800">{rainCalendarSummary.rainyDays}일</strong> · 합계{' '}
            <strong className="text-sky-800">{rainCalendarSummary.totalMmText}</strong> · {rainCalendarSummary.lastRainText}
            {rainCalendarSummary.missingDays > 0 ? (
              <> · <strong className="text-amber-800">{rainCalendarSummary.missingDays}일 결측</strong></>
            ) : null}
          </p>
        </div>
      )}

      {detail && onOpenDetail && (
        <button
          type="button"
          onClick={() => onOpenDetail(detail)}
          className="touch-target mt-3.5 flex w-full items-center justify-between rounded-xl border border-inal-border bg-inal-surfaceSubtle/50 px-3.5 py-2.5 text-xs font-semibold text-inal-text transition hover:bg-inal-surfaceSubtle"
        >
          <span>자세히 보기</span>
          <ChevronRight className="h-4 w-4 text-inal-textMuted" />
        </button>
      )}
    </article>
  );
};
