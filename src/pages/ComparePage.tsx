import React from 'react';
import type { BasisId } from '../types/api';
import type { BottomSheetDetailPayload } from '../types/viewmodel';
import { BASIS_OPTIONS, getStationById } from '../api/endpoints';
import {
  useRtRegionsQuery,
  useRtNowQuery,
  useStatsYearlyQuery,
  useStatsRegionQuery,
  useRtLifeQuery,
  useRtRecordsQuery,
  useRtSeasonsQuery,
} from '../hooks/useWeatherQueries';
import {
  mapApiNowToDomain,
  formatTemp,
  formatRainfall,
  formatWindSpeed,
  isValidNumber,
} from '../api/mappers';
import { CardCarousel } from '../components/common/CardCarousel';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { ComparisonCard } from '../components/cards/ComparisonCard';
import { RecordCard } from '../components/cards/RecordCard';

interface ComparePageProps {
  stationId: string;
  basis: BasisId;
  onChangeBasis: (basis: BasisId) => void;
  onSelectStation: (stationId: string) => void;
  onOpenDetail: (detail: BottomSheetDetailPayload) => void;
}

const COMPARE_CARD_LABELS = [
  '한눈에 보기',
  '과거 평균 비교',
  '연도별 비교',
  '지역별 비교',
  '생활 속 날씨',
  '날씨 기록',
];

