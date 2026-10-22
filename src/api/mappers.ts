import type {
  ApiRtNowResponse,
  ApiRtTodayResponse,
  ApiRtForecastResponse,
  ApiRtStoriesResponse,
  BasisId,
  ApiBasisStat,
  ApiCompareField,
  ApiReleaseInfo,
} from '../types/api';
import type {
  CurrentWeatherDomain,
  DistributionBand,
  WeatherConditionTheme,
} from '../types/domain';
import type {
  HeroCardViewModel,
  StoryCardViewModel,
  HourlyTimelineSlotViewModel,
  DailyForecastItemViewModel,
} from '../types/viewmodel';

export const MISSING_TEXT = '자료 없음';

export function isValidNumber(val: unknown): val is number {
  return typeof val === 'number' && !Number.isNaN(val) && Number.isFinite(val);
}

export function formatTemp(val: number | null | undefined, showPlus = false): string {
  if (!isValidNumber(val)) return MISSING_TEXT;
  const rounded = Math.round(val * 10) / 10;
  const prefix = showPlus && rounded > 0 ? '+' : '';
  return `${prefix}${rounded}℃`;
}

export function formatPercent(val: number | null | undefined): string {
  if (!isValidNumber(val)) return MISSING_TEXT;
  return `${Math.round(val)}%`;
}

export function formatWindSpeed(val: number | null | undefined): string {
  if (!isValidNumber(val)) return MISSING_TEXT;
  return `${Math.round(val * 10) / 10}m/s`;
}

export function formatRainfall(val: number | null | undefined): string {
  if (!isValidNumber(val)) return MISSING_TEXT;
  if (val === 0) return '0mm';
  return `${Math.round(val * 10) / 10}mm`;
}

export function degreeToKoreanWindDir(vec: number | null | undefined): string | null {
  if (!isValidNumber(vec)) return null;
  const dirs = ['북', '북북동', '북동', '동북동', '동', '동남동', '남동', '남남동', '남', '남남서', '남서', '서남서', '서', '서북서', '북서', '북북서'];
  const index = Math.round(((vec % 360) < 0 ? (vec % 360) + 360 : vec % 360) / 22.5) % 16;
  return `${dirs[index]}풍`;
}

export function resolveConditionTheme(
  pty: string | number | null | undefined,
  sky: string | number | null | undefined,
  hour?: number
): WeatherConditionTheme {
  const ptyStr = String(pty ?? '');
  const skyStr = String(sky ?? '');
  if (ptyStr.includes('눈') || pty === 3 || pty === 7) return 'snow';
  if (ptyStr.includes('비') || ptyStr.includes('소나기') || pty === 1 || pty === 2 || pty === 4 || pty === 5 || pty === 6) return 'rain';
  if (skyStr.includes('흐림') || skyStr.includes('구름') || sky === 3 || sky === 4) return 'cloudy';
  if (typeof hour === 'number' && (hour < 6 || hour >= 20)) return 'night';
  return 'sunny';
}

export function resolveConditionLabel(
  pty: string | null | undefined,
  sky: string | null | undefined
): string {
  const hasPty = pty && pty !== '없음' && pty !== '0';
  if (hasPty && sky) return `${sky} · ${pty}`;
  if (hasPty) return pty;
  if (sky) return sky;
  return '하늘 상태 미수집';
}

export function extractReleaseTime(rel: ApiReleaseInfo | undefined, fallback = ''): string {
  if (!rel) return fallback;
  if (typeof rel === 'string') return rel;
  if (typeof rel === 'object' && typeof rel.base === 'string') return rel.base;
  return fallback;
}

export function findBasisStat(stat: ApiCompareField, basisId: BasisId = 'all'): ApiBasisStat | null {
  if (!stat) return null;
  if (Array.isArray(stat)) {
    return stat.find((item) => item.id === basisId) || stat[0] || null;
  }
  return stat.byBasis?.[basisId] || stat;
}

