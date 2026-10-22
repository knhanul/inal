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
  const yearlyQuery = useStatsYearlyQuery(stationId, 'avg_temp', true);
  const regionStatsQuery = useStatsRegionQuery('108,159,184', true);
  const lifeQuery = useRtLifeQuery(stationId, true);
  const recordsQuery = useRtRecordsQuery(stationId, true);
  const seasonsQuery = useRtSeasonsQuery(stationId, basis, true);

  const renderNationalOverviewCard = () => {
    if (regionsQuery.isLoading) return <LoadingSkeleton label="전국 8개 관측지점 현황을 불러오는 중입니다…" />;
    if (regionsQuery.isError || !regionsQuery.data) return <ErrorState title="전국 관측지점 비교를 불러오지 못했어요" onRetry={() => regionsQuery.refetch()} />;

    const raw = regionsQuery.data.data;
    const rows = (raw.rows || []).map((r) => {
      const rAny = r as unknown as {
        temp?: number | null;
        diffs?: Partial<Record<BasisId, number | null>>;
        means?: Partial<Record<BasisId, number | null>>;
        pcts?: Partial<Record<BasisId, number | null>>;
      };
      const taVal = isValidNumber(r.ta) ? r.ta : isValidNumber(rAny.temp) ? rAny.temp : null;
      const diffVal = isValidNumber(r.diff)
        ? r.diff
        : isValidNumber(rAny.diffs?.[basis])
        ? rAny.diffs![basis]!
        : isValidNumber(rAny.diffs?.all)
        ? rAny.diffs!.all!
        : null;
      const meanVal = isValidNumber(rAny.means?.[basis]) ? rAny.means![basis]! : isValidNumber(rAny.means?.all) ? rAny.means!.all! : null;
      const pctVal = isValidNumber(rAny.pcts?.[basis]) ? rAny.pcts![basis]! : isValidNumber(r.percentile) ? r.percentile : null;
      return {
        ...r,
        ta: taVal,
        diff: diffVal,
        mean: meanVal,
        pct: pctVal,
      };
    });
    const validTempRows = rows.filter((r) => isValidNumber(r.ta));
    const computedMax = validTempRows.length > 0 ? [...validTempRows].sort((a, b) => (b.ta ?? 0) - (a.ta ?? 0))[0] : undefined;
    const computedMin = validTempRows.length > 0 ? [...validTempRows].sort((a, b) => (a.ta ?? 0) - (b.ta ?? 0))[0] : undefined;
    const maxTaName = raw.rankings?.maxTa?.name || computedMax?.name || '제주';
    const minTaName = raw.rankings?.minTa?.name || computedMin?.name || '인천';
    const refTime = raw.asOf || raw.time || '최신 정시';

    return (
      <ComparisonCard
        badgeText="한눈에 보기"
        title={`지금 전국은 · ${maxTaName} 가장 따뜻 · ${minTaName} 가장 선선`}
        summary="전국 8개 공식 관측지점의 현재 기온과 평소 대비 기온 편차입니다. 지점을 누르면 해당 지역으로 전환됩니다."
        provenance={{ kind: 'obs', sourceName: '기상청 초단기실황 · ASOS 8대 지점 비교', referenceTime: refTime }}
        rows={rows.slice(0, 5).map((r) => ({
          id: String(r.id),
          title: `${r.name} (${r.id})`,
          subtitle:
            r.summary ||
            (isValidNumber(r.mean)
              ? `이맘때 평균 ${formatTemp(r.mean)}${isValidNumber(r.pct) ? ` · 백분위 ${Math.round(r.pct!)}%` : ''}`
              : `습도 ${r.hm ?? '-'}% · 풍속 ${formatWindSpeed(r.ws)}`),
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
          provenance: { kind: 'obs', sourceName: '기상청 초단기실황 vs ASOS 정시 관측', referenceTime: refTime },
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
    const rawAny = raw as unknown as {
      metrics?: Array<{
        metric?: { id?: string; label?: string; unit?: string };
        stations?: Array<{
          station_id: string;
          mean?: number | null;
          delta?: { delta?: number | null; recent?: { mean?: number | null } };
        }>;
      }>;
    };
    const tableRows = raw.table?.rows || [];
    const mappedRows =
      tableRows.length > 0
        ? tableRows.map((r, idx) => ({
            id: `reg-row-${idx}`,
            title: String(r.metric || `항목 ${idx + 1}`),
            subtitle: `부산 ${r.m159 ?? '-'}${r.unit ?? ''} (${r.d159 ?? '-'}) · 제주 ${r.m184 ?? '-'}${r.unit ?? ''} (${r.d184 ?? '-'})`,
            primaryText: `서울 ${r.m108 ?? '-'}${r.unit ?? ''}`,
            secondaryText: `90년대 대비 ${r.d108 ?? '-'}${r.unit ?? ''}`,
          }))
        : (rawAny.metrics || []).slice(0, 5).map((m, idx) => {
            const unit = m.metric?.unit || '';
            const findStn = (sid: string) => m.stations?.find((s) => s.station_id === sid);
            const s108 = findStn('108');
            const s159 = findStn('159');
            const s184 = findStn('184');
            const fmtVal = (s: typeof s108) => {
              const v = s?.delta?.recent?.mean ?? s?.mean;
              return isValidNumber(v) ? `${Math.round(v * 10) / 10}${unit}` : '-';
            };
            const fmtDelta = (s: typeof s108) => {
              const d = s?.delta?.delta;
              if (!isValidNumber(d)) return '-';
              const r = Math.round(d * 10) / 10;
              return `${r > 0 ? '+' : ''}${r}${unit}`;
            };
            return {
              id: m.metric?.id || `reg-m-${idx}`,
              title: m.metric?.label || `항목 ${idx + 1}`,
              subtitle: `부산 ${fmtVal(s159)} (${fmtDelta(s159)}) · 제주 ${fmtVal(s184)} (${fmtDelta(s184)})`,
              primaryText: `서울 ${fmtVal(s108)}`,
              secondaryText: `90년대 대비 ${fmtDelta(s108)}`,
            };
          });

    return (
      <ComparisonCard
        badgeText="지역별 비교"
        title="서울 · 부산 · 제주 — 1990년대 대비 최근 10년 기후 비교"
        summary="주요 권역 관측지점별로 1990~1999년 평균과 최근 완료된 10년(2016~2025) 평균을 비교합니다."
        provenance={{ kind: 'stats', sourceName: raw.source || 'ASOS 공식 일자료', referenceTime: '1990~2025' }}
        rows={mappedRows}
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
        summary="실황과 단기예보를 결합해 출퇴근·산책·외출 시간대별 체감과 과거 평균 차이를 안내합니다."
        provenance={{ kind: 'mix', sourceName: '초단기실황 + 단기예보 생활 규칙', referenceTime: raw.now || '최신 발표' }}
        rows={items.map((item) => {
          const itemAny = item as unknown as {
            q?: string;
            answer?: string;
            value?: number | string | null;
            unit?: string;
            kind?: string;
            basis?: string;
            diffLevel?: { phrase?: string };
          };
          return {
            id: item.id,
            title: item.name || itemAny.q || '생활 날씨',
            subtitle: item.comment || itemAny.answer || itemAny.basis || '',
            primaryText: item.level || itemAny.diffLevel?.phrase || itemAny.kind || '-',
            secondaryText:
              item.valueText ||
              (itemAny.value !== undefined && itemAny.value !== null ? `${itemAny.value}${itemAny.unit || ''}` : undefined),
          };
        })}
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

    const mappedRecDays = (recRaw.days || []).flatMap((d, idx) => {
      const dAny = d as unknown as {
        kind?: string;
        max?: number | null;
        min?: number | null;
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
            valueText: `${d.value ?? '-'}${d.unit}`,
            dateText: d.date,
            subNote: d.note,
          },
        ];
      }
      const p = dAny.periods?.find((x) => x.id === basis) || dAny.periods?.[0];
      if (!p) return [];
      const out = [];
      if (idx === 0 && p.recMax?.value !== undefined) {
        out.push({
          id: `rec-max-${d.date}`,
          title: `이맘때 역대 최고기온 (${dAny.kind || d.date})`,
          valueText: formatTemp(p.recMax.value),
          dateText: p.recMax.date || d.date,
          subNote: isValidNumber(dAny.max) ? `오늘 예보 최고 ${formatTemp(dAny.max)}` : undefined,
        });
      }
      if (idx === 0 && p.recMin?.value !== undefined) {
        out.push({
          id: `rec-min-${d.date}`,
          title: `이맘때 역대 최저기온 (${dAny.kind || d.date})`,
          valueText: formatTemp(p.recMin.value),
          dateText: p.recMin.date || d.date,
          subNote: isValidNumber(dAny.min) ? `오늘 예보 최저 ${formatTemp(dAny.min)}` : undefined,
        });
      }
      return out;
    });

    const mappedEvents = events.slice(0, 3).map((ev) => {
      const evAny = ev as unknown as {
        label?: string;
        current?: { date?: string | null; value?: number | null };
        periods?: Array<{ id: string; range?: string; hitSeasons?: number; completeSeasons?: number }>;
      };
      const p = evAny.periods?.find((x) => x.id === basis) || evAny.periods?.[0];
      const titleText = ev.name || evAny.label || ev.id;
      const actualText = ev.actualDate || evAny.current?.date || '아직 미발생';
      const dateText = ev.historicalAvgDate
        ? `평균 ${ev.historicalAvgDate}`
        : p?.hitSeasons !== undefined && p?.completeSeasons !== undefined
        ? `${p.range || '기준'} 중 ${p.hitSeasons}/${p.completeSeasons}해 발생`
        : '';
      const subText =
        ev.status ||
        (isValidNumber(evAny.current?.value) ? `관측값 ${evAny.current!.value}℃` : undefined);
      return {
        id: ev.id,
        title: `계절 신호 · ${titleText}`,
        valueText: actualText,
        dateText,
        subNote: subText,
      };
    });

    const recordItems = [...mappedRecDays, ...mappedEvents];

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
