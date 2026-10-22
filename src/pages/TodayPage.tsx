import React, { useState } from 'react';
import type { BasisId } from '../types/api';
import type { BottomSheetDetailPayload } from '../types/viewmodel';
import {
  useRtNowQuery,
  useRtTodayQuery,
  useRtForecastQuery,
  useRtStoriesQuery,
  useRtSimilarQuery,
  usePrefetchAdjacentCards,
} from '../hooks/useWeatherQueries';
import {
  mapApiNowToDomain,
  mapDomainToHeroViewModel,
  mapApiStoriesToViewModels,
  mapForecastHoursToTimeline,
  mapTodayHourlySeries,
  extractReleaseTime,
  formatTemp,
  formatPercent,
  formatRainfall,
  formatWindSpeed,
  isValidNumber,
} from '../api/mappers';
import { CardCarousel } from '../components/common/CardCarousel';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { WeatherHeroCard } from '../components/cards/WeatherHeroCard';
import { StoryCard } from '../components/cards/StoryCard';
import { ForecastCard } from '../components/cards/ForecastCard';
import { ComparisonCard } from '../components/cards/ComparisonCard';

interface TodayPageProps {
  stationId: string;
  basis: BasisId;
  onOpenDetail: (detail: BottomSheetDetailPayload) => void;
}

const TODAY_CARD_LABELS = [
  '지금 날씨',
  '오늘의 이야기',
  '12시간·옷차림',
  '과거 평균 비교',
  '닮은 과거 날',
];

