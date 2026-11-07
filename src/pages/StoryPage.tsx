import { WeatherContextPanel } from '../components/cards/WeatherContextPanel';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Swords, CalendarHeart, CalendarDays, ChevronRight, HelpCircle, Plus, X } from 'lucide-react';
import type { BottomSheetDetailPayload, StoryCardViewModel } from '../types/viewmodel';
import type { ApiCalendarEvent } from '../types/api';
import { getStationById } from '../api/endpoints';
import {
  useStatsHighlightsQuery,
  useStatsDateWeatherQuery,
  useStatsDateBattleQuery,
  useRtRecordsQuery,
  useCalendarEventsQuery,
} from '../hooks/useWeatherQueries';
import { eventsOfYear, sameMonthDayEvents, shortEventLabel } from '../lib/calendarEvents';
import { resolveSeriesTargetFromSearch, seriesTargetForEvent, seriesTargetKey } from '../lib/dateSeries';
import type { SeriesTarget } from '../lib/dateSeries';
import { formatTemp, formatRainfall, formatWindSpeed, formatPercent, isValidNumber } from '../api/mappers';
import { CardCarousel } from '../components/common/CardCarousel';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { StoryCard } from '../components/cards/StoryCard';
import { ComparisonCard } from '../components/cards/ComparisonCard';
import { DateSeriesCard } from '../components/cards/DateSeriesCard';

interface StoryPageProps {
  stationId: string;
  onOpenDetail: (detail: BottomSheetDetailPayload) => void;
}

const STORY_TAB_LABELS = [
  '질문으로 보는 날씨',
  '날짜로 보는 날씨',
  '날씨 배틀',
  '절기·복날',
  '과거 같은 날·기록',
];

/** 시험(수능·학력고사)은 강조, 명절은 차분하게 그리려고 나눠 둔다. */
const EXAM_KINDS = new Set(['csat', 'hakryeok']);

/** 'YYYY-MM-DD' → { month, day } */
function monthDayOf(solarDate: string): { month: number; day: number } {
  return { month: Number(solarDate.slice(5, 7)), day: Number(solarDate.slice(8, 10)) };
}

/**
 * 고른 '월·일'에 걸린 역대 특정일 한 줄. 예: "11월 13일은 역대 수능일이었습니다 (4회)"
 * + 연도 라벨 줄 "2026학년도 · 2015학년도 · 2009학년도 외 1회". 값은 모두 API 응답에서만 만든다.
 */
function describeMonthDayHits(
  hits: Array<{ year: number; event: ApiCalendarEvent }>,
  month: number,
  day: number,
): { headline: string; detail: string } {
  const examNames: string[] = [];
  const otherNames: string[] = [];
  for (const h of hits) {
    const isExam = EXAM_KINDS.has(h.event.kind);
    const name = isExam ? shortEventLabel(h.event) : h.event.label || shortEventLabel(h.event);
    const bucket = isExam ? examNames : otherNames;
    if (name && !bucket.includes(name)) bucket.push(name);
  }
  const phrases: string[] = [];
  if (examNames.length) phrases.push(`역대 ${examNames.join('·')}일이었습니다`);
  if (otherNames.length) phrases.push(`${otherNames.join('·')}이었던 해가 있습니다`);
  const countSuffix = hits.length >= 2 ? ` (${hits.length}회)` : '';
  const headline = `${month}월 ${day}일은 ${phrases.join(' · ') || '특정일이 있던 날입니다'}${countSuffix}`;

  const labels = hits.slice(0, 3).map((h) => h.event.yearLabel || `${h.year}년`);
  const rest = hits.length - labels.length;
  const detail = labels.length ? `${labels.join(' · ')}${rest > 0 ? ` 외 ${rest}회` : ''}` : '';
  return { headline, detail };
}

/**
 * '역대 특정일' 줄 옆 버튼 문구. 예: "수능일 날씨를 해마다 실제 날짜로 보기".
 * 시험은 '수능일·학력고사일', 명절은 그 이름을 그대로 쓴다.
 */
function seriesCtaText(event: ApiCalendarEvent): string {
  if (event.kind === 'csat') return '수능일 날씨를 해마다 실제 날짜로 보기';
  if (event.kind === 'hakryeok') return '학력고사일 날씨를 해마다 실제 날짜로 보기';
  const name = (event.label || '특정일').trim();
  return `${name} 날씨를 해마다 실제 날짜로 보기`;
}