function mapSingleDistribution(
  basisId: BasisId,
  defaultPeriod: string,
  stat: ApiCompareField
): DistributionBand {
  const sub = findBasisStat(stat, basisId);
  const singleStat = !Array.isArray(stat) ? stat : null;
  const minObj = typeof sub?.min === 'object' && sub?.min !== null ? sub.min : null;
  const maxObj = typeof sub?.max === 'object' && sub?.max !== null ? sub.max : null;

  let meanVal = sub?.mean ?? null;
  let diffVal = sub?.diff ?? null;
  if (singleStat && basisId === 'r10' && !singleStat.byBasis) {
    if (isValidNumber(singleStat.r10Mean)) meanVal = singleStat.r10Mean;
    if (isValidNumber(singleStat.r10Diff)) diffVal = singleStat.r10Diff;
  } else if (singleStat && basisId === 'r5' && !singleStat.byBasis) {
    if (isValidNumber(singleStat.r5Mean)) meanVal = singleStat.r5Mean;
    if (isValidNumber(singleStat.r5Diff)) diffVal = singleStat.r5Diff;
  }

  const rankVal = isValidNumber(sub?.rank)
    ? sub!.rank
    : isValidNumber(sub?.rankHigh)
    ? sub!.rankHigh
    : null;
  const sampleVal = isValidNumber(sub?.total)
    ? sub!.total
    : isValidNumber(sub?.samples)
    ? sub!.samples
    : isValidNumber(sub?.sampleCount)
    ? sub!.sampleCount
    : null;

  const parseYear = (obj: { year?: number; date?: string } | null) => {
    if (!obj) return undefined;
    if (typeof obj.year === 'number') return obj.year;
    if (typeof obj.date === 'string' && obj.date.length >= 4) {
      const y = Number(obj.date.slice(0, 4));
      return Number.isNaN(y) ? undefined : y;
    }
    return undefined;
  };

  return {
    basisId,
    periodLabel: sub?.period || (sub?.range ? `${sub.range} (${sub.label || basisId})` : defaultPeriod),
    mean: isValidNumber(meanVal) ? meanVal : null,
    diff: isValidNumber(diffVal) ? diffVal : null,
    p10: isValidNumber(sub?.p10) ? sub!.p10! : null,
    p90: isValidNumber(sub?.p90) ? sub!.p90! : null,
    min: isValidNumber(minObj?.value) ? minObj!.value : typeof sub?.min === 'number' ? sub.min : null,
    minYear: parseYear(minObj),
    max: isValidNumber(maxObj?.value) ? maxObj!.value : typeof sub?.max === 'number' ? sub.max : null,
    maxYear: parseYear(maxObj),
    percentile: isValidNumber(sub?.percentile) ? sub!.percentile! : null,
    rank: rankVal,
    sampleCount: sampleVal,
    summary: sub?.summary || singleStat?.summary || null,
  };
}

function extractMetricMeansByBasis(stat: ApiCompareField): Record<BasisId, number | null> {
  if (!stat) return { all: null, r10: null, r5: null };
  if (Array.isArray(stat)) {
    const getMean = (id: BasisId) => {
      const found = stat.find((s) => s.id === id);
      return isValidNumber(found?.mean) ? found!.mean : null;
    };
    const allM = getMean('all');
    return {
      all: allM,
      r10: getMean('r10') ?? allM,
      r5: getMean('r5') ?? allM,
    };
  }
  const allM = isValidNumber(stat.mean) ? stat.mean : null;
  return {
    all: allM,
    r10: isValidNumber(stat.r10Mean) ? stat.r10Mean! : allM,
    r5: isValidNumber(stat.r5Mean) ? stat.r5Mean! : allM,
  };
}