export const TodayPage: React.FC<TodayPageProps> = ({ stationId, basis, onOpenDetail }) => {
  const [selectedStoryIdx, setSelectedStoryIdx] = useState(0);
  const { prefetchTodayAdjacent } = usePrefetchAdjacentCards(stationId);

  const nowQuery = useRtNowQuery(stationId, true);
  const todayQuery = useRtTodayQuery(stationId, true);
  const storiesQuery = useRtStoriesQuery(stationId, true);
  const forecastQuery = useRtForecastQuery(stationId, true);
  const similarQuery = useRtSimilarQuery(stationId, true);

  const renderHeroSlide = () => {
    if (nowQuery.isLoading) return <LoadingSkeleton label="현재 실황과 과거 분포를 불러오는 중입니다…" />;
    if (nowQuery.isError || !nowQuery.data) {
      return (
        <ErrorState
          title="현재 날씨를 불러오지 못했어요"
          message={nowQuery.error instanceof Error ? nowQuery.error.message : undefined}
          onRetry={() => nowQuery.refetch()}
        />
      );
    }
    const domain = mapApiNowToDomain(nowQuery.data.data, nowQuery.data.isDevFallback);
    const heroVm = mapDomainToHeroViewModel(domain, basis);
    return <WeatherHeroCard vm={heroVm} onOpenDetail={onOpenDetail} />;
  };

  const renderStorySlide = () => {
    if (storiesQuery.isLoading) return <LoadingSkeleton label="오늘의 날씨 이야기를 선별하는 중입니다…" />;
    if (storiesQuery.isError) {
      return <ErrorState title="오늘의 날씨 이야기를 불러오지 못했어요" onRetry={() => storiesQuery.refetch()} />;
    }
    const stories = mapApiStoriesToViewModels(storiesQuery.data?.data, storiesQuery.data?.isDevFallback);
    if (stories.length === 0) {
      return <EmptyState title="오늘 선별된 날씨 이야기가 없습니다" description="이례성 기준을 충족하는 기상 변화가 집계되면 자동으로 이야기가 생성됩니다." />;
    }
    const safeIdx = Math.min(selectedStoryIdx, stories.length - 1);
    const activeStory = stories[safeIdx];

    return (
      <StoryCard story={activeStory} indexLabel={`자동 선별 ${safeIdx + 1}/${stories.length}`} onOpenDetail={onOpenDetail}>
        {stories.length > 1 && (
          <div className="space-y-1.5" data-no-carousel-swipe="true">
            <span className="text-[11px] font-semibold text-inal-textMuted">오늘의 다른 이야기 골라 보기</span>
            <div className="grid grid-cols-2 gap-1.5">
              {stories.map((st, idx) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSelectedStoryIdx(idx)}
                  className={`rounded-xl border px-2.5 py-2 text-left text-[11px] transition ${
                    idx === safeIdx ? 'border-inal-accent bg-inal-accentSoft/70 font-bold text-inal-text' : 'border-inal-border bg-inal-surfaceSubtle/50 text-inal-textMuted'
                  }`}
                >
                  <span className="block truncate">{idx + 1}. {st.badgeText}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </StoryCard>
    );
  };

  const renderForecast12hSlide = () => {
    if (forecastQuery.isLoading || todayQuery.isLoading) return <LoadingSkeleton label="12시간 예보와 시간별 흐름을 불러오는 중입니다…" />;
    if (forecastQuery.isError) return <ErrorState title="12시간 예보를 불러오지 못했어요" onRetry={() => forecastQuery.refetch()} />;

    const slots12h = mapForecastHoursToTimeline(forecastQuery.data?.data, 12);
    const todayRaw = todayQuery.data?.data;
    const hourlySeries = mapTodayHourlySeries(todayRaw);
    const releaseBase =
      extractReleaseTime(forecastQuery.data?.data.releases?.ultra) ||
      extractReleaseTime(forecastQuery.data?.data.releases?.vilage) ||
      '최신 예보 발표';

    const detailPayload: BottomSheetDetailPayload = {
      id: `today-12h-${stationId}`,
      categoryBadge: '실황 + 예보 시계열',
      title: '오늘 시간별 기온 흐름과 옷차림 기준',
      subtitle: todayRaw?.summary?.headline || '관측된 시각까지는 실황으로, 이후 시각은 초단기·단기예보로 구분해 표시합니다.',
      provenance: { kind: 'mix', sourceName: '기상청 초단기실황 · 초단기/단기예보', referenceTime: releaseBase, note: todayRaw?.grid?.note },
      chartSeries: { type: 'hourly-obs-fcst', unit: '℃', points: hourlySeries.filter((_, i) => i % 2 === 0) },
      explanationTitle: '옷차림과 시계열은 어떻게 구성했나요?',
      explanationBody: [
        '관측과 예보는 서로 다른 자료이므로 하나로 이어 그리지 않고 구분합니다.',
        '옷차림은 구간 내 가장 추운 시각 기온으로 겉옷을, 가장 따뜻한 시각 기온으로 안에 입을 옷을 고른 참고용 가이드입니다.',
      ],
    };

    return (
      <ForecastCard
        title="앞으로 12시간 예보와 옷차림"
        subtitle={todayRaw?.summary?.headline || '시간대별 기온·강수확률·바람 변화와 추천 옷차림을 한눈에 확인하세요.'}
        provenance={{ kind: 'fcst', sourceName: '초단기·단기예보', referenceTime: releaseBase }}
        hourlySlots={slots12h}
        outfitSegments={todayRaw?.summary?.segments}
        detail={detailPayload}
        onOpenDetail={onOpenDetail}
      />
    );
  };

  const renderBaselineCompareSlide = () => {
    if (nowQuery.isLoading) return <LoadingSkeleton label="과거 기준 기간별 평균을 비교하는 중입니다…" />;
    if (nowQuery.isError || !nowQuery.data) return <ErrorState title="과거 평균 비교 데이터를 불러오지 못했어요" onRetry={() => nowQuery.refetch()} />;

    const domain = mapApiNowToDomain(nowQuery.data.data, nowQuery.data.isDevFallback);
    const dAll = domain.distributions.all;
    const d10 = domain.distributions.r10;
    const d5 = domain.distributions.r5;

    return (
      <ComparisonCard
        badgeText="3대 기준 평균 비교"
        title="지금 날씨는 과거 3개 기준과 얼마나 다를까요?"
        summary={`지금 ${formatTemp(domain.temperature)}를 1990년 이후·최근 10년·최근 5년 같은 시기·시각 평균과 견주어 봅니다.`}
        provenance={{ kind: 'stats', sourceName: '초단기실황 vs ASOS 정시 관측', referenceTime: domain.observedAt }}
        rows={[
          { id: 'basis-all', title: '1990년 이후 평균 (1990~2025)', subtitle: `보통 범위 ${formatTemp(dAll.p10)} ~ ${formatTemp(dAll.p90)}`, primaryText: `평균 ${formatTemp(dAll.mean)}`, secondaryText: `지금 ${formatTemp(dAll.diff, true)}`, badgeText: basis === 'all' ? '선택 기준' : undefined },
          { id: 'basis-r10', title: '최근 10년 평균 (2016~2025)', subtitle: `보통 범위 ${formatTemp(d10.p10)} ~ ${formatTemp(d10.p90)}`, primaryText: `평균 ${formatTemp(d10.mean)}`, secondaryText: `지금 ${formatTemp(d10.diff, true)}`, badgeText: basis === 'r10' ? '선택 기준' : undefined },
          { id: 'basis-r5', title: '최근 5년 평균 (2021~2025)', subtitle: `보통 범위 ${formatTemp(d5.p10)} ~ ${formatTemp(d5.p90)}`, primaryText: `평균 ${formatTemp(d5.mean)}`, secondaryText: `지금 ${formatTemp(d5.diff, true)}`, badgeText: basis === 'r5' ? '선택 기준' : undefined },
        ]}
        detail={{
          id: `today-baseline-${stationId}`,
          categoryBadge: '3대 기준 비교',
          title: `${domain.stationName} 기온·습도·강수·바람 기준별 비교`,
          subtitle: '1990년 이후 · 최근 10년 · 최근 5년 같은 시기·시각 평균과의 차이',
          provenance: { kind: 'stats', sourceName: '기상청 ASOS 시간·일 관측 직접 계산', referenceTime: '1990~2025년 기준' },
          distribution: domain.distributions[basis],
          tableRows: [
            { label: '현재 기온', col1: formatTemp(domain.temperature), col2: `1990~ 평균 ${formatTemp(dAll.mean)} (${formatTemp(dAll.diff, true)})`, highlight: true },
            { label: '습도', col1: formatPercent(domain.humidity), col2: `1990~ 평균 ${formatPercent(domain.secondaryComparison.humidityMean.all)}` },
            { label: '1시간 강수량', col1: formatRainfall(domain.rainfall1h), col2: `1990~ 평균 ${formatRainfall(domain.secondaryComparison.rainfallMean.all)}` },
            { label: '풍속', col1: formatWindSpeed(domain.windSpeed), col2: `1990~ 평균 ${formatWindSpeed(domain.secondaryComparison.windSpeedMean.all)}` },
          ],
          explanationBody: [
            "'1990년 이후 평균'은 이날이 ASOS 관측으로 직접 계산한 값이며 기상청 공식 30년 기후평년값이 아닙니다.",
            '결측은 0으로 넣지 않습니다.',
          ],
        }}
        onOpenDetail={onOpenDetail}
      />
    );
  };

  const renderSimilarPastSlide = () => {
    if (similarQuery.isLoading) return <LoadingSkeleton label="기온 흐름이 닮은 과거 날짜를 찾는 중입니다…" />;
    if (similarQuery.isError) return <ErrorState title="비슷했던 과거 날씨를 불러오지 못했어요" onRetry={() => similarQuery.refetch()} />;

    const simRaw = similarQuery.data?.data as unknown as {
      matches?: Array<{ date: string; similarityPercent?: number; weatherSummary?: string; taMin?: number | null; taMax?: number | null; taDiff?: number | null }>;
      top?: Array<{ date: string; score?: number; rmse?: number; ta?: Array<number | null> }>;
    };
    const rawMatches = simRaw?.matches || [];
    const rawTop = simRaw?.top || [];
    const matches =
      rawMatches.length > 0
        ? rawMatches.map((m) => ({
            date: m.date,
            similarityPercent: m.similarityPercent ?? 90,
            weatherSummary: m.weatherSummary || '시간별 기온 패턴 유사',
            taMin: m.taMin ?? null,
            taMax: m.taMax ?? null,
            taDiff: m.taDiff ?? null,
          }))
        : rawTop.map((t) => {
            const validTa = Array.isArray(t.ta) ? t.ta.filter(isValidNumber) : [];
            const rmse = isValidNumber(t.rmse) ? t.rmse : isValidNumber(t.score) ? t.score : 1;
            const simPct = Math.max(50, Math.min(99, Math.round(100 - rmse * 8)));
            return {
              date: t.date,
              similarityPercent: simPct,
              weatherSummary: `시간별 기온차 평균(RMSE) ${Math.round(rmse * 10) / 10}℃`,
              taMin: validTa.length > 0 ? Math.min(...validTa) : null,
              taMax: validTa.length > 0 ? Math.max(...validTa) : null,
              taDiff: rmse,
            };
          });

    if (matches.length === 0) {
      return <EmptyState title="닮은 과거 날씨를 아직 찾지 못했어요" description="충분한 시간별 관측 표본이 모이면 유사한 기온 흐름을 보인 과거 날짜를 안내합니다." />;
    }

    return (
      <ComparisonCard
        badgeText="닮은 날 찾기"
        title="오늘과 기온 흐름이 가장 비슷했던 과거의 날"
        summary="1990년 이후 관측 기록 중에서 오늘의 시간별 기온·습도 변화와 가장 닮은 날들입니다."
        provenance={{ kind: 'stats', sourceName: '기상청 ASOS 시간자료 (1990~2025)', referenceTime: `상위 ${matches.length}일 매칭` }}
        rows={matches.slice(0, 3).map((m, idx) => ({
          id: m.date,
          title: `${idx + 1}위 · ${m.date}`,
          subtitle: m.weatherSummary,
          primaryText: `유사도 ${m.similarityPercent}%`,
          secondaryText: isValidNumber(m.taMin) && isValidNumber(m.taMax) ? `${m.taMin}~${m.taMax}℃` : `편차 ${formatTemp(m.taDiff, true)}`,
        }))}
        detail={{
          id: `today-similar-${stationId}`,
          categoryBadge: '과거 유사일 매칭',
          title: '오늘과 기온·습도 흐름이 가장 닮았던 날',
          subtitle: '1990년 이후 ASOS 시간자료에서 패턴이 유사했던 날을 찾았습니다.',
          provenance: { kind: 'stats', sourceName: 'ASOS 시간자료 (1990~2025)', referenceTime: '오늘 기온 흐름 기준' },
          tableRows: matches.map((m) => ({
            label: m.date,
            col1: `유사도 ${m.similarityPercent}%`,
            col2: isValidNumber(m.taDiff) ? `기온차 ${formatTemp(m.taDiff, true)}` : '-',
          })),
          explanationBody: ['오늘의 시간대별 기온·습도 곡선과 과거 같은 계절 날짜들의 시간별 관측 곡선 간 유사도를 계산합니다.'],
        }}
        onOpenDetail={onOpenDetail}
      />
    );
  };

  return (
    <div className="space-y-3">
      <CardCarousel
        cardLabels={TODAY_CARD_LABELS}
        onIndexChange={(idx) => prefetchTodayAdjacent(idx)}
        ariaLabel="오늘의 날씨 카드 탐색"
      >
        {[
          renderHeroSlide(),
          renderStorySlide(),
          renderForecast12hSlide(),
          renderBaselineCompareSlide(),
          renderSimilarPastSlide(),
        ]}
      </CardCarousel>
    </div>
  );
};
