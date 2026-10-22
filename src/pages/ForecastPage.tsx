import React, { useState } from 'react';
import type { BasisId } from '../types/api';
import type { BottomSheetDetailPayload } from '../types/viewmodel';
import {
  useRtForecastQuery,
  useRtForecastWindQuery,
  useRtNowQuery,
} from '../hooks/useWeatherQueries';
import {
  mapForecastHoursToTimeline,
  mapForecastDaysToViewModels,
  extractReleaseTime,
  findBasisStat,
  degreeToKoreanWindDir,
  formatTemp,
  formatWindSpeed,
  isValidNumber,
  MISSING_TEXT,
} from '../api/mappers';
import { getStationById } from '../api/endpoints';
import { CardCarousel } from '../components/common/CardCarousel';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { ForecastCard } from '../components/cards/ForecastCard';
import { ComparisonCard } from '../components/cards/ComparisonCard';

interface ForecastPageProps {
  stationId: string;
  basis: BasisId;
  onOpenDetail: (detail: BottomSheetDetailPayload) => void;
}

type ForecastSubMode = 'hourly' | 'daily';

export const ForecastPage: React.FC<ForecastPageProps> = ({ stationId, onOpenDetail }) => {
  const [subMode, setSubMode] = useState<ForecastSubMode>('hourly');
  const station = getStationById(stationId);

  const forecastQuery = useRtForecastQuery(stationId, true);
  const windQuery = useRtForecastWindQuery(stationId, subMode === 'hourly');
  const nowQuery = useRtNowQuery(stationId, subMode === 'daily');

  const fcstRaw = forecastQuery.data?.data;
  const releases = fcstRaw?.releases;

  const renderHourlyCards = () => {
    if (forecastQuery.isLoading) {
      return [<LoadingSkeleton key="h-1" label="시간별 예보를 불러오는 중입니다…" />];
    }
    if (forecastQuery.isError || !fcstRaw) {
      return [<ErrorState key="h-err" title="시간별 예보를 불러오지 못했어요" onRetry={() => forecastQuery.refetch()} />];
    }

    const slots12h = mapForecastHoursToTimeline(fcstRaw, 12);
    const slots72h = mapForecastHoursToTimeline(fcstRaw, 24);
    const windHours = windQuery.data?.data.hours || [];
    const ultraBase = extractReleaseTime(releases?.ultra);
    const vilageBase = extractReleaseTime(releases?.vilage);

    const detail12h: BottomSheetDetailPayload = {
      id: `fcst-12h-${stationId}`,
      categoryBadge: '12시간 집중 예보',
      title: `${station.name} 앞으로 12시간 기온·강수·바람`,
      subtitle: '가까운 시간은 초단기예보, 이후 시간은 단기예보를 결합해 보여줍니다.',
      provenance: { kind: 'fcst', sourceName: '기상청 초단기예보 · 단기예보', referenceTime: ultraBase || vilageBase || '최신 발표' },
      chartSeries: {
        type: 'hourly-obs-fcst',
        unit: '℃',
        points: slots12h.map((s) => ({ label: s.timeLabel, primaryValue: s.tempValue, kind: 'fcst' })),
      },
      tableRows: slots12h.map((s) => ({ label: s.timeLabel, col1: s.tempText, col2: `강수 ${s.popText}`, col3: `바람 ${s.windText}` })),
      explanationBody: [
        `초단기예보 발표: ${ultraBase || '확인 중'} / 단기예보 발표: ${vilageBase || '확인 중'}`,
      ],
    };

    return [
      <ForecastCard
        key="card-12h"
        title={`${station.name} 앞으로 12시간 예보`}
        subtitle="외출 전 꼭 확인해야 할 시간대별 기온·강수확률·풍속 흐름입니다."
        provenance={{ kind: 'fcst', sourceName: '초단기·단기예보', referenceTime: ultraBase || vilageBase || '' }}
        hourlySlots={slots12h}
        detail={detail12h}
        onOpenDetail={onOpenDetail}
      />,
      <ForecastCard
        key="card-72h"
        title="72시간(3일) 단기예보 흐름"
        subtitle="모레까지의 시간별 기온 변화와 비·눈 예보 구간을 카드로 넘겨 확인하세요."
        provenance={{ kind: 'fcst', sourceName: '기상청 단기예보', referenceTime: vilageBase || '하루 8회 발표' }}
        hourlySlots={slots72h}
        detail={detail12h}
        onOpenDetail={onOpenDetail}
      />,
      <ComparisonCard
        key="card-wind"
        badgeText="바람 예보"
        title={`${station.name} 시간별 바람(풍향·풍속) 예보`}
        summary="시간대별 풍향(16방위)과 풍속(m/s) 예보입니다. 5m/s 이상은 강풍 주의 구간입니다."
        provenance={{ kind: 'fcst', sourceName: '기상청 바람 예보 (/api/rt/forecast-wind)', referenceTime: windHours[0]?.base || '' }}
        rows={windHours.slice(0, 5).map((w, idx) => {
          const dir = degreeToKoreanWindDir(w.vec) || MISSING_TEXT;
          const hh = w.time ? `${Number(w.time.slice(11, 13))}시` : `+${idx + 1}시간`;
          const isStrong = isValidNumber(w.ws) && w.ws >= 5;
          return {
            id: `${w.time}-${idx}`,
            title: `${hh} · ${dir}`,
            subtitle: w.source || '단기예보',
            primaryText: formatWindSpeed(w.ws),
            secondaryText: isStrong ? '강풍 주의' : '보통 바람',
          };
        })}
        detail={detail12h}
        onOpenDetail={onOpenDetail}
      />,
    ];
  };

  const renderDailyCards = () => {
    if (forecastQuery.isLoading) {
      return [<LoadingSkeleton key="d-1" label="10일 일별 예보를 불러오는 중입니다…" />];
    }
    if (forecastQuery.isError || !fcstRaw) {
      return [<ErrorState key="d-err" title="일별 예보를 불러오지 못했어요" onRetry={() => forecastQuery.refetch()} />];
    }

    const dailyItems = mapForecastDaysToViewModels(fcstRaw);
    const firstHalf = dailyItems.slice(0, 5);
    const secondHalf = dailyItems.slice(5, 10);
    const dayMax = nowQuery.data?.data.day?.max;
    const dayMin = nowQuery.data?.data.day?.min;
    const dayMaxCmp = findBasisStat(dayMax?.compare, 'all');
    const dayMinCmp = findBasisStat(dayMin?.compare, 'all');
    const vilageBase = extractReleaseTime(releases?.vilage);
    const midBase = extractReleaseTime(releases?.mid) || extractReleaseTime(releases?.midTa);

    const detail10d: BottomSheetDetailPayload = {
      id: `fcst-10d-${stationId}`,
      categoryBadge: '단기 + 중기 10일 예보',
      title: `${station.name} 일별 최고·최저기온 및 예년 비교`,
      subtitle: '기존 Weather API가 실제 제공하는 일별 예보 기간과 평년 비교값만 표시합니다.',
      provenance: { kind: 'fcst', sourceName: '기상청 단기예보 + 중기예보', referenceTime: midBase || '' },
      tableRows: dailyItems.map((d) => ({
        label: `${d.dateLabel} (${d.dayOfWeek})`,
        col1: `${d.minTempText} / ${d.maxTempText}`,
        col2: `강수 ${d.popText}`,
        highlight: d.isToday,
      })),
      explanationBody: ['단기예보(오늘~3일 후)와 중기예보(4일~10일 후)를 결합하여 보여줍니다.'],
    };

    return [
      <ForecastCard
        key="daily-1-5"
        title={`${station.name} 이번 주 일별 예보 (1~${firstHalf.length}일)`}
        subtitle="날짜별 최저·최고기온, 강수확률 및 평년 기온과의 차이를 확인하세요."
        provenance={{ kind: 'fcst', sourceName: '단기·중기예보 결합', referenceTime: vilageBase || '최신 발표' }}
        dailyItems={firstHalf}
        detail={detail10d}
        onOpenDetail={onOpenDetail}
      />,
      <ForecastCard
        key="daily-6-10"
        title={`${station.name} 중기 일별 예보 (${firstHalf.length + 1}~${dailyItems.length}일)`}
        subtitle="기상청 중기예보가 제공하는 다음 주 기온 흐름과 강수 전망입니다."
        provenance={{ kind: 'fcst', sourceName: '기상청 중기예보', referenceTime: midBase || '하루 2회 발표' }}
        dailyItems={secondHalf}
        detail={detail10d}
        onOpenDetail={onOpenDetail}
      />,
      <ComparisonCard
        key="daily-normal-cmp"
        badgeText="예보 vs 예년 평균"
        title="오늘·내일 예보 기온은 예년 이맘때와 얼마나 다를까요?"
        summary="예보된 최고·최저기온을 1990~2025년 ASOS 공식 일자료 평균과 비교합니다."
        provenance={{ kind: 'mix', sourceName: '단기예보 + ASOS 일자료 평균', referenceTime: dayMax?.base || '' }}
        rows={[
          {
            id: 'cmp-max-all',
            title: '오늘 최고기온 예보 비교',
            subtitle: `1990~2025 평균 ${formatTemp(dayMaxCmp?.mean)}`,
            primaryText: `예보 ${formatTemp(dayMax?.value)}`,
            secondaryText: `평년 대비 ${formatTemp(dayMaxCmp?.diff, true)}`,
          },
          {
            id: 'cmp-min-all',
            title: '오늘 최저기온 예보 비교',
            subtitle: `1990~2025 평균 ${formatTemp(dayMinCmp?.mean)}`,
            primaryText: `예보 ${formatTemp(dayMin?.value)}`,
            secondaryText: `평년 대비 ${formatTemp(dayMinCmp?.diff, true)}`,
          },
        ]}
        detail={detail10d}
        onOpenDetail={onOpenDetail}
      />,
    ];
  };

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="예보 보기 방식 선택" className="grid grid-cols-2 gap-1.5 rounded-2xl border border-inal-border bg-inal-surface p-1 shadow-sm">
        <button
          type="button"
          role="tab"
          aria-selected={subMode === 'hourly'}
          onClick={() => setSubMode('hourly')}
          className={`touch-target rounded-xl text-xs font-bold transition ${
            subMode === 'hourly' ? 'bg-inal-accent text-white shadow-sm' : 'text-inal-textMuted hover:text-inal-text'
          }`}
        >
          시간별 예보 (12h · 72h · 바람)
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subMode === 'daily'}
          onClick={() => setSubMode('daily')}
          className={`touch-target rounded-xl text-xs font-bold transition ${
            subMode === 'daily' ? 'bg-inal-accent text-white shadow-sm' : 'text-inal-textMuted hover:text-inal-text'
          }`}
        >
          일별 예보 (10일 · 예년 비교)
        </button>
      </div>

      {subMode === 'hourly' ? (
        <CardCarousel key="carousel-hourly" cardLabels={['12시간 예보', '72시간 예보', '바람 예보']} ariaLabel="시간별 예보 카드 목록">
          {renderHourlyCards()}
        </CardCarousel>
      ) : (
        <CardCarousel key="carousel-daily" cardLabels={['1~5일 예보', '6~10일 중기예보', '예년과 비교']} ariaLabel="일별 예보 카드 목록">
          {renderDailyCards()}
        </CardCarousel>
      )}
    </div>
  );
};