export function mapApiNowToDomain(raw: ApiRtNowResponse, isDevFallback = false): CurrentWeatherDomain {
  const vals = raw.current?.values || { ta: null, hm: null, rn1: null, ws: null, vec: null, windDir: null, pty: null, sky: null };
  const taStat = raw.current?.compare?.ta;
  const hmStat = raw.current?.compare?.hm;
  const rnStat = raw.current?.compare?.rn;
  const wsStat = raw.current?.compare?.ws;

  const windDirText = vals.windDir
    ? vals.windDir.endsWith('풍')
      ? vals.windDir
      : `${vals.windDir}풍`
    : degreeToKoreanWindDir(vals.vec);

  const freshnessLabel =
    raw.current?.freshness?.label ||
    raw.current?.freshness?.text ||
    raw.current?.time ||
    raw.now ||
    '시각 확인 중';

  return {
    stationId: raw.station?.id || '108',
    stationName: raw.station?.name || '서울',
    observedAt: freshnessLabel,
    temperature: isValidNumber(vals.ta) ? vals.ta : null,
    humidity: isValidNumber(vals.hm) ? vals.hm : null,
    rainfall1h: isValidNumber(vals.rn1) ? vals.rn1 : null,
    windSpeed: isValidNumber(vals.ws) ? vals.ws : null,
    windDirectionText: windDirText,
    skyText: vals.sky || null,
    precipTypeText: vals.pty || null,
    conditionTheme: resolveConditionTheme(vals.pty, vals.sky, raw.current?.hour),
    todayMaxTemp: isValidNumber(raw.day?.max?.value) ? raw.day!.max!.value : null,
    todayMaxProvenance: {
      kind: raw.day?.max?.kind === 'obs' ? 'obs' : 'fcst',
      sourceName: raw.day?.max?.source || '단기예보',
      referenceTime: raw.day?.max?.base || '',
      isDevFallback,
    },
    todayMinTemp: isValidNumber(raw.day?.min?.value) ? raw.day!.min!.value : null,
    todayMinProvenance: {
      kind: raw.day?.min?.kind === 'obs' ? 'obs' : 'fcst',
      sourceName: raw.day?.min?.source || '단기예보',
      referenceTime: raw.day?.min?.base || '',
      isDevFallback,
    },
    provenance: {
      kind: raw.current?.kind === 'fcst' ? 'fcst' : 'obs',
      sourceName: raw.current?.source || '기상청 초단기실황',
      referenceTime: raw.current?.freshness?.base || raw.current?.time || raw.now,
      note: raw.method?.note,
      isDevFallback,
    },
    distributions: {
      all: mapSingleDistribution('all', '1990~2025 (1990년 이후)', taStat),
      r10: mapSingleDistribution('r10', '2016~2025 (최근 10년)', taStat),
      r5: mapSingleDistribution('r5', '2021~2025 (최근 5년)', taStat),
    },
    secondaryComparison: {
      humidityMean: extractMetricMeansByBasis(hmStat),
      rainfallMean: extractMetricMeansByBasis(rnStat),
      windSpeedMean: extractMetricMeansByBasis(wsStat),
    },
  };
}

