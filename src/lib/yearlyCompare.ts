import type { ApiStatsYearlyResponse, ApiStatsYearlyRow } from '../types/api';
import type { BasisId } from '../types/api';

/** 연도별 같은 기간 비교 카드: 제목·기간은 API 응답에서만 만든다(고정 1990/2025 금지). */
export interface YearlyCompareView {
  periodLabel: string;
  metricLabel: string;
  fromYear: number | null;
  toYear: number | null;
  rows: ApiStatsYearlyRow[];
  shown: ApiStatsYearlyRow[];
  title: string;
  summary: string;
  hiddenCount: number;
}

const BASIS_YEARS: Record<BasisId, number | null> = { all: null, r10: 10, r5: 5 };
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const fmt = (v: number) => `${v.toFixed(1)}℃`;

export function buildYearlyCompareView(
  raw: ApiStatsYearlyResponse,
  basis: BasisId,
  stationName: string,
  expanded = false,
  collapsedCount = 5,
): YearlyCompareView {
  const anyRaw = raw as ApiStatsYearlyResponse & {
    period?: { label?: string };
    metric?: { label?: string };
    fromYear?: number;
    toYear?: number;
  };
  const all = (raw.rows || []).filter((r) => Number.isInteger(r.year)).sort((a, b) => a.year - b.year);
  const limit = BASIS_YEARS[basis];
  const rows = limit ? all.slice(-limit) : all;
  const withValue = rows.filter((r) => finite(r.value));
  const fromYear = rows.length ? rows[0].year : null;
  const toYear = rows.length ? rows[rows.length - 1].year : null;
  const periodLabel = (anyRaw.period?.label || '같은 기간').replace(/\s*전체$/, '');
  const metricLabel = anyRaw.metric?.label || raw.meta?.metric?.label || '평균기온';
  const newestFirst = [...rows].reverse();
  const shown = expanded ? newestFirst : newestFirst.slice(0, collapsedCount);
  const range = fromYear !== null && toYear !== null ? `${fromYear}~${toYear}년` : '자료 없음';
  let summary = '비교할 연도 자료가 없어요.';
  if (withValue.length) {
    const vals = withValue.map((r) => r.value as number);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const hi = withValue.reduce((a, b) => ((b.value as number) > (a.value as number) ? b : a));
    const lo = withValue.reduce((a, b) => ((b.value as number) < (a.value as number) ? b : a));
    summary = `${range} ${withValue.length}개 해 평균 ${fmt(mean)} · 가장 높은 해 ${hi.year}년 ${fmt(hi.value as number)} · 가장 낮은 해 ${lo.year}년 ${fmt(lo.value as number)}`;
  }
  return {
    periodLabel,
    metricLabel,
    fromYear,
    toYear,
    rows,
    shown,
    title: `${stationName} ${periodLabel} ${metricLabel} · ${range}`,
    summary,
    hiddenCount: rows.length - shown.length,
  };
}