export const StoryPage: React.FC<StoryPageProps> = ({ stationId, onOpenDetail }) => {
  const station = getStationById(stationId);
  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(10);
  const [selectedDay, setSelectedDay] = useState(22);
  // '날짜로 보는 날씨' 카드가 보일 때만 특정일 달력을 부른다(캐러셀 1번째).
  // 주소에 특정일(?series=…)이 실려 있으면 그 카드부터 열리므로 처음부터 1로 둔다.
  const [activeCardIndex, setActiveCardIndex] = useState(() =>
    typeof window !== 'undefined' && resolveSeriesTargetFromSearch(window.location.search) ? 1 : 0,
  );
  // null 이면 '올해'(이벤트가 없으면 가장 최근 해)를 쓴다.
  const [calendarYear, setCalendarYear] = useState<number | null>(null);
  // null 이면 기존 '월·일 고정' 화면. 값이 있으면 그 특정일의 '해마다 실제 날짜' 화면으로 바뀐다.
  // 새로고침·뒤로 가기에도 살아남도록 주소(?series=csat&seriesLabel=추석)와 맞춰 둔다.
  const [seriesTarget, setSeriesTarget] = useState<SeriesTarget | null>(() =>
    typeof window === 'undefined' ? null : resolveSeriesTargetFromSearch(window.location.search),
  );
  const [battleCases, setBattleCases] = useState<Array<{ id: string; month: number; day: number }>>([
    { id: 'A', month: 10, day: 22 },
    { id: 'B', month: 5, day: 5 },
  ]);

  const highlightsQuery = useStatsHighlightsQuery(stationId, true);
  // 특정일 모드에서는 월·일 고정 조회를 쓰지 않으므로 부르지 않는다.
  const dateWeatherQuery = useStatsDateWeatherQuery(stationId, selectedMonth, selectedDay, !seriesTarget);
  const battleQuery = useStatsDateBattleQuery(stationId, battleCases, true);
  const recordsQuery = useRtRecordsQuery(stationId, true);

  // 특정일 달력: 1990년~올해+2년을 한 번 받아 화면에서 골라 쓴다. 지점과 무관한 공개 자료다.
  const calendarRange = useMemo(() => {
    const now = new Date();
    const thisYear = now.getFullYear();
    // '역대 ...일이었습니다' 줄은 이미 지나간 날만 센다(올해 남은 날은 아직 열리지 않은 달력 정보).
    const todayKey = `${thisYear}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return { from: 1990, to: thisYear + 2, thisYear, todayKey };
  }, []);
  const calendarQuery = useCalendarEventsQuery(calendarRange.from, calendarRange.to, activeCardIndex === 1);
  const calendarEvents = calendarQuery.data?.data.events ?? [];

  const battleCaseLabel = (c: { month: number; day: number }) => `${c.month}월 ${c.day}일`;
  const daysInMonth = (month: number) => [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] || 31;
  const updateBattleCase = (id: string, patch: { month?: number; day?: number }) => {
    setBattleCases((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const month = patch.month ?? c.month;
        const maxDay = daysInMonth(month);
        const day = Math.min(patch.day ?? c.day, maxDay);
        return { ...c, month, day };
      }),
    );
  };
  const addBattleCase = () => {
    setBattleCases((prev) => {
      if (prev.length >= 4) return prev;
      const ids = ['A', 'B', 'C', 'D'];
      const last = prev[prev.length - 1];
      const nextMonth = last.month === 12 ? 1 : last.month + 1;
      return [...prev, { id: ids[prev.length], month: nextMonth, day: 1 }];
    });
  };
  const removeBattleCase = (id: string) => {
    setBattleCases((prev) => {
      if (prev.length <= 2) return prev;
      const ids = ['A', 'B', 'C', 'D'];
      return prev.filter((c) => c.id !== id).map((c, i) => ({ ...c, id: ids[i] }));
    });
  };

  // ---- 특정일 '해마다 실제 날짜' 모드 -------------------------------------------------
  // 왜: '날짜로 보는 날씨'는 고른 월·일을 해마다 고정한다. 수능일·학력고사일은 해마다 양력 날짜가 바뀌므로
  // (2025학년도 11/14, 2026학년도 11/13 …) 고정 월·일로는 그해 실제 시행일의 날씨가 나오지 않는다.
  // 이 모드는 서버 달력이 푼 '그해 실제 양력 날짜'를 따라가며 하루씩 값을 받는다(/api/stats/date-series).
  const seriesPushedRef = React.useRef(false);

  const pushSeriesUrl = useCallback((target: SeriesTarget | null) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('series');
    url.searchParams.delete('seriesLabel');
    if (target) {
      url.searchParams.set('series', target.kind);
      if (target.label) url.searchParams.set('seriesLabel', target.label);
    }
    window.history.pushState({ ...(window.history.state || {}), inalSeries: true }, '', url.toString());
    seriesPushedRef.current = true;
  }, []);

  const enterSeriesMode = useCallback(
    (target: SeriesTarget) => {
      pushSeriesUrl(target);
      setSeriesTarget(target);
      // 카드가 특정일 모드로 바뀌어도 스크롤 위치는 유지한다(같은 자리에서 내용만 바뀐다).
    },
    [pushSeriesUrl],
  );

  const exitSeriesMode = useCallback(() => {
    // 우리가 쌓은 항목이면 뒤로 가서 지운다(주소·뒤로 가기 모두 자연스럽게). 아니면 새 항목으로 되돌린다.
    if (seriesPushedRef.current) {
      seriesPushedRef.current = false;
      window.history.back();
      setSeriesTarget(null);
      return;
    }
    pushSeriesUrl(null);
    seriesPushedRef.current = false;
    setSeriesTarget(null);
  }, [pushSeriesUrl]);

  // 뒤로 가기·앞으로 가기로 주소가 바뀌면 화면도 따라간다(App 의 popstate 처리와 별개로 이 카드만 맞춘다).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPop = () => setSeriesTarget(resolveSeriesTargetFromSearch(window.location.search));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const renderQuestionsCard = () => {
    if (highlightsQuery.isLoading) return <LoadingSkeleton label="관측 통계로 답하는 질문 카드를 불러오는 중입니다…" />;
    if (highlightsQuery.isError || !highlightsQuery.data) return <ErrorState title="질문 카드를 불러오지 못했어요" onRetry={() => highlightsQuery.refetch()} />;

    const raw = highlightsQuery.data.data;
    const rawCards = raw.cards || [];
    const cards = rawCards.map((c, idx) => {
      const cAny = c as unknown as {
        q?: string;
        periodLabel?: string;
        text?: string;
        metricInfo?: { label?: string; unit?: string };
        delta?: { delta?: number | null; unit?: string };
      };
      const deltaVal = cAny.delta?.delta;
      const fmtDelta = isValidNumber(deltaVal) ? `${deltaVal > 0 ? '+' : ''}${Math.round(deltaVal * 10) / 10}` : null;
      return {
        id: c.id || `hl-${idx}`,
        title: c.title || cAny.q || '기후 변화 질문',
        question: c.question || cAny.q,
        value: c.value ?? fmtDelta ?? '-',
        unit: c.unit || cAny.delta?.unit || cAny.metricInfo?.unit || '',
        description: c.description || cAny.text || '',
        badge: c.badge || cAny.periodLabel || '질문으로 보는 날씨',
      };
    });
    const safeIdx = Math.min(selectedQuestionIdx, Math.max(0, cards.length - 1));
    const currentCard = cards[safeIdx];
    if (!currentCard) return <LoadingSkeleton label="질문 카드를 준비 중입니다…" />;

    const storyVm: StoryCardViewModel = {
      id: currentCard.id,
      badgeText: currentCard.badge || '질문으로 보는 날씨',
      kind: 'stats',
      title: currentCard.title,
      highlightValue: `${currentCard.value ?? '-'}${currentCard.unit || ''}`,
      summary: currentCard.description,
      tags: [station.name],
      provenance: { kind: 'stats', sourceName: raw.source || '기상청 ASOS 관측 (1990~2025)', referenceTime: raw.asOf || '최근 완료 연도 기준' },
      detail: {
        id: `story-q-${currentCard.id}`,
        categoryBadge: '질문으로 보는 날씨',
        title: currentCard.title,
        subtitle: currentCard.question || '1990년부터 축적된 ASOS 관측 통계로 답합니다.',
        provenance: { kind: 'stats', sourceName: 'ASOS 공식 일자료 (1990~2025)', referenceTime: '1990~1999 vs 2016~2025' },
        explanationBody: ['선택한 지점의 1990~1999년 평균과 최근 완료된 10개 연도(2016~2025년) 평균을 비교합니다.'],
      },
    };

    return (
      <StoryCard story={storyVm} indexLabel={`질문 ${safeIdx + 1}/${cards.length}`} onOpenDetail={onOpenDetail}>
        <div className="space-y-1.5" data-no-carousel-swipe="true">
          <div className="flex items-center gap-1 text-[11px] font-bold text-inal-textMuted">
            <HelpCircle className="h-3.5 w-3.5 text-inal-accent" />
            <span>궁금한 질문을 눌러 바로 답을 확인해 보세요</span>
          </div>
          <div className="space-y-1.5">
            {cards.map((c, idx) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedQuestionIdx(idx)}
                className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-xs transition ${
                  idx === safeIdx ? 'border-inal-accent bg-inal-accentSoft/75 font-bold text-inal-text' : 'border-inal-border bg-inal-surfaceSubtle/50 text-inal-textMuted'
                }`}
              >
                <span className="truncate pr-2">{c.title}</span>
                <span className="shrink-0 font-bold tabular-nums text-inal-accent">{c.value}{c.unit}</span>
              </button>
            ))}
          </div>
        </div>
      </StoryCard>
    );
  };

  // 특정일 모드면 그 카드가 기존 '날짜로 보는 날씨' 카드 자리를 대신한다.
  const renderDateWeatherCard = () => {
    if (seriesTarget) {
      return (
        <DateSeriesCard
          key={seriesTargetKey(seriesTarget)}
          stationId={stationId}
          target={seriesTarget}
          onBack={exitSeriesMode}
        />
      );
    }
    return renderMonthDayCard();
  };

  const renderMonthDayCard = () => {
    if (dateWeatherQuery.isLoading) return <LoadingSkeleton label={`${selectedMonth}월 ${selectedDay}일의 과거 날씨를 찾는 중입니다…`} />;
    if (dateWeatherQuery.isError || !dateWeatherQuery.data) return <ErrorState title="날짜별 날씨를 불러오지 못했어요" onRetry={() => dateWeatherQuery.refetch()} />;

    const raw = dateWeatherQuery.data.data;
    const rawAny = raw as unknown as {
      daily?: {
        metrics?: {
          avg?: { mean?: number | null };
          min?: { mean?: number | null };
          max?: { mean?: number | null };
        };
        rows?: Array<{
          referenceYear: number;
          values?: { avg?: number | null; max?: number | null; min?: number | null; rain?: number | null };
        }>;
      };
      counts?: { rules?: Array<{ id: string; k?: number; n?: number }> };
      stories?: Array<{ id?: string; text?: string }>;
    };

    const taAvg = isValidNumber(raw.weather?.taAvg) ? raw.weather.taAvg : isValidNumber(rawAny.daily?.metrics?.avg?.mean) ? rawAny.daily!.metrics!.avg!.mean! : null;
    const taMin = isValidNumber(raw.weather?.taMin) ? raw.weather.taMin : isValidNumber(rawAny.daily?.metrics?.min?.mean) ? rawAny.daily!.metrics!.min!.mean! : null;
    const rainRule = rawAny.counts?.rules?.find((r) => r.id === 'rain');
    const rainProb = isValidNumber(raw.weather?.rainProbability)
      ? raw.weather.rainProbability
      : rainRule && isValidNumber(rainRule.k) && isValidNumber(rainRule.n) && rainRule.n > 0
      ? Math.round((rainRule.k / rainRule.n) * 100)
      : null;
    const typicalSummary =
      raw.weather?.typicalSummary ||
      rawAny.stories?.map((s) => s.text).filter(Boolean).join(' ') ||
      `최근 10년 ${selectedMonth}월 ${selectedDay}일 요약`;

    const hist =
      raw.historical && raw.historical.length > 0
        ? raw.historical
        : (rawAny.daily?.rows || [])
            .filter((r) => r.values && (isValidNumber(r.values.max) || isValidNumber(r.values.min)))
            .slice()
            .reverse()
            .map((r) => ({
              year: r.referenceYear,
              taMin: r.values?.min ?? null,
              taMax: r.values?.max ?? null,
              summary: isValidNumber(r.values?.rain) && r.values!.rain! >= 0.1 ? `강수 ${r.values!.rain}mm` : '비 없음',
            }));

    // ---- 특정일(설날·추석·수능·학력고사) — 날씨 값과 무관한 달력 정보. 실패해도 카드 본문은 그대로 보여 준다.
    const calendarLoading = calendarQuery.isLoading && !calendarQuery.data;
    const sameDayHits = sameMonthDayEvents(calendarEvents, selectedMonth, selectedDay).filter(
      (h) => h.event.solarDate <= calendarRange.todayKey,
    );
    const sameDayLine = sameDayHits.length ? describeMonthDayHits(sameDayHits, selectedMonth, selectedDay) : null;

    // 칩으로 보여 줄 해: 고른 해가 있으면 그 해, 없으면 올해, 올해 자료가 없으면 올해 이하에서 가장 최근 해
    // (그것도 없으면 이후 첫 해). 연도 select 목록은 API 가 실제로 준 해만 쓴다.
    const yearsWithEvents = Array.from(
      new Set(calendarEvents.map((e) => Number(e.solarDate.slice(0, 4))).filter((y) => Number.isFinite(y))),
    ).sort((a, b) => b - a);
    const pastYears = yearsWithEvents.filter((y) => y <= calendarRange.thisYear);
    const fallbackYear =
      (yearsWithEvents.includes(calendarRange.thisYear) && calendarRange.thisYear) ||
      pastYears[0] ||
      yearsWithEvents[yearsWithEvents.length - 1] ||
      calendarRange.thisYear;
    const chipYear = calendarYear ?? fallbackYear;
    const yearEvents = eventsOfYear(calendarEvents, chipYear);

    return (
      <ComparisonCard
        badgeText="내가 기억하는 이날"
        title={`${selectedMonth}월 ${selectedDay}일 ${station.name}에는 어떤 날씨가 많았을까?`}
        summary={typicalSummary}
        provenance={{ kind: 'stats', sourceName: '기상청 ASOS 공식 일자료', referenceTime: `매년 ${selectedMonth}월 ${selectedDay}일`, note: '해마다 같은 월일의 관측값을 모아 요약합니다.' }}
        metrics={[
          { label: '이날 평균기온', valueText: formatTemp(taAvg), isMissing: taAvg === null, highlight: 'warm' },
          { label: '이날 최저평균', valueText: formatTemp(taMin), isMissing: taMin === null, highlight: 'cool' },
          { label: '비 왔던 해 비율', valueText: formatPercent(rainProb), isMissing: rainProb === null },
        ]}
      >
        <div data-no-carousel-swipe="true" className="min-w-0 rounded-2xl border border-inal-border bg-inal-surfaceSubtle/60 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-inal-text">
              <CalendarHeart className="h-3.5 w-3.5 text-inal-accent" />
              <span>생일 · 기념일 날짜 고르기</span>
            </span>
            <div className="flex items-center gap-1.5">
              <select aria-label="월 선택" value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="h-9 rounded-lg border border-inal-border bg-white px-2 text-xs font-bold text-inal-text">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m}월</option>
                ))}
              </select>
              <select aria-label="일 선택" value={selectedDay} onChange={(e) => setSelectedDay(Number(e.target.value))} className="h-9 rounded-lg border border-inal-border bg-white px-2 text-xs font-bold text-inal-text">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}일</option>
                ))}
              </select>
            </div>
          </div>
          {sameDayLine && (
            <div className="rounded-xl border border-inal-accent/30 bg-inal-accentSoft/70 px-3 py-2">
              <p className="break-keep text-[11px] font-bold leading-snug text-inal-accent">{sameDayLine.headline}</p>
              {sameDayLine.detail && (
                <p className="mt-0.5 break-keep text-[10.5px] font-medium leading-snug text-inal-textMuted">{sameDayLine.detail}</p>
              )}
              {sameDayHits[0] && (
                <button
                  type="button"
                  onClick={() => enterSeriesMode(seriesTargetForEvent(sameDayHits[0].event))}
                  data-testid="series-cta-sameday"
                  className="mt-1.5 inline-flex max-w-full items-center gap-0.5 rounded-lg bg-white/80 px-2 py-1.5 text-[10.5px] font-bold text-inal-accent"
                >
                  <span className="break-keep text-left">{seriesCtaText(sameDayHits[0].event)}</span>
                  <ChevronRight className="h-3 w-3 shrink-0" />
                </button>
              )}
            </div>
          )}
          <div className="space-y-1.5 pt-1">
            {hist.slice(0, 3).map((h) => (
              <div key={h.year} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs">
                <span className="font-bold tabular-nums text-inal-text">{h.year}년 · {h.summary || '관측'}</span>
                <span className="font-semibold tabular-nums text-inal-text">{formatTemp(h.taMin)} ~ {formatTemp(h.taMax)}</span>
              </div>
            ))}
          </div>
        </div>

        <div data-no-carousel-swipe="true" className="mt-2.5 min-w-0 rounded-2xl border border-inal-border bg-inal-surfaceSubtle/60 p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className="inline-flex items-center gap-1 text-xs font-bold text-inal-text">
              <CalendarDays className="h-3.5 w-3.5 text-inal-accent" />
              <span>{chipYear}년 특정일</span>
            </span>
            {yearsWithEvents.length > 1 && (
              <select
                aria-label="특정일 연도 선택"
                value={chipYear}
                onChange={(e) => setCalendarYear(Number(e.target.value))}
                className="h-8 rounded-lg border border-inal-border bg-white px-2 text-[11px] font-bold text-inal-textMuted"
              >
                {yearsWithEvents.map((y) => (
                  <option key={y} value={y}>{y}년</option>
                ))}
              </select>
            )}
          </div>
          {calendarLoading ? (
            <p className="text-[11px] font-medium text-inal-textMuted">특정일을 불러오는 중입니다…</p>
          ) : calendarQuery.isError ? (
            <p className="text-[11px] font-medium text-inal-textMuted">
              특정일을 불러오지 못했습니다.{' '}
              <button type="button" onClick={() => calendarQuery.refetch()} className="font-bold text-inal-accent underline">
                다시 시도
              </button>
            </p>
          ) : yearEvents.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {yearEvents.map((e) => {
                const { month, day } = monthDayOf(e.solarDate);
                const isExam = EXAM_KINDS.has(e.kind);
                const isPicked = month === selectedMonth && day === selectedDay;
                return (
                  <button
                    key={`${e.id}-${e.solarDate}`}
                    type="button"
                    onClick={() => {
                      // 그날 하루로만 이동하지 않고, 그 특정일이 해마다 며칠이었는지 이어 보는 모드로 넘어간다.
                      // (돌아왔을 때 같은 날짜가 보이도록 월·일도 함께 맞춰 둔다.)
                      setSelectedMonth(month);
                      setSelectedDay(day);
                      enterSeriesMode(seriesTargetForEvent(e));
                    }}
                    data-testid={`series-chip-${e.kind}`}
                    aria-label={`${month}월 ${day}일 · ${seriesCtaText(e)}`}
                    aria-pressed={isPicked}
                    title={`${e.label}${e.yearLabel ? ` · ${e.yearLabel}` : ''}${e.lunarText ? ` · ${e.lunarText}` : ''}`}
                    className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2.5 py-1.5 text-[11px] font-bold transition ${
                      isExam
                        ? 'border-inal-accent/40 bg-inal-accentSoft text-inal-accent'
                        : 'border-inal-border bg-white text-inal-textMuted'
                    } ${isPicked ? 'ring-2 ring-inal-accent ring-offset-1' : ''}`}
                  >
                    <span className="shrink-0 tabular-nums">{month}.{day}</span>
                    <span className="truncate">{shortEventLabel(e)}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-[11px] font-medium text-inal-textMuted">이 해에 등록된 특정일이 없습니다.</p>
          )}
          <p className="break-keep text-[10px] leading-snug text-inal-textSoft">
            특정일은 달력 정보이며 위 날씨 값과 무관합니다. 누르면 그 특정일이 해마다 실제로 며칠이었는지 날씨와 함께 이어서 볼 수 있어요.
          </p>
        </div>
      </ComparisonCard>
    );
  };

  const renderWeatherBattleCard = () => {
    const titleFromCases =
      battleCases.length === 2
        ? `${battleCaseLabel(battleCases[0])} vs ${battleCaseLabel(battleCases[1])} 최근 10년 대결`
        : `${battleCases.map(battleCaseLabel).join(' · ')} 최근 10년 대결`;

    const dateControls = (
      <div data-no-carousel-swipe="true" className="rounded-2xl border border-inal-border bg-inal-surfaceSubtle/60 p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-inal-text">
            <Swords className="h-3.5 w-3.5 text-inal-accent" />
            <span>비교할 날짜 고르기 (2~4개)</span>
          </span>
          {battleCases.length < 4 && (
            <button
              type="button"
              onClick={addBattleCase}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-inal-border bg-white px-2.5 text-[11px] font-bold text-inal-text"
              aria-label={`날짜 추가 (${battleCases.length}/4)`}
            >
              <Plus className="h-3.5 w-3.5 text-inal-accent" />
              날짜 추가 ({battleCases.length}/4)
            </button>
          )}
        </div>
        <div className="space-y-2">
          {battleCases.map((c) => (
            <div key={c.id} className="flex items-center gap-1.5 rounded-xl bg-white px-2.5 py-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-inal-accentSoft text-[11px] font-extrabold text-inal-accent">
                {c.id}
              </span>
              <select
                aria-label={`${c.id} 월 선택`}
                value={c.month}
                onChange={(e) => updateBattleCase(c.id, { month: Number(e.target.value) })}
                className="h-9 min-w-0 flex-1 rounded-lg border border-inal-border bg-white px-2 text-xs font-bold text-inal-text"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m}월</option>
                ))}
              </select>
              <select
                aria-label={`${c.id} 일 선택`}
                value={c.day}
                onChange={(e) => updateBattleCase(c.id, { day: Number(e.target.value) })}
                className="h-9 min-w-0 flex-1 rounded-lg border border-inal-border bg-white px-2 text-xs font-bold text-inal-text"
              >
                {Array.from({ length: daysInMonth(c.month) }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}일</option>
                ))}
              </select>
              {battleCases.length > 2 ? (
                <button
                  type="button"
                  onClick={() => removeBattleCase(c.id)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-inal-border text-inal-textMuted"
                  aria-label={`${c.id} 날짜 빼기`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <span className="w-9 shrink-0" aria-hidden="true" />
              )}
            </div>
          ))}
        </div>
      </div>
    );

    if (battleQuery.isLoading) {
      return (
        <ComparisonCard
          badgeText="날씨 배틀"
          title={titleFromCases}
          summary="두 날짜 이상의 날씨 대결 결과를 계산하는 중입니다…"
          provenance={{ kind: 'stats', sourceName: 'ASOS 공식 일자료', referenceTime: '2016~2025 (10년)', note: '해마다 같은 날짜를 나란히 비교합니다. 공통으로 자료가 있는 해만 씁니다.' }}
        >
          {dateControls}
          <div role="status" className="mt-2.5 animate-pulse space-y-2 rounded-2xl border border-inal-border bg-inal-surfaceSubtle/50 p-3">
            <div className="h-16 rounded-xl bg-inal-surfaceSubtle" />
            <div className="h-16 rounded-xl bg-inal-surfaceSubtle" />
            <p className="text-center text-[11px] font-medium text-inal-textSoft">대결 결과를 불러오는 중입니다…</p>
          </div>
        </ComparisonCard>
      );
    }

    if (battleQuery.isError || !battleQuery.data) {
      return (
        <ComparisonCard
          badgeText="날씨 배틀"
          title={titleFromCases}
          summary="날씨 배틀 결과를 불러오지 못했어요. 날짜를 바꾼 뒤 다시 시도해 보세요."
          provenance={{ kind: 'stats', sourceName: 'ASOS 공식 일자료', referenceTime: '2016~2025 (10년)', note: '해마다 같은 날짜를 나란히 비교합니다. 공통으로 자료가 있는 해만 씁니다.' }}
        >
          {dateControls}
          <div role="alert" className="mt-2.5 rounded-2xl border border-amber-200/80 bg-amber-50/60 p-3 text-center">
            <p className="text-xs font-bold text-inal-text">결과를 불러오지 못했어요</p>
            <button
              type="button"
              onClick={() => battleQuery.refetch()}
              className="mt-2 inline-flex h-9 items-center rounded-lg bg-inal-text px-3 text-[11px] font-semibold text-white"
            >
              다시 시도
            </button>
          </div>
        </ComparisonCard>
      );
    }

    const raw = battleQuery.data.data;
    const rawAny = raw as unknown as {
      cases?: Array<{ id: string; specLabel?: string }>;
      tallies?: Array<{ id: string; label?: string; word?: string; n?: number; results?: Array<{ case: string; k?: number }> }>;
      yearly?: Array<{
        referenceYear: number;
        cells?: Array<{ case: string; values?: { max?: number | null; min?: number | null; rain?: number | null; wind?: number | null } }>;
      }>;
    };

    if (raw.contestant1 && raw.contestant2 && raw.winner) {
      const c1 = raw.contestant1;
      const c2 = raw.contestant2;
      const win = raw.winner;
      return (
        <ComparisonCard
          badgeText="날씨 배틀"
          title="어느 날의 날씨가 더 쾌적했을까? 날짜 대결!"
          summary={win.reason}
          provenance={{ kind: 'stats', sourceName: 'ASOS 공식 일자료', referenceTime: `${c1.date} vs ${c2.date}` }}
        >
          {dateControls}
          <div className="mt-2.5 grid grid-cols-2 gap-2.5">
            {[c1, c2].map((c) => {
              const isWinner = win.date === c.date;
              return (
                <div key={c.date} className={`rounded-2xl border p-3 ${isWinner ? 'border-inal-accent bg-inal-accentSoft/65' : 'border-inal-border bg-inal-surfaceSubtle/60'}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold tabular-nums text-inal-text">{c.date}</span>
                    {isWinner && <span className="rounded bg-inal-accent px-1.5 py-0.5 text-[10px] font-bold text-white">WIN</span>}
                  </div>
                  <div className="mt-2 flex items-baseline gap-1">
                    <Swords className="h-3.5 w-3.5 text-inal-accent" />
                    <span className="text-xl font-extrabold tabular-nums text-inal-text">{c.score}점</span>
                  </div>
                  <div className="mt-2 space-y-0.5 text-[11px] tabular-nums text-inal-textMuted">
                    <p>최고 {formatTemp(c.taMax)} / 최저 {formatTemp(c.taMin)}</p>
                    <p>일강수 {formatRainfall(c.rnDay)} · 바람 {formatWindSpeed(c.wsAvg)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </ComparisonCard>
      );
    }

    const apiCases = rawAny.cases || [];
    const tallies = rawAny.tallies || [];
    const avgTally = tallies.find((t) => t.id === 'avg') || tallies[0];
    const latestYearRow = rawAny.yearly?.[rawAny.yearly.length - 1];
    const displayCases = battleCases.map((bc) => {
      const api = apiCases.find((c) => c.id === bc.id);
      const wins = avgTally?.results?.find((r) => r.case === bc.id)?.k ?? 0;
      const vals = latestYearRow?.cells?.find((c) => c.case === bc.id)?.values;
      return {
        id: bc.id,
        label: api?.specLabel || battleCaseLabel(bc),
        wins,
        vals,
      };
    });
    const maxWins = Math.max(0, ...displayCases.map((c) => c.wins));
    const summaryParts = displayCases.map((c) => `${c.label} ${c.wins}회`).join(' vs ');

    return (
      <ComparisonCard
        badgeText="날씨 배틀"
        title={titleFromCases}
        summary={`최근 10년 동안 ${avgTally?.word || '더 따뜻했던 해'}는 ${summaryParts}입니다.`}
        provenance={{ kind: 'stats', sourceName: 'ASOS 공식 일자료', referenceTime: '2016~2025 (10년)', note: '해마다 같은 날짜를 나란히 비교합니다. 공통으로 자료가 있는 해만 씁니다.' }}
      >
        {dateControls}
        <div className={`mt-2.5 grid gap-2.5 ${displayCases.length > 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
          {displayCases.map((c) => {
            const isWinner = c.wins === maxWins && maxWins > 0;
            return (
              <div key={c.id} className={`rounded-2xl border p-3 ${isWinner ? 'border-inal-accent bg-inal-accentSoft/65' : 'border-inal-border bg-inal-surfaceSubtle/60'}`}>
                <div className="flex items-center justify-between gap-1">
                  <span className="truncate text-xs font-extrabold tabular-nums text-inal-text">{c.label}</span>
                  {isWinner && <span className="shrink-0 rounded bg-inal-accent px-1.5 py-0.5 text-[10px] font-bold text-white">우세</span>}
                </div>
                <div className="mt-2 flex items-baseline gap-1">
                  <Swords className="h-3.5 w-3.5 text-inal-accent" />
                  <span className="text-xl font-extrabold tabular-nums text-inal-text">{c.wins}승</span>
                </div>
                <div className="mt-2 space-y-0.5 text-[11px] tabular-nums text-inal-textMuted">
                  <p>최근해 최고 {formatTemp(c.vals?.max)} / 최저 {formatTemp(c.vals?.min)}</p>
                  <p>일강수 {formatRainfall(c.vals?.rain)} · 바람 {formatWindSpeed(c.vals?.wind)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </ComparisonCard>
    );
  };

  const renderHistoricalRecordsStoryCard = () => {
    const recDays = recordsQuery.data?.data.days || [];
    // 서버는 앞으로 며칠(예: 11.1~11.10)마다 ±7일 창의 극값을 준다. 창이 하루씩 밀리면 같은 기록이 여러 줄에
    // 겹쳐 보이므로(25.9℃ 2011-11-05 가 두 번), 카드에는 이 기간 전체에서 가장 높은 최고기온과 가장 낮은
    // 최저기온 딱 두 줄만 남긴다. 같은 값이면 관측일이 이른 쪽을 쓴다.
    const mdOf = (v?: string) => (v && v.length >= 10 ? `${Number(v.slice(5, 7))}.${Number(v.slice(8, 10))}` : v || '');
    let hot: { value: number; date: string; basis: string } | null = null;
    let cold: { value: number; date: string; basis: string } | null = null;
    const extra: Array<{ id: string; title: string; subtitle: string; primaryText: string }> = [];
    const seenExtra = new Set<string>();
    recDays.forEach((d, idx) => {
      const dAny = d as unknown as {
        kind?: string;
        periods?: Array<{
          id: string;
          recMax?: { value?: number | null; date?: string };
          recMin?: { value?: number | null; date?: string };
        }>;
      };
      if (d.title && d.unit !== undefined) {
        const key = `item|${d.title}|${d.date}|${d.value ?? ''}`;
        if (seenExtra.has(key)) return;
        seenExtra.add(key);
        extra.push({
          id: d.id || `rec-${idx}`,
          title: d.title,
          subtitle: `${d.date} 관측`,
          primaryText: `${d.value ?? '-'}${d.unit}`,
        });
        return;
      }
      const p = dAny.periods?.find((x) => x.id === 'all') || dAny.periods?.[0];
      if (!p) return;
      // 어느 날짜를 기준으로 본 ±7일 창인지 남긴다(같은 값이 다른 창에서 또 나올 수 있어서).
      const basis = d.date ? `${mdOf(d.date)} 기준 ±7일` : '±7일 창';
      const vMax = p.recMax?.value;
      const vMin = p.recMin?.value;
      if (isValidNumber(vMax) && (hot === null || vMax > hot.value)) {
        hot = { value: vMax, date: p.recMax?.date || '', basis };
      }
      if (isValidNumber(vMin) && (cold === null || vMin < cold.value)) {
        cold = { value: vMin, date: p.recMin?.date || '', basis };
      }
    });

    const rows: Array<{ id: string; title: string; subtitle: string; primaryText: string }> = [];
    if (hot) {
      const h = hot as { value: number; date: string; basis: string };
      rows.push({
        id: 'story-rec-max',
        title: '이 시기 역대 최고기온',
        subtitle: `${h.date ? `${h.date} 관측 · ` : ''}${h.basis}`,
        primaryText: formatTemp(h.value),
      });
    }
    if (cold) {
      const c = cold as { value: number; date: string; basis: string };
      rows.push({
        id: 'story-rec-min',
        title: '이 시기 역대 최저기온',
        subtitle: `${c.date ? `${c.date} 관측 · ` : ''}${c.basis}`,
        primaryText: formatTemp(c.value),
      });
    }
    rows.push(...extra);

    return (
      <ComparisonCard
        badgeText="흥미로운 기상 기록"
        title={`${station.name}의 이 시기, 가장 기억에 남는 극값 기록`}
        summary="이 시기 역대 최고·최저 기온"
        provenance={{ kind: 'stats', sourceName: '기상청 ASOS 공식 일자료 (1990~2025)', referenceTime: '1990~ 관측 극값' }}
        rows={rows.slice(0, 4)}
        onOpenDetail={onOpenDetail}
      />
    );
  };

  return (
    <div className="space-y-3">
      <CardCarousel
        cardLabels={STORY_TAB_LABELS}
        ariaLabel="날씨 이야기 카드 목록"
        // 주소에 특정일(?series=…)이 실려 있으면 그 카드(2번째)부터 연다 — 새로고침·공유 링크가 같은 화면으로 이어진다.
        initialIndex={seriesTarget ? 1 : 0}
        onIndexChange={setActiveCardIndex}
      >
        {/* 배열로 넘기면 React 가 key 를 요구해 콘솔 경고가 난다 — 카드마다 key 를 붙인 조각으로 감싼다(화면에는 영향 없음). */}
        {[
          <React.Fragment key="story-questions">{renderQuestionsCard()}</React.Fragment>,
          <React.Fragment key="story-date">{renderDateWeatherCard()}</React.Fragment>,
          <React.Fragment key="story-battle"><WeatherContextPanel stationId={stationId} mode="battle" /><details><summary className="p-3 text-sm">기존 날짜별 상세 비교</summary>{renderWeatherBattleCard()}</details></React.Fragment>,
          <React.Fragment key="story-season"><WeatherContextPanel stationId={stationId} mode="season" /></React.Fragment>,
          <React.Fragment key="story-records">{renderHistoricalRecordsStoryCard()}</React.Fragment>,
        ]}
      </CardCarousel>
    </div>
  );
};