export function mapDomainToHeroViewModel(domain: CurrentWeatherDomain, basis: BasisId): HeroCardViewModel {
  const dist = domain.distributions[basis] || domain.distributions.all;
  const conditionLabel = resolveConditionLabel(domain.precipTypeText, domain.skyText);

  let anomalyHeadline = '과거 같은 시각 평균과 비교 중';
  if (isValidNumber(dist.diff)) {
    const absDiff = Math.abs(Math.round(dist.diff * 10) / 10);
    if (absDiff < 0.5) anomalyHeadline = '이맘때 평소와 비슷한 기온이에요';
    else if (dist.diff > 0) anomalyHeadline = `평소 이 시각보다 ${absDiff}℃ 따뜻한 편이에요`;
    else anomalyHeadline = `평소 이 시각보다 ${absDiff}℃ 선선한 편이에요`;
  } else {
    anomalyHeadline = '이 시각 비교 데이터 없음';
  }

  const anomalySubline =
    dist.summary ||
    (isValidNumber(dist.mean) ? `${dist.periodLabel} 같은 시기·시각 평균 ${formatTemp(dist.mean)}` : '기준 기간 표본 확인 중');

  const windValueText =
    domain.windDirectionText && isValidNumber(domain.windSpeed)
      ? `${domain.windDirectionText} ${formatWindSpeed(domain.windSpeed)}`
      : formatWindSpeed(domain.windSpeed);

  const rainValueText =
    domain.precipTypeText && domain.precipTypeText !== '없음'
      ? `${domain.precipTypeText} (${formatRainfall(domain.rainfall1h)})`
      : formatRainfall(domain.rainfall1h);

  return {
    stationId: domain.stationId,
    stationName: domain.stationName,
    theme: domain.conditionTheme,
    temperatureText: formatTemp(domain.temperature),
    isTempMissing: !isValidNumber(domain.temperature),
    conditionLabel,
    anomalyHeadline,
    anomalySubline,
    todayHighText: formatTemp(domain.todayMaxTemp),
    todayLowText: formatTemp(domain.todayMinTemp),
    metrics: [
      {
        label: '습도',
        valueText: formatPercent(domain.humidity),
        subText: isValidNumber(domain.secondaryComparison.humidityMean[basis])
          ? `평균 ${formatPercent(domain.secondaryComparison.humidityMean[basis])}`
          : undefined,
        isMissing: !isValidNumber(domain.humidity),
      },
      {
        label: '바람',
        valueText: windValueText,
        subText: isValidNumber(domain.secondaryComparison.windSpeedMean[basis])
          ? `평균 ${formatWindSpeed(domain.secondaryComparison.windSpeedMean[basis])}`
          : undefined,
        isMissing: !isValidNumber(domain.windSpeed),
      },
      {
        label: '1시간 강수',
        valueText: rainValueText,
        subText: domain.precipTypeText || '강수형태 없음',
        isMissing: !isValidNumber(domain.rainfall1h),
      },
    ],
    distribution: dist,
    provenance: domain.provenance,
    detail: {
      id: `hero-detail-${domain.stationId}`,
      categoryBadge: '실황 · 과거 분포 비교',
      title: `${domain.stationName} 지금 ${formatTemp(domain.temperature)} 상세 비교`,
      subtitle: anomalyHeadline,
      provenance: domain.provenance,
      distribution: dist,
      allDistributions: domain.distributions,
      tableRows: [
        {
          label: '1990년 이후 (1990~2025)',
          col1: `평균 ${formatTemp(domain.distributions.all.mean)}`,
          col2: `편차 ${formatTemp(domain.distributions.all.diff, true)}`,
          col3: isValidNumber(domain.distributions.all.rank) ? `상위 ${domain.distributions.all.rank}위/${domain.distributions.all.sampleCount ?? '-'}` : '-',
          highlight: basis === 'all',
        },
        {
          label: '최근 10년 (2016~2025)',
          col1: `평균 ${formatTemp(domain.distributions.r10.mean)}`,
          col2: `편차 ${formatTemp(domain.distributions.r10.diff, true)}`,
          col3: isValidNumber(domain.distributions.r10.rank) ? `상위 ${domain.distributions.r10.rank}위/${domain.distributions.r10.sampleCount ?? '-'}` : '-',
          highlight: basis === 'r10',
        },
        {
          label: '최근 5년 (2021~2025)',
          col1: `평균 ${formatTemp(domain.distributions.r5.mean)}`,
          col2: `편차 ${formatTemp(domain.distributions.r5.diff, true)}`,
          col3: isValidNumber(domain.distributions.r5.rank) ? `상위 ${domain.distributions.r5.rank}위/${domain.distributions.r5.sampleCount ?? '-'}` : '-',
          highlight: basis === 'r5',
        },
      ],
      explanationTitle: '어떻게 계산했나요?',
      explanationBody: [
        '같은 월일 ±7일(15일 창), 같은 정시 관측값을 기준으로 해마다 평균을 먼저 낸 뒤 해끼리 같은 무게로 평균합니다.',
        '보통 범위(10~90% 백분위)를 벗어나면 평소보다 뚜렷하게 따뜻하거나 쌀쌀한 날로 안내합니다.',
      ],
      cautionNote:
        domain.provenance.note ||
        '현재 실황은 기상청 초단기실황(동네예보 5km 격자) 값이며, 과거 분포는 ASOS 관측소 정시 관측값이라 위치가 조금 다를 수 있습니다.',
    },
  };
}