export const ComparePage: React.FC<ComparePageProps> = ({
  stationId,
  basis,
  onChangeBasis,
  onSelectStation,
  onOpenDetail,
}) => {
  const station = getStationById(stationId);

  const regionsQuery = useRtRegionsQuery(true);
  const nowQuery = useRtNowQuery(stationId, true);
  const yearlyQuery = useStatsYearlyQuery(stationId, 'ta_avg', true);
  const regionStatsQuery = useStatsRegionQuery('108,159,184', true);
  const lifeQuery = useRtLifeQuery(stationId, true);
  const recordsQuery = useRtRecordsQuery(stationId, true);
  const seasonsQuery = useRtSeasonsQuery(stationId, basis, true);

  const renderNationalOverviewCard = () => {
    if (regionsQuery.isLoading) return <LoadingSkeleton label="전국 8개 관측지점 현황을 불러오는 중입니다…" />;
    if (regionsQuery.isError || !regionsQuery.data) return <ErrorState title="전국 관측지점 비교를 불러오지 못했어요" onRetry={() => regionsQuery.refetch()} />;

    const raw = regionsQuery.data.data;
    const rows = raw.rows || [];
    const maxTa = raw.rankings?.maxTa;
    const minTa = raw.rankings?.minTa;

    return (
      <ComparisonCard
        badgeText="한눈에 보기"
        title={`지금 전국은 · ${maxTa?.name || '제주'} 가장 따뜻 · ${minTa?.name || '인천'} 가장 선선`}
        summary="전국 8개 공식 관측지점의 현재 기온과 평소 대비 기온 편차입니다. 지점을 누르면 해당 지역으로 전환됩니다."
        provenance={{ kind: 'obs', sourceName: '기상청 초단기실황 · ASOS 8대 지점 비교', referenceTime: raw.asOf || '최신 정시' }}
        rows={rows.slice(0, 5).map((r) => ({
          id: String(r.id),
          title: `${r.name} (${r.id})`,
          subtitle: r.summary || `습도 ${r.hm ?? '-'}% · 풍속 ${formatWindSpeed(r.ws)}`,
          primaryText: formatTemp(r.ta),
          secondaryText: isValidNumber(r.diff) ? `평소 ${formatTemp(r.diff, true)}` : undefined,
          badgeText: String(r.id) === stationId ? '현재 선택' : undefined,
          onSelect: () => onSelectStation(String(r.id)),
        }))}
        detail={{
          id: 'compare-national-all',
          categoryBadge: '전국 8대 관측지점',
          title: '전국 관측지점 실시간 기온 및 과거 평균 대비 편차',
          subtitle: raw.note || '같은 실황 시각 기준 8개 지점 비교',
          provenance: { kind: 'obs', sourceName: '기상청 초단기실황 vs ASOS 정시 관측', referenceTime: raw.asOf || '' },
          tableRows: rows.map((r) => ({
            label: `${r.name}(${r.id})`,
            col1: formatTemp(r.ta),
            col2: `편차 ${formatTemp(r.diff, true)}`,
            highlight: String(r.id) === stationId,
          })),
          explanationBody: ['공통 최신 정시의 지점별 (초단기실황 − 1990~2025 같은 시기·시각 평균) 차이를 계산합니다.'],
        }}
        onOpenDetail={onOpenDetail}
      />
    );
  };

  const renderPastBaselineCard = () => {
    if (nowQuery.isLoading) return <LoadingSkeleton label="과거 평균 비교 데이터를 불러오는 중입니다…" />;
    if (nowQuery.isError || !nowQuery.data) return <ErrorState title="과거 평균 비교를 불러오지 못했어요" onRetry={() => nowQuery.refetch()} />;

    const domain = mapApiNowToDomain(nowQuery.data.data, nowQuery.data.isDevFallback);
    const activeDist = domain.distributions[basis];
    const basisMeta = BASIS_OPTIONS.find((b) => b.id === basis)!;

    return (
      <ComparisonCard
        badgeText={basisMeta.label}
        title={`${station.name} 지금 기온의 ${basisMeta.label} 분포 위치`}
        summary={activeDist.summary || `${activeDist.periodLabel} 같은 시기·시각 평균 대비 ${formatTemp(activeDist.diff, true)} 차이입니다.`}
        provenance={{ kind: 'stats', sourceName: `ASOS 정시 관측 (${activeDist.periodLabel})`, referenceTime: `표본 ${activeDist.sampleCount ?? '-'}개` }}
        metrics={[
          { label: `${basisMeta.label} 평균`, valueText: formatTemp(activeDist.mean), subText: `지금 ${formatTemp(activeDist.diff, true)}`, isMissing: !isValidNumber(activeDist.mean), highlight: 'warm' },
          { label: '보통 범위(10~90%)', valueText: isValidNumber(activeDist.p10) && isValidNumber(activeDist.p90) ? `${activeDist.p10}~${activeDist.p90}℃` : '자료 없음', isMissing: !isValidNumber(activeDist.p10) },
          { label: '역대 순위', valueText: isValidNumber(activeDist.rank) ? `상위 ${activeDist.rank}위` : '자료 없음', isMissing: !isValidNumber(activeDist.rank) },
        ]}
        detail={{
          id: `compare-dist-${stationId}-${basis}`,
          categoryBadge: `${basisMeta.label} 분포`,
          title: `${station.name} 같은 시기·시각 분포에서 지금 위치`,
          subtitle: `${activeDist.periodLabel} 정시 관측 분포와 보통 범위(10~90%) 비교`,
          provenance: { kind: 'stats', sourceName: '기상청 ASOS 시간자료', referenceTime: activeDist.periodLabel },
          distribution: activeDist,
          explanationBody: ['백분위와 순위는 유효 표본이 60개 이상일 때만 계산합니다.'],
        }}
        onOpenDetail={onOpenDetail}
      />
    );
  };

  const renderYearlyCompareCard = () => {
    if (yearlyQuery.isLoading) return <LoadingSkeleton label="1990년 이후 연도별 기온 추이를 불러오는 중입니다…" />;
    if (yearlyQuery.isError || !yearlyQuery.data) return <ErrorState title="연도별 비교 데이터를 불러오지 못했어요" onRetry={() => yearlyQuery.refetch()} />;

    const raw = yearlyQuery.data.data;
    const rows = raw.rows || [];
    const recentRows = [...rows].slice(-5).reverse();

    return (
      <ComparisonCard
        badgeText="연도별 비교"
        title={`${station.name} 1990년 이후 연도별 같은 시기 기온 변화`}
        summary="해마다 같은 시기의 평균기온이 어떻게 달라졌는지 연도별 관측값으로 비교합니다."
        provenance={{ kind: 'stats', sourceName: raw.source || '기상청 ASOS 공식 일자료', referenceTime: '1990~2025' }}
        rows={recentRows.map((r) => ({
          id: String(r.year),
          title: `${r.year}년`,
          subtitle: `관측 ${r.obs ?? 31}/${r.days ?? 31}일`,
          primaryText: formatTemp(r.value),
        }))}
        detail={{
          id: `compare-yearly-${stationId}`,
          categoryBadge: '연도별 추이 그래프',
          title: `${station.name} 연도별 기온 추이`,
          subtitle: '1990년부터 최근 완료 연도까지의 관측 추이입니다.',
          provenance: { kind: 'stats', sourceName: 'ASOS 공식 일자료', referenceTime: '1990~2025년' },
          chartSeries: {
            type: 'yearly-bars',
            unit: '℃',
            points: rows.map((r) => ({ label: String(r.year).slice(2) + '년', primaryValue: r.value, kind: 'obs' })),
          },
          explanationBody: ['기상청 ASOS 공식 일자료를 기준으로 연도별 같은 기간의 평균을 계산합니다.'],
        }}
        onOpenDetail={onOpenDetail}
      />
    );
  };

  const renderRegionStatsCard = () => {
    if (regionStatsQuery.isLoading) return <LoadingSkeleton label="지역별 기후 변화 비교표를 불러오는 중입니다…" />;
    if (regionStatsQuery.isError || !regionStatsQuery.data) return <ErrorState title="지역별 비교 데이터를 불러오지 못했어요" onRetry={() => regionStatsQuery.refetch()} />;

    const raw = regionStatsQuery.data.data;
    const tableRows = raw.table?.rows || [];

    return (
      <ComparisonCard
        badgeText="지역별 비교"
        title="서울 · 부산 · 제주 — 1990년대 대비 최근 10년 기후 비교"
        summary="주요 권역 관측지점별로 1990~1999년 평균과 최근 완료된 10년(2016~2025) 평균을 비교합니다."
        provenance={{ kind: 'stats', sourceName: raw.source || 'ASOS 공식 일자료', referenceTime: '1990~2025' }}
        rows={tableRows.map((r, idx) => ({
          id: `reg-row-${idx}`,
          title: String(r.metric || `항목 ${idx + 1}`),
          subtitle: `부산 ${r.m159 ?? '-'}${r.unit ?? ''} (${r.d159 ?? '-'}) · 제주 ${r.m184 ?? '-'}${r.unit ?? ''} (${r.d184 ?? '-'})`,
          primaryText: `서울 ${r.m108 ?? '-'}${r.unit ?? ''}`,
          secondaryText: `90년대 대비 ${r.d108 ?? '-'}${r.unit ?? ''}`,
        }))}
        onOpenDetail={onOpenDetail}
      />
    );
  };

  const renderLifeWeatherCard = () => {
    if (lifeQuery.isLoading) return <LoadingSkeleton label="생활 속 날씨 지수를 불러오는 중입니다…" />;
    if (lifeQuery.isError || !lifeQuery.data) return <ErrorState title="생활 속 날씨를 불러오지 못했어요" onRetry={() => lifeQuery.refetch()} />;

    const raw = lifeQuery.data.data;
    const items = raw.items || [];

    return (
      <ComparisonCard
        badgeText="생활 속 날씨"
        title={`${station.name} 오늘·내일 생활 속 날씨와 활동 지수`}
        summary="실황과 단기예보를 결합해 산책·빨래·세차·수면 쾌적도와 출퇴근 시나리오를 안내합니다."
        provenance={{ kind: 'mix', sourceName: '초단기실황 + 단기예보 생활 규칙', referenceTime: raw.now || '최신 발표' }}
        rows={items.map((item) => ({
          id: item.id,
          title: item.name,
          subtitle: item.comment,
          primaryText: item.level,
          secondaryText: item.valueText,
        }))}
        onOpenDetail={onOpenDetail}
      />
    );
  };

  const renderRecordsAndSeasonsCard = () => {
    if (recordsQuery.isLoading || seasonsQuery.isLoading) return <LoadingSkeleton label="기상 기록과 계절 신호를 불러오는 중입니다…" />;
    if (recordsQuery.isError || !recordsQuery.data) return <ErrorState title="날씨 기록을 불러오지 못했어요" onRetry={() => recordsQuery.refetch()} />;

    const recRaw = recordsQuery.data.data;
    const events = seasonsQuery.data?.data.events || [];
    const cal = recRaw.rainCalendar30d;

    const recordItems = [
      ...(recRaw.days || []).map((d) => ({
        id: d.id,
        title: d.title,
        valueText: `${d.value ?? '-'}${d.unit}`,
        dateText: d.date,
        subNote: d.note,
      })),
      ...events.slice(0, 2).map((ev) => ({
        id: ev.id,
        title: `계절 신호 · ${ev.name}`,
        valueText: ev.actualDate || '미발생',
        dateText: `평균 ${ev.historicalAvgDate || '-'}`,
        subNote: ev.status,
      })),
    ];

    return (
      <RecordCard
        title={`${station.name} 날씨 기록 · 계절 신호 · 30일 비 달력`}
        subtitle="1990년 이후 극값 기록과 첫 30℃·첫 영하 등 계절 신호, 최근 30일 강수 현황입니다."
        provenance={{ kind: 'stats', sourceName: '기상청 ASOS 공식 일자료 (1990~2025)', referenceTime: '어제까지 집계' }}
        records={recordItems}
        rainCalendarSummary={
          cal
            ? {
                rainyDays: cal.rainyDays,
                dryDays: cal.dryDays,
                missingDays: cal.missingDays,
                totalMmText: formatRainfall(cal.totalMm),
                lastRainText: cal.lastRainDate ? `마지막 비 ${cal.lastRainDate}` : `${cal.dryStreakDays}일째 비 없음`,
              }
            : undefined
        }
        onOpenDetail={onOpenDetail}
      />
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 rounded-2xl border border-inal-border bg-inal-surface px-3 py-2 shadow-sm">
        <span className="text-[11px] font-bold text-inal-textMuted">비교 기준</span>
        <div className="flex items-center gap-1" role="group" aria-label="과거 비교 기준 기간 선택">
          {BASIS_OPTIONS.map((opt) => {
            const active = basis === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeBasis(opt.id)}
                className={`rounded-xl px-2.5 py-1.5 text-xs font-bold transition ${
                  active ? 'bg-inal-accent text-white shadow-sm' : 'bg-inal-surfaceSubtle text-inal-textMuted hover:text-inal-text'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <CardCarousel cardLabels={COMPARE_CARD_LABELS} ariaLabel="과거 및 지역 비교 카드 목록">
        {[
          renderNationalOverviewCard(),
          renderPastBaselineCard(),
          renderYearlyCompareCard(),
          renderRegionStatsCard(),
          renderLifeWeatherCard(),
          renderRecordsAndSeasonsCard(),
        ]}
      </CardCarousel>
    </div>
  );
};
