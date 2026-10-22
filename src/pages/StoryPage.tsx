import React, { useState } from 'react';
import { Swords, CalendarHeart, HelpCircle } from 'lucide-react';
import type { BottomSheetDetailPayload, StoryCardViewModel } from '../types/viewmodel';
import { getStationById } from '../api/endpoints';
import {
  useStatsHighlightsQuery,
  useStatsDateWeatherQuery,
  useStatsDateBattleQuery,
  useRtRecordsQuery,
} from '../hooks/useWeatherQueries';
import { formatTemp, formatRainfall, formatWindSpeed, formatPercent, isValidNumber } from '../api/mappers';
import { CardCarousel } from '../components/common/CardCarousel';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { StoryCard } from '../components/cards/StoryCard';
import { ComparisonCard } from '../components/cards/ComparisonCard';

interface StoryPageProps {
  stationId: string;
  onOpenDetail: (detail: BottomSheetDetailPayload) => void;
}

const STORY_TAB_LABELS = [
  '질문으로 보는 날씨',
  '날짜로 보는 날씨',
  '날씨 배틀',
  '과거 같은 날·기록',
];

export const StoryPage: React.FC<StoryPageProps> = ({ stationId, onOpenDetail }) => {
  const station = getStationById(stationId);
  const [selectedQuestionIdx, setSelectedQuestionIdx] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(10);
  const [selectedDay, setSelectedDay] = useState(22);
  const [battleDate1] = useState('2025-10-22');
  const [battleDate2] = useState('2025-05-05');

  const highlightsQuery = useStatsHighlightsQuery(stationId, true);
  const dateWeatherQuery = useStatsDateWeatherQuery(stationId, selectedMonth, selectedDay, true);
  const battleQuery = useStatsDateBattleQuery(stationId, battleDate1, battleDate2, true);
  const recordsQuery = useRtRecordsQuery(stationId, true);

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
      tags: ['1990년부터의관측', '통계문답', station.name],
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

  const renderDateWeatherCard = () => {
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
      `최근 10년 ${selectedMonth}월 ${selectedDay}일의 ASOS 일자료 요약입니다.`;

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

    return (
      <ComparisonCard
        badgeText="내가 기억하는 이날"
        title={`${selectedMonth}월 ${selectedDay}일 ${station.name}에는 어떤 날씨가 많았을까?`}
        summary={typicalSummary}
        provenance={{ kind: 'stats', sourceName: '기상청 ASOS 공식 일자료 (/api/stats/date-weather)', referenceTime: `매년 ${selectedMonth}월 ${selectedDay}일` }}
        metrics={[
          { label: '이날 평균기온', valueText: formatTemp(taAvg), isMissing: taAvg === null, highlight: 'warm' },
          { label: '이날 최저평균', valueText: formatTemp(taMin), isMissing: taMin === null, highlight: 'cool' },
          { label: '비 왔던 해 비율', valueText: formatPercent(rainProb), isMissing: rainProb === null },
        ]}
      >
        <div data-no-carousel-swipe="true" className="rounded-2xl border border-inal-border bg-inal-surfaceSubtle/60 p-3 space-y-2.5">
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
          <div className="space-y-1.5 pt-1">
            {hist.slice(0, 3).map((h) => (
              <div key={h.year} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs">
                <span className="font-bold tabular-nums text-inal-text">{h.year}년 · {h.summary || '관측'}</span>
                <span className="font-semibold tabular-nums text-inal-text">{formatTemp(h.taMin)} ~ {formatTemp(h.taMax)}</span>
              </div>
            ))}
          </div>
        </div>
      </ComparisonCard>
    );
  };

  const renderWeatherBattleCard = () => {
    if (battleQuery.isLoading) return <LoadingSkeleton label="두 날짜의 날씨 대결 결과를 계산하는 중입니다…" />;
    if (battleQuery.isError || !battleQuery.data) return <ErrorState title="날씨 배틀 결과를 불러오지 못했어요" onRetry={() => battleQuery.refetch()} />;

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
          provenance={{ kind: 'stats', sourceName: 'ASOS 공식 일자료 (/api/stats/date-battle)', referenceTime: `${c1.date} vs ${c2.date}` }}
        >
          <div className="grid grid-cols-2 gap-2.5">
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

    const caseA = rawAny.cases?.find((c) => c.id === 'A') || { id: 'A', specLabel: battleDate1 };
    const caseB = rawAny.cases?.find((c) => c.id === 'B') || { id: 'B', specLabel: battleDate2 };
    const tallies = rawAny.tallies || [];
    const avgTally = tallies.find((t) => t.id === 'avg') || tallies[0];
    const kA = avgTally?.results?.find((r) => r.case === 'A')?.k ?? 0;
    const kB = avgTally?.results?.find((r) => r.case === 'B')?.k ?? 0;
    const latestYearRow = rawAny.yearly?.[rawAny.yearly.length - 1];
    const cellA = latestYearRow?.cells?.find((c) => c.case === 'A')?.values;
    const cellB = latestYearRow?.cells?.find((c) => c.case === 'B')?.values;

    return (
      <ComparisonCard
        badgeText="날씨 배틀"
        title={`${caseA.specLabel || battleDate1} vs ${caseB.specLabel || battleDate2} 최근 10년 대결`}
        summary={`최근 10년 동안 ${avgTally?.word || '더 따뜻했던 해'}는 ${caseA.specLabel} ${kA}회 vs ${caseB.specLabel} ${kB}회입니다.`}
        provenance={{ kind: 'stats', sourceName: 'ASOS 공식 일자료 (/api/stats/date-battle)', referenceTime: '2016~2025 (10년)' }}
      >
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { id: 'A', label: caseA.specLabel || battleDate1, wins: kA, isWinner: kA >= kB, vals: cellA },
            { id: 'B', label: caseB.specLabel || battleDate2, wins: kB, isWinner: kB > kA, vals: cellB },
          ].map((c) => (
            <div key={c.id} className={`rounded-2xl border p-3 ${c.isWinner ? 'border-inal-accent bg-inal-accentSoft/65' : 'border-inal-border bg-inal-surfaceSubtle/60'}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold tabular-nums text-inal-text">{c.label}</span>
                {c.isWinner && <span className="rounded bg-inal-accent px-1.5 py-0.5 text-[10px] font-bold text-white">우세</span>}
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
          ))}
        </div>
      </ComparisonCard>
    );
  };

  const renderHistoricalRecordsStoryCard = () => {
    const recDays = recordsQuery.data?.data.days || [];
    const rows = recDays.flatMap((d, idx) => {
      const dAny = d as unknown as {
        kind?: string;
        periods?: Array<{
          id: string;
          recMax?: { value?: number | null; date?: string };
          recMin?: { value?: number | null; date?: string };
        }>;
      };
      if (d.title && d.unit !== undefined) {
        return [
          {
            id: d.id || `rec-${idx}`,
            title: d.title,
            subtitle: `${d.date} 관측`,
            primaryText: `${d.value ?? '-'}${d.unit}`,
          },
        ];
      }
      const p = dAny.periods?.find((x) => x.id === 'all') || dAny.periods?.[0];
      if (!p) return [];
      const items = [];
      if (p.recMax?.value !== undefined) {
        items.push({
          id: `story-rec-max-${d.date}-${idx}`,
          title: `${dAny.kind || d.date} 이맘때 역대 최고기온`,
          subtitle: `${p.recMax.date || d.date} 관측 (±7일 창)`,
          primaryText: formatTemp(p.recMax.value),
        });
      }
      if (p.recMin?.value !== undefined) {
        items.push({
          id: `story-rec-min-${d.date}-${idx}`,
          title: `${dAny.kind || d.date} 이맘때 역대 최저기온`,
          subtitle: `${p.recMin.date || d.date} 관측 (±7일 창)`,
          primaryText: formatTemp(p.recMin.value),
        });
      }
      return items;
    });

    return (
      <ComparisonCard
        badgeText="흥미로운 기상 기록"
        title={`${station.name}의 이 시기, 가장 기억에 남는 극값 기록`}
        summary="1990년부터 쌓인 ASOS 관측 자료에서 이 시기에 기록된 역대 최고·최저 기온 기록입니다."
        provenance={{ kind: 'stats', sourceName: '기상청 ASOS 공식 일자료 (1990~2025)', referenceTime: '36개 연도 관측 극값' }}
        rows={rows.slice(0, 4)}
        onOpenDetail={onOpenDetail}
      />
    );
  };

  return (
    <div className="space-y-3">
      <CardCarousel cardLabels={STORY_TAB_LABELS} ariaLabel="날씨 이야기 카드 목록">
        {[
          renderQuestionsCard(),
          renderDateWeatherCard(),
          renderWeatherBattleCard(),
          renderHistoricalRecordsStoryCard(),
        ]}
      </CardCarousel>
    </div>
  );
};