export function mapApiStoriesToViewModels(
  raw: ApiRtStoriesResponse | undefined,
  isDevFallback = false
): StoryCardViewModel[] {
  if (!raw?.stories || !Array.isArray(raw.stories)) return [];
  const rawAny = raw as unknown as Record<string, unknown>;
  const refBasis = (typeof raw.basis === 'string' && raw.basis) || (typeof rawAny.basisName === 'string' && rawAny.basisName) || '1990년 이후 기준';

  return raw.stories.map((st, idx) => {
    const stAny = st as unknown as Record<string, unknown>;
    const rawKind = String(st.kind || '');
    const kind: 'obs' | 'fcst' | 'mix' =
      rawKind === 'fcst' || rawKind.includes('예보')
        ? rawKind.includes('실황') || rawKind.includes('관측')
          ? 'mix'
          : 'fcst'
        : rawKind === 'mix'
        ? 'mix'
        : 'obs';
    const badgeMap = { obs: '관측 이야기', fcst: '예보 이야기', mix: '관측+예보 혼합' };
    const id = st.id || (typeof stAny.ruleId === 'string' ? stAny.ruleId : `story-${idx}`);
    const title = st.title || '오늘의 날씨 이야기';
    const summary = st.content || (typeof stAny.text === 'string' ? stAny.text : '');
    const badgeText = st.category || (typeof stAny.phenomenon === 'string' ? stAny.phenomenon : badgeMap[kind]);
    const evidence = st.evidence || (typeof stAny.basis === 'string' ? stAny.basis : '기상청 관측·예보 및 ASOS 통계');
    const highlightValue = typeof stAny.value === 'string' ? stAny.value : undefined;

    return {
      id,
      badgeText,
      kind,
      title,
      highlightValue,
      summary,
      tags: Array.isArray(st.tags) ? st.tags : [],
      provenance: {
        kind,
        sourceName: evidence,
        referenceTime: (typeof stAny.asOf === 'string' && stAny.asOf) || refBasis,
        isDevFallback,
      },
      detail: {
        id: `story-detail-${id}`,
        categoryBadge: badgeMap[kind],
        title,
        subtitle: summary,
        provenance: {
          kind,
          sourceName: evidence,
          referenceTime: refBasis,
          isDevFallback,
        },
        explanationTitle: '어떻게 계산하고 선별했나요?',
        explanationBody: [
          st.howCalculated || '실제 관측·예보 값에 정해 둔 통계 규칙을 적용해 계산했으며, 임의로 생성된 문장이 아닙니다.',
          '후보 이야기 중 이례성(35%) + 생활 관련성(35%) + 시점(15%) + 새 정보(15%) 점수로 상위 4개를 자동 선별합니다.',
        ],
        cautionNote: evidence ? `근거 자료: ${evidence}` : undefined,
      },
    };
  });
}

export function mapForecastHoursToTimeline(
  raw: ApiRtForecastResponse | undefined,
  limit = 12
): HourlyTimelineSlotViewModel[] {
  if (!raw?.hours || !Array.isArray(raw.hours)) return [];
  return raw.hours.slice(0, limit).map((item) => {
    const hourNum = typeof item.hour === 'number' ? item.hour : Number(item.time?.slice(11, 13) || 0);
    const ptyLabel = item.ptyName || (typeof item.pty === 'string' ? item.pty : null);
    const skyLabel = item.skyName || (typeof item.sky === 'string' ? item.sky : null);
    const condTheme = resolveConditionTheme(ptyLabel ?? item.pty, skyLabel ?? item.sky, hourNum);
    const hasPty = ptyLabel && ptyLabel !== '없음' && ptyLabel !== '0';
    return {
      timeLabel: `${hourNum}시`,
      hour: hourNum,
      tempText: formatTemp(item.ta),
      tempValue: isValidNumber(item.ta) ? item.ta : null,
      popText: formatPercent(item.pop),
      popValue: isValidNumber(item.pop) ? item.pop : null,
      windText: formatWindSpeed(item.ws),
      conditionIcon: condTheme,
      conditionText: hasPty ? ptyLabel! : skyLabel || '예보',
      kind: 'fcst',
    };
  });
}

