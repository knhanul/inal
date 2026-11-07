import React, { useMemo, useState } from 'react';
import { ArrowLeft, CalendarClock, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Download } from 'lucide-react';
import type { ApiDateSeriesPoint, ApiDateSeriesResponse } from '../../types/api';
import { WEATHER_ENDPOINTS, getStationById } from '../../api/endpoints';
import { useStatsDateSeriesQuery } from '../../hooks/useWeatherQueries';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { ErrorState } from '../common/ErrorState';
import { DataSourceLabel } from '../common/DataSourceLabel';
import { InfoTipAuto } from '../common/InfoTip';
import {
  buildSeriesChart,
  buildSeriesRows,
  buildSeriesSummaryLines,
  defaultSeriesFrom,
  formatSeriesDateKo,
  formatSeriesDateShort,
  pointHasData,
  pointStatusText,
  rainText,
  seriesBasisText,
  seriesBasisWord,
  seriesNameText,
  seriesShortYearText,
  seriesYearText,
  tempText,
} from '../../lib/dateSeries';
import type { SeriesTarget } from '../../lib/dateSeries';

interface DateSeriesCardProps {
  stationId: string;
  target: SeriesTarget;
  onBack: () => void;
}

// 360px 폰에서 카드 안쪽 폭이 268px 정도다. viewBox 를 그 폭에 맞춰 두면 글자가 줄지 않고,
// 넓은 화면에서는 그대로 늘어난다(가로 스크롤 없음).
const CHART_W = 268;
const CHART_H = 200;
const COLLAPSED_ROWS = 5;

