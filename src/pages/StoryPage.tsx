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
import { formatTemp, formatRainfall, formatWindSpeed, formatPercent } from '../api/mappers';
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
  const [battleDate2] = useState('2024-10-22');

  const highlightsQuery = useStatsHighlightsQuery(stationId, true);
  const dateWeatherQuery = useStatsDateWeatherQuery(stationId, selectedMonth, selectedDay, true);
  const battleQuery = useStatsDateBattleQuery(stationId, battleDate1, battleDate2, true);
  const recordsQuery = useRtRecordsQuery(stationId, true);

  const renderQuestionsCard = () => {
    if (highlightsQuery.isLoading) return <LoadingSkeleton label="관측 통계로 답하는 질문 카드를 불러오는 중입니다…" />;
    if (highlightsQuery.isError || !highlightsQuery.data) return <ErrorState title="질문 카드를 불러오지 못했어요" onRetry={() => highlightsQuery.refetch()} />;

    const raw = highlightsQuery.data.data;
    const cards = raw.cards || [];
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
    const w = raw.weather;
    const hist = raw.historical || [];

    return (
      <ComparisonCard
        badgeText="내가 기억하는 이날"
        title={`${selectedMonth}월 ${selectedDay}일 ${station.name}에는 어떤 날씨가 많았을까?`}
        summary={w.typicalSummary}
        provenance={{ kind: 'stats', sourceName: '기상청 ASOS 공식 일자료 (/api/stats/date-weather)', referenceTime: `매년 ${selectedMonth}월 ${selectedDay}일` }}
        metrics={[
          { label: '이날 평균기온', valueText: formatTemp(w.taAvg), isMissing: w.taAvg === null, highlight: 'warm' },
          { label: '이날 최저평균', valueText: formatTemp(w.taMin), isMissing: w.taMin === null, highlight: 'cool' },
          { label: '비 왔던 해 비율', valueText: formatPercent(w.rainProbability), isMissing: w.rainProbability === null },
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
                <span className="font-bold tabular-nums text-inal-text">{h.year}년 · {h.summary || '맑음'}</span>
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
  };

  const renderHistoricalRecordsStoryCard = () => {
    const recDays = recordsQuery.data?.data.days || [];
    return (
      <ComparisonCard
        badgeText="흥미로운 기상 기록"
        title={`${station.name}의 10월, 가장 기억에 남는 극값 기록`}
        summary="1990년부터 쌓인 ASOS 관측 자료에서 이 시기에 기록된 역대 최고·최저 기온과 최다 강수 기록입니다."
        provenance={{ kind: 'stats', sourceName: '기상청 ASOS 공식 일자료 (1990~2025)', referenceTime: '36개 연도 관측 극값' }}
        rows={recDays.map((d) => ({
          id: d.id,
          title: d.title,
          subtitle: `${d.date} 관측`,
          primaryText: `${d.value ?? '-'}${d.unit}`,
        }))}
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