const KOR_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function mapForecastDaysToViewModels(
  raw: ApiRtForecastResponse | undefined
): DailyForecastItemViewModel[] {
  const weekArr = Array.isArray(raw?.week) ? raw!.week : raw?.week?.days;
  const list = raw?.days && raw.days.length > 0 ? raw.days : weekArr || [];
  if (!Array.isArray(list)) return [];
  return list.map((d, idx) => {
    const mmdd = d.date && d.date.length >= 10 ? `${Number(d.date.slice(5, 7))}/${Number(d.date.slice(8, 10))}` : d.date;
    let dow = d.dayOfWeek || '';
    if (!dow && d.date) {
      const dt = new Date(`${d.date}T00:00:00+09:00`);
      if (!Number.isNaN(dt.getTime())) dow = KOR_WEEKDAYS[dt.getDay()];
    }
    const minVal = isValidNumber(d.tmN) ? d.tmN : isValidNumber(d.min) ? d.min! : null;
    const maxVal = isValidNumber(d.tmX) ? d.tmX : isValidNumber(d.max) ? d.max! : null;
    const popVal = isValidNumber(d.popMax) ? d.popMax : isValidNumber(d.pop) ? d.pop! : null;
    const skyLabel = d.skyName || d.sky || d.wf || null;
    const ptyLabel = d.ptyName || null;
    const condTheme = resolveConditionTheme(ptyLabel || d.ptyCode, skyLabel || d.skyCode, 12);
    const hasPty = ptyLabel && ptyLabel !== '없음';
    const cmpMaxAll = findBasisStat(d.maxCmp, 'all');
    const cmpMinAll = findBasisStat(d.minCmp, 'all');
    const normalMax = isValidNumber(d.normalMax) ? d.normalMax! : isValidNumber(cmpMaxAll?.mean) ? cmpMaxAll!.mean : null;
    const normalMin = isValidNumber(d.normalMin) ? d.normalMin! : isValidNumber(cmpMinAll?.mean) ? cmpMinAll!.mean : null;

    return {
      date: d.date,
      dateLabel: mmdd,
      dayOfWeek: idx === 0 ? '오늘' : idx === 1 ? '내일' : dow,
      isToday: idx === 0,
      minTempText: formatTemp(minVal),
      maxTempText: formatTemp(maxVal),
      minVal,
      maxVal,
      normalMinVal: normalMin,
      normalMaxVal: normalMax,
      popText: isValidNumber(popVal) ? `${Math.round(popVal)}%` : MISSING_TEXT,
      conditionIcon: condTheme,
      conditionText: hasPty ? ptyLabel! : skyLabel || MISSING_TEXT,
      sourceLabel: d.source || d.wxSource || d.maxSource || (idx < 3 ? '단기예보' : '중기예보'),
    };
  });
}

export function mapTodayHourlySeries(raw: ApiRtTodayResponse | undefined) {
  const list = raw?.hourly || raw?.hours || [];
  if (!Array.isArray(list)) return [];
  return list.map((h) => {
    const baseMean = isValidNumber(h.compare?.mean)
      ? h.compare!.mean
      : isValidNumber(h.base?.all)
      ? h.base!.all!
      : null;
    return {
      label: `${h.hour}시`,
      primaryValue: isValidNumber(h.obs) ? h.obs : isValidNumber(h.fcst) ? h.fcst : null,
      baselineValue: baseMean,
      kind: (isValidNumber(h.obs) ? 'obs' : 'fcst') as 'obs' | 'fcst',
      note: isValidNumber(h.obs) ? '실황 관측' : h.fcstSource ? `${h.fcstSource}` : '예보',
    };
  });
}