/** 그래프 점 하나의 값 읽기 상자 — 누른 점의 학년도·실제 날짜·기온을 보여 준다. */
const PointReadout: React.FC<{
  point: ApiDateSeriesPoint;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  statusText?: Record<string, string> | null;
}> = ({ point, index, total, onPrev, onNext, statusText }) => {
  const hasData = pointHasData(point);
  return (
    <div className="mt-1.5 flex items-center gap-1.5 rounded-xl border border-inal-border bg-inal-surfaceSubtle/70 px-2.5 py-2">
      <button
        type="button"
        onClick={onPrev}
        disabled={index <= 0}
        aria-label="이전 해"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-inal-border bg-white text-inal-textMuted disabled:opacity-35"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <div className="min-w-0 flex-1 text-center">
        <p className="truncate text-[11px] font-extrabold tabular-nums text-inal-text">
          {seriesYearText(point)} · {formatSeriesDateKo(point.solarDate)}
        </p>
        {hasData ? (
          <p className="mt-0.5 text-[10.5px] font-semibold tabular-nums text-inal-textMuted">
            <span className="text-red-600">최고 {tempText(point.values.max)}</span>
            <span className="px-1 text-inal-textSoft">/</span>
            <span className="text-blue-700">최저 {tempText(point.values.min)}</span>
          </p>
        ) : (
          <p className="mt-0.5 text-[10.5px] font-semibold text-inal-textSoft">{pointStatusText(point, statusText)}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onNext}
        disabled={index >= total - 1}
        aria-label="다음 해"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-inal-border bg-white text-inal-textMuted disabled:opacity-35"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

/** 최고(빨강)·최저(파랑) 두 줄 + x축 학년도/실제 월·일. 폭 100% 로 늘려 그리므로 가로 스크롤이 없다. */
const SeriesChart: React.FC<{ points: ApiDateSeriesPoint[]; selected: number; onSelect: (i: number) => void }> = ({
  points,
  selected,
  onSelect,
}) => {
  const geo = useMemo(() => buildSeriesChart(points, { width: CHART_W, height: CHART_H }), [points]);
  const sel = points[selected];
  const selDot = geo.dots.find((d) => d.index === selected);
  const selGeom = selected >= 0 && geo.xPositions[selected] !== undefined ? { x: geo.xPositions[selected] } : null;
  const bandWidth = points.length > 1 ? Math.abs(geo.xPositions[1] - geo.xPositions[0]) : 24;

  return (
    <svg
      viewBox={`0 0 ${geo.width} ${geo.height}`}
      width="100%"
      role="img"
      aria-label={`${points.length}개 해의 실제 날짜 기준 최고·최저기온 선 그래프. 점을 누르면 그 해 값이 아래에 나옵니다.`}
      className="block w-full"
      data-testid="series-chart"
    >
      {/* 자료가 없는 해 — 선을 끊은 자리를 옅은 띠로 표시 */}
      {geo.missingXs.map((x) => (
        <rect
          key={`miss-${x}`}
          x={Math.max(geo.padLeft - 2, x - bandWidth / 2)}
          y={geo.plotTop}
          width={Math.min(bandWidth, geo.width - geo.padRight - Math.max(geo.padLeft - 2, x - bandWidth / 2))}
          height={geo.plotBottom - geo.plotTop}
          fill="var(--inal-border)"
          opacity={0.28}
        />
      ))}

      {/* y축 눈금·선 */}
      {geo.yTicks.map((t) => (
        <g key={`yt-${t.value}`}>
          <line x1={geo.padLeft} y1={t.y} x2={geo.width - geo.padRight} y2={t.y} stroke="var(--inal-border)" strokeWidth={1} strokeDasharray="2 3" />
          <text x={geo.padLeft - 5} y={t.y + 3} fontSize={8.5} fontWeight={600} fill="var(--inal-text-soft)" textAnchor="end">
            {Math.round(t.value)}
          </text>
        </g>
      ))}

      {/* 선택한 해 세로선 */}
      {selGeom && (
        <line
          x1={selGeom.x}
          y1={geo.plotTop}
          x2={selGeom.x}
          y2={geo.plotBottom}
          stroke="var(--inal-accent)"
          strokeWidth={1.2}
          opacity={0.55}
        />
      )}

      {/* 선 — 값이 없는 해에서 끊긴다 */}
      {geo.maxLines.map((pts, i) => (
        <polyline key={`max-${i}`} points={pts} fill="none" stroke="#dc2626" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {geo.minLines.map((pts, i) => (
        <polyline key={`min-${i}`} points={pts} fill="none" stroke="#2563eb" strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
      ))}

      {/* 점 */}
      {geo.dots.map((d) => {
        const isSel = d.index === selected;
        return (
          <g key={`dot-${d.index}`}>
            <circle cx={d.x} cy={d.yMax} r={isSel ? 3.4 : 2} fill={isSel ? '#dc2626' : 'var(--inal-surface)'} stroke="#dc2626" strokeWidth={1.4} />
            <circle cx={d.x} cy={d.yMin} r={isSel ? 3.4 : 2} fill={isSel ? '#2563eb' : 'var(--inal-surface)'} stroke="#2563eb" strokeWidth={1.4} />
          </g>
        );
      })}

      {/* 누를 수 있는 넓은 칸(점 사이 여백 포함) */}
      {points.map((p, i) => {
        const half = bandWidth / 2;
        const x0 = Math.max(0, geo.xPositions[i] - half);
        const x1 = Math.min(geo.width, geo.xPositions[i] + half);
        return (
          <rect
            key={`hit-${p.solarDate}-${i}`}
            x={x0}
            y={geo.plotTop}
            width={Math.max(6, x1 - x0)}
            height={geo.plotBottom - geo.plotTop}
            fill="transparent"
            className="cursor-pointer"
            onClick={() => onSelect(i)}
          />
        );
      })}

      {/* x축: 위 = 학년도(또는 연도), 아래 = 실제 양력 월·일 */}
      {geo.xTicks.map((t) => (
        <g key={`xt-${t.index}`}>
          <text
            x={t.x}
            y={geo.plotBottom + 13}
            fontSize={9}
            fontWeight={800}
            fill="var(--inal-text)"
            textAnchor={t.anchor}
          >
            {t.yearText}
          </text>
          <text
            x={t.x}
            y={geo.plotBottom + 25}
            fontSize={8.5}
            fontWeight={600}
            fill="var(--inal-accent)"
            textAnchor={t.anchor}
          >
            {t.mdText}
          </text>
        </g>
      ))}

      {/* 선택한 점의 최고기온 값 — 점 위에 붙인다 */}
      {sel && selGeom && selDot && (
        <text
          x={Math.min(geo.width - geo.padRight, Math.max(geo.padLeft, selGeom.x))}
          y={Math.max(geo.plotTop + 7, selDot.yMax - 5)}
          fontSize={8.5}
          fontWeight={800}
          fill="#dc2626"
          textAnchor={selGeom.x > geo.width - 40 ? 'end' : selGeom.x < geo.padLeft + 18 ? 'start' : 'middle'}
        >
          {tempText(sel.values.max)}
        </text>
      )}
    </svg>
  );
};

/**
 * 특정일 '해마다 실제 날짜' 카드 — 기존 '날짜로 보는 날씨'(월·일 고정) 자리를 대신한다.
 * 수능일처럼 해마다 양력 날짜가 바뀌는 날은 그해 실제 시행일의 날씨를 해마다 한 점으로 잇는다.
 * 값은 전부 /api/stats/date-series 응답에서만 만든다(날짜를 화면에서 다시 계산하지 않는다).
 */
export const DateSeriesCard: React.FC<DateSeriesCardProps> = ({ stationId, target, onBack }) => {
  const station = getStationById(stationId);
  const thisYear = new Date().getFullYear();
  const from = defaultSeriesFrom(target.kind);
  const label = target.label || '';
  const query = useStatsDateSeriesQuery(stationId, target.kind, label, from, true, thisYear);
  const [selected, setSelected] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  if (query.isLoading) return <LoadingSkeleton label="특정일의 해마다 실제 날짜·날씨를 불러오는 중입니다…" />;
  if (query.isError || !query.data) {
    return (
      <div className="space-y-2">
        <ErrorState title="특정일 날씨를 불러오지 못했어요" onRetry={() => query.refetch()} />
        <button
          type="button"
          onClick={onBack}
          className="touch-target flex w-full items-center justify-center gap-1.5 rounded-xl border border-inal-border bg-inal-surface px-3 py-2.5 text-xs font-semibold text-inal-text"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-inal-accent" />
          날짜로 돌아가기
        </button>
      </div>
    );
  }

  const raw: ApiDateSeriesResponse = query.data.data;
  const points = raw.points || [];
  const series = raw.series;
  const windowInfo = raw.window;
  const name = seriesNameText(series);
  const basisWord = seriesBasisWord(target.kind);
  const summaryLines = buildSeriesSummaryLines(raw.summary, series);
  const rows = buildSeriesRows(points, raw.statusText);
  const visibleRows = expanded ? rows : rows.slice(0, COLLAPSED_ROWS);
  const hasDataCount = points.filter((p) => pointHasData(p)).length;

  // 처음에는 가장 최근에 자료가 있는 해를 골라 둔다(그래프 읽기 상자의 시작점).
  const defaultIndex = (() => {
    for (let i = points.length - 1; i >= 0; i -= 1) if (pointHasData(points[i])) return i;
    return points.length - 1;
  })();
  const selectedIndex = selected !== null && selected >= 0 && selected < points.length ? selected : defaultIndex;
  const selectedPoint = points[selectedIndex];
  const yearRangeText = `${windowInfo?.fromYear ?? from}~${windowInfo?.toYear ?? thisYear}년`;

  return (
    <article className="flex flex-col rounded-card border border-inal-border bg-inal-surface p-5 shadow-card" data-testid="date-series-card">
      <div className="flex items-center justify-between gap-2">
        <DataSourceLabel
          provenance={{
            kind: 'stats',
            sourceName: raw.source || '기상청 ASOS 공식 일자료',
            referenceTime: seriesBasisText(target.kind, windowInfo?.fromYear ?? from, windowInfo?.toYear ?? thisYear),
            note: '해마다 그 특정일의 실제 양력 날짜 하루만 씁니다(다른 날로 채우지 않음).',
            isDevFallback: Boolean((query.data as { isDevFallback?: boolean }).isDevFallback),
          }}
          compact
        />
        <span className="shrink-0 rounded-full bg-inal-accentSoft px-2.5 py-0.5 text-[11px] font-bold text-inal-accent">
          특정일 · 해마다
        </span>
      </div>

      <h3 className="mt-2.5 break-keep text-base font-bold leading-snug text-inal-text">
        {name} 날씨 · {yearRangeText} · {basisWord} 기준
      </h3>
      <p className="mt-1 break-keep text-[11px] font-medium leading-snug text-inal-textMuted">
        {station.name}
      </p>

      <button
        type="button"
        onClick={onBack}
        className="touch-target mt-2.5 inline-flex w-fit items-center gap-1.5 rounded-xl border border-inal-border bg-inal-surfaceSubtle/70 px-3 py-2 text-[11px] font-bold text-inal-text"
        data-testid="series-back"
      >
        <ArrowLeft className="h-3.5 w-3.5 text-inal-accent" />
        날짜로 돌아가기
      </button>

      {summaryLines.length > 0 ? (
        <ul className="mt-3 space-y-1 rounded-2xl border border-inal-accent/25 bg-inal-accentSoft/50 p-3" data-testid="series-summary">
          {summaryLines.map((line) => (
            <li key={line} className="break-keep text-[11px] font-semibold leading-relaxed text-inal-text">
              {line}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 break-keep rounded-2xl border border-inal-border bg-inal-surfaceSubtle/60 p-3 text-[11px] font-medium text-inal-textMuted">
          이 기간에는 이 특정일의 날씨 값을 요약할 만큼 자료가 모이지 않았습니다.
        </p>
      )}

      {points.length > 0 && (
        <div className="mt-3 min-w-0 rounded-2xl border border-inal-border bg-inal-surfaceSubtle/50 p-3" data-no-carousel-swipe="true">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-inal-text">
              <CalendarClock className="h-3.5 w-3.5 text-inal-accent" />
              <span>기온 그래프 · {basisWord} 순서</span>
            </span>
            <span className="flex items-center gap-2 text-[10px] font-semibold text-inal-textMuted">
              <span className="inline-flex items-center gap-1">
                <i className="h-1.5 w-3 rounded-full bg-red-600" aria-hidden="true" />
                최고
              </span>
              <span className="inline-flex items-center gap-1">
                <i className="h-1.5 w-3 rounded-full bg-blue-700" aria-hidden="true" />
                최저
              </span>
            </span>
          </div>
          <div className="mt-1.5">
            <SeriesChart points={points} selected={selectedIndex} onSelect={setSelected} />
          </div>
          <p className="mt-1 break-keep text-[10px] leading-snug text-inal-textSoft">
            점을 누르면 그해 날짜와 기온을 볼 수 있어요.
          </p>
          {selectedPoint && (
            <PointReadout
              point={selectedPoint}
              index={selectedIndex}
              total={points.length}
              onPrev={() => setSelected(Math.max(0, selectedIndex - 1))}
              onNext={() => setSelected(Math.min(points.length - 1, selectedIndex + 1))}
              statusText={raw.statusText}
            />
          )}
        </div>
      )}

      {hasDataCount < points.length && (
        <p className="mt-2 text-[11px] text-inal-textMuted">일부 날짜 자료가 없어 있는 날만 보여 드려요.</p>
      )}
      {selectedPoint && !pointHasData(selectedPoint) && selectedPoint.dateStatus === 'future' && (
        <p className="mt-2 break-keep text-[10px] leading-snug text-inal-textSoft">
          {seriesYearText(selectedPoint)}({formatSeriesDateShort(selectedPoint.solarDate)})는 아직 관측 전이라 그래프·평균에서 뺐습니다.
        </p>
      )}
    </article>
  );
};

export default DateSeriesCard;
