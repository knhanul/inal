import { getStationById, ASOS_STATIONS } from './endpoints';
import type {
  ApiRtNowResponse,
  ApiRtTodayResponse,
  ApiRtForecastResponse,
  ApiRtForecastWindResponse,
  ApiRtRegionsResponse,
  ApiRtRecordsResponse,
  ApiRtLifeResponse,
  ApiRtSimilarResponse,
  ApiRtStoriesResponse,
  ApiRtSeasonsResponse,
  ApiStatsYearlyResponse,
  ApiStatsRegionResponse,
  ApiStatsDateWeatherResponse,
  ApiStatsDateBattleResponse,
  ApiStatsHighlightsResponse,
  BasisId,
} from '../types/api';

const STATION_TEMP_OFFSETS: Record<string, number> = {
  '108': 0,
  '112': -0.8,
  '119': -0.5,
  '133': 0.3,
  '143': 1.1,
  '156': 0.9,
  '159': 2.2,
  '184': 3.4,
};

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

export function getDevFallbackNow(stationId: string): ApiRtNowResponse {
  const st = getStationById(stationId);
  const offset = STATION_TEMP_OFFSETS[st.id] ?? 0;
  const currentTa = round1(21.4 + offset);
  const meanAll = round1(14.8 + offset);
  const diffAll = round1(currentTa - meanAll);

  return {
    ok: true,
    now: '2026-10-22 17:00:00',
    date: '2026-10-22',
    station: { id: st.id, name: st.name },
    method: {
      windowDays: 7,
      rule: '같은 월일 ±7일(15일)·같은 정시, 해마다 평균을 먼저 낸 뒤 같은 무게로 평균',
      note: `기상청 초단기실황 동네예보 5km 격자(${st.gridNx},${st.gridNy}) vs ASOS 정시 관측`,
    },
    periods: { fromYear: 1990, toYear: 2025, count: 36 },
    current: {
      time: '2026-10-22 17:00:00',
      hour: 17,
      kind: 'obs',
      source: '기상청 초단기실황',
      freshness: {
        base: '2026-10-22 17:00',
        ageMinutes: 12,
        status: 'fresh',
        label: '17:00 실황 최신',
      },
      values: {
        ta: currentTa,
        hm: 50,
        rn1: 0,
        ws: 2.4,
        vec: 112,
        windDir: '동남동',
        pty: '없음',
        sky: '구름많음',
      },
      compare: {
        ta: {
          mean: meanAll,
          p10: round1(10.5 + offset),
          p25: round1(12.6 + offset),
          p50: round1(14.9 + offset),
          p75: round1(16.8 + offset),
          p90: round1(18.4 + offset),
          diff: diffAll,
          percentile: 99.2,
          zscore: 2.31,
          rank: 5,
          sampleCount: 540,
          min: { value: round1(5.2 + offset), year: 1999, date: '1999-10-16' },
          max: { value: round1(22.4 + offset), year: 1998, date: '1998-10-11' },
          label: `평소보다 ${diffAll > 0 ? `+${diffAll}` : diffAll}℃ 따뜻한 오후`,
          summary: `1990~2025 같은 시기 이 시각 540개 중 따뜻한 쪽 5위`,
          byBasis: {
            all: {
              period: '1990~2025',
              mean: meanAll,
              diff: diffAll,
              p10: round1(10.5 + offset),
              p90: round1(18.4 + offset),
              percentile: 99.2,
              rank: 5,
              total: 540,
            },
            r10: {
              period: '2016~2025',
              mean: round1(15.0 + offset),
              diff: round1(currentTa - (15.0 + offset)),
              p10: round1(10.0 + offset),
              p90: round1(18.8 + offset),
              percentile: 99.0,
              rank: 2,
              total: 150,
            },
            r5: {
              period: '2021~2025',
              mean: round1(15.1 + offset),
              diff: round1(currentTa - (15.1 + offset)),
              p10: round1(9.2 + offset),
              p90: round1(19.4 + offset),
              percentile: 99.3,
              rank: 1,
              total: 75,
            },
          },
        },
        hm: { mean: 64, diff: -14, r10Mean: 65, r5Mean: 70 },
        rn: { mean: 0.1, diff: -0.1, r10Mean: 0.1, r5Mean: 0.2 },
        ws: { mean: 1.8, diff: 0.6, r10Mean: 1.8, r5Mean: 2.0 },
      },
    },
    day: {
      max: {
        kind: 'fcst',
        source: '단기예보',
        base: '10-22 11:00 발표',
        value: round1(23.0 + offset),
        compare: {
          mean: round1(19.8 + offset),
          diff: 3.2,
          r10Mean: round1(20.1 + offset),
          r10Diff: 2.9,
          r5Mean: round1(19.6 + offset),
          r5Diff: 3.4,
        },
      },
      min: {
        kind: 'fcst',
        source: '단기예보',
        base: '10-22 02:00 발표',
        value: round1(12.0 + offset),
        compare: {
          mean: round1(9.8 + offset),
          diff: 2.2,
          r10Mean: round1(10.0 + offset),
          r10Diff: 2.0,
          r5Mean: round1(10.2 + offset),
          r5Diff: 1.8,
        },
      },
    },
  };
}

export function getDevFallbackToday(stationId: string): ApiRtTodayResponse {
  const st = getStationById(stationId);
  const offset = STATION_TEMP_OFFSETS[st.id] ?? 0;

  const baseCurve = [
    14.2, 13.8, 13.4, 13.0, 12.6, 12.3, 12.5, 13.4, 15.1, 17.0, 18.8, 20.1, 21.2, 22.1, 22.8, 22.4,
    21.8, 21.4, 20.2, 19.3, 18.5, 17.8, 17.2, 16.6,
  ];

  const hourly = baseCurve.map((val, hour) => {
    const temp = round1(val + offset);
    const mean = round1(val - 4.2 + offset);
    const isObserved = hour <= 17;
    return {
      hour,
      time: `${String(hour).padStart(2, '0')}:00`,
      obs: isObserved ? temp : null,
      fcst: isObserved ? null : temp,
      fcstSource: isObserved ? null : hour <= 21 ? '초단기예보' : '단기예보',
      fcstBase: isObserved ? null : '10-22 17:00 발표',
      compare: {
        mean,
        r10Mean: round1(mean + 0.3),
        r5Mean: round1(mean + 0.5),
        p10: round1(mean - 3.6),
        p90: round1(mean + 3.4),
        diff: round1(temp - mean),
      },
    };
  });

  return {
    ok: true,
    now: '2026-10-22 17:00:00',
    date: '2026-10-22',
    station: { id: st.id, name: st.name },
    grid: {
      nx: st.gridNx,
      ny: st.gridNy,
      note: `동네예보 5km 격자(${st.gridNx},${st.gridNy}) — ASOS 관측소 위치와 같지 않을 수 있습니다`,
    },
    hourly,
    summary: {
      headline: '오늘 뭐 입지? 얇은 가디건·긴팔 · 일교차 11℃, 겉옷 챙기세요',
      outfit: '얇은 가디건·긴팔 / 아침·밤 맨투맨·얇은 니트',
      tempRange: 11.0,
      rainNote: '내일 오전 7~9시 비 예보(강수확률 60%), 우산 참고용',
      segments: [
        {
          id: 'night',
          label: '밤 (오늘 21~6시)',
          hours: '21~06시',
          outer: '맨투맨·얇은 니트',
          inner: '얇은 가디건·긴팔',
          note: '벗고 입기 쉬운 겉옷',
          minTa: round1(16.0 + offset),
          maxTa: round1(20.2 + offset),
        },
        {
          id: 'commute-am',
          label: '출근 (내일 7~9시)',
          hours: '07~09시',
          outer: '맨투맨·얇은 니트',
          inner: '긴팔 셔츠',
          note: '우산 챙기기 (강수확률 60%)',
          minTa: round1(16.2 + offset),
          maxTa: round1(17.5 + offset),
        },
        {
          id: 'daytime',
          label: '낮 (내일 12~15시)',
          hours: '12~15시',
          outer: '얇은 가디건',
          inner: '긴팔 티셔츠',
          note: '바람 최대 4.8m/s',
          minTa: round1(19.5 + offset),
          maxTa: round1(21.4 + offset),
        },
        {
          id: 'commute-pm',
          label: '퇴근 (내일 18~20시)',
          hours: '18~20시',
          outer: '맨투맨·자켓',
          inner: '긴팔 니트',
          note: '해 진 뒤 기온 하강',
          minTa: round1(17.0 + offset),
          maxTa: round1(18.4 + offset),
        },
      ],
    },
  };
}

export function getDevFallbackForecast(stationId: string): ApiRtForecastResponse {
  const st = getStationById(stationId);
  const offset = STATION_TEMP_OFFSETS[st.id] ?? 0;

  const hours = Array.from({ length: 24 }, (_, idx) => {
    const h = (18 + idx) % 24;
    const isMorningRain = h >= 7 && h <= 9;
    const baseTa = 20.5 - Math.sin((idx / 24) * Math.PI * 2) * 3.8 + offset;
    return {
      time: `2026-10-${18 + idx >= 24 ? '23' : '22'} ${String(h).padStart(2, '0')}:00`,
      hour: h,
      ta: round1(baseTa),
      hm: isMorningRain ? 75 : 55,
      ws: isMorningRain ? 3.8 : 2.6,
      pcp: isMorningRain ? 1.2 : 0,
      pty: isMorningRain ? 1 : 0,
      pop: isMorningRain ? 60 : 20,
      sky: isMorningRain ? 4 : 3,
      source: idx < 4 ? '초단기예보' : '단기예보',
      base: '2026-10-22 17:00 발표',
      pcpText: isMorningRain ? '1mm 내외' : null,
      ptyName: isMorningRain ? '비' : '없음',
      skyName: isMorningRain ? '흐림' : idx % 3 === 0 ? '맑음' : '구름많음',
    };
  });

  const dayNames = ['목', '금', '토', '일', '월', '화', '수', '목', '금', '토'];
  const week = Array.from({ length: 10 }, (_, idx) => {
    const dayNum = 22 + idx;
    const dateStr = dayNum <= 31 ? `2026-10-${dayNum}` : `2026-11-0${dayNum - 31}`;
    const isRainy = idx === 1 || idx === 5;
    const normalMax = round1(19.5 - idx * 0.3 + offset);
    const normalMin = round1(9.4 - idx * 0.3 + offset);
    return {
      date: dateStr,
      dayOfWeek: dayNames[idx],
      tmX: round1(normalMax + (idx < 3 ? 3.1 : 1.2)),
      tmN: round1(normalMin + (idx < 3 ? 2.4 : 0.8)),
      popMax: isRainy ? 60 : idx === 2 ? 30 : 10,
      pcpSum: isRainy ? 4.5 : null,
      skyCode: isRainy ? 4 : idx % 2 === 0 ? 1 : 3,
      skyName: isRainy ? '흐리고 비' : idx % 2 === 0 ? '맑음' : '구름많음',
      ptyCode: isRainy ? 1 : 0,
      ptyName: isRainy ? '비' : '없음',
      isObserved: false,
      normalMax,
      normalMin,
      source: idx < 3 ? '단기예보' : '중기예보',
    };
  });

  return {
    ok: true,
    now: '2026-10-22 17:00:00',
    date: '2026-10-22',
    station: { id: st.id, name: st.name },
    releases: {
      ultra: '10-22 17:30 발표',
      vilage: '10-22 17:00 발표',
      mid: '10-22 06:00 발표',
    },
    hours,
    days: week.slice(0, 5),
    week,
  };
}

export function getDevFallbackForecastWind(stationId: string): ApiRtForecastWindResponse {
  const st = getStationById(stationId);
  const hours = Array.from({ length: 12 }, (_, idx) => {
    const h = (18 + idx) % 24;
    return {
      time: `2026-10-${18 + idx >= 24 ? '23' : '22'} ${String(h).padStart(2, '0')}:00:00`,
      vec: (110 + idx * 15) % 360,
      ws: round1(2.2 + (idx % 4) * 0.8),
      source: idx < 4 ? '초단기예보' : '단기예보',
      base: '202610221700',
    };
  });
  return {
    ok: true,
    station: { id: st.id, name: st.name },
    hours,
    note: '풍속 5m/s 이상 구간은 강풍 주의 구간으로 표시합니다.',
  };
}

export function getDevFallbackRegions(): ApiRtRegionsResponse {
  const rows = ASOS_STATIONS.map((s, idx) => {
    const offset = STATION_TEMP_OFFSETS[s.id] ?? 0;
    const ta = round1(21.4 + offset);
    const diff = round1(6.6 - idx * 0.4);
    return {
      id: s.id,
      name: s.name,
      category: s.regionGroup,
      lat: s.lat,
      lon: s.lon,
      ta,
      hm: 50 + (idx % 4) * 4,
      ws: round1(1.9 + (idx % 3) * 0.6),
      rn: 0,
      pty: '없음',
      diff,
      percentile: round1(99.2 - idx * 1.1),
      rank: idx + 1,
      summary: `평소보다 +${diff}℃ 따뜻함`,
    };
  });

  return {
    ok: true,
    asOf: '2026-10-22 17:00',
    periods: { from: 1990, to: 2025, count: 36, label: '1990~2025 같은 시기' },
    rows,
    rankings: {
      maxTa: { id: '184', name: '제주', value: 24.8 },
      minTa: { id: '112', name: '인천', value: 20.6 },
      maxRn: { id: '108', name: '서울', value: 0 },
      maxWs: { id: '184', name: '제주', value: 3.1 },
    },
    note: '같은 실황 시각 17:00 · 8개 관측지점 비교',
  };
}

export function getDevFallbackStories(stationId: string): ApiRtStoriesResponse {
  const st = getStationById(stationId);
  const offset = STATION_TEMP_OFFSETS[st.id] ?? 0;
  const currentTa = round1(21.4 + offset);
  const meanTa = round1(14.8 + offset);

  return {
    ok: true,
    station: { id: st.id, name: st.name },
    basis: '1990년 이후',
    totalCandidates: 13,
    stories: [
      {
        id: 'story-now-warm',
        title: `${st.name} 지금 ${currentTa}℃ — 같은 시각 평소보다 +6.6℃`,
        category: '기온 이례성',
        kind: 'obs',
        content: `17시 실황 ${currentTa}℃ — 1990~2025년 같은 시기(±7일) 같은 시각 평균 ${meanTa}℃, 백분위 99.2 (표본 540개 중 따뜻한 쪽 5위).`,
        howCalculated:
          '초단기실황 기온(격자) vs ASOS 정시 기온, 같은 월일 ±7일·같은 시각. 해마다 평균을 먼저 낸 뒤 같은 무게로 평균.',
        evidence: '초단기실황 2026-10-22 17:00 vs ASOS 정시 관측 (1990~2025)',
        tags: ['관측', '기온분포', '상위1%'],
      },
      {
        id: 'story-week-mix',
        title: '이번 주는 이맘때보다 +3.2℃ 따뜻한 흐름이 이어질 전망',
        category: '주간 흐름',
        kind: 'mix',
        content:
          '최근 관측 5일 + 향후 예보 2일의 최고·최저기온을 1990~2025년 같은 날 평균과 비교한 평균 차이 +3.2℃.',
        howCalculated: '지난 날 ASOS 공식 일자료, 오늘부터 단기·중기예보 결합.',
        evidence: '지난 날 ASOS 공식 일자료 + 단기·중기예보 결합',
        tags: ['혼합', '주간기온', '평년비교'],
      },
      {
        id: 'story-commute-rain',
        title: '내일 출근길(7~9시) 비 예보 — 우산 챙기세요',
        category: '생활·출근',
        kind: 'fcst',
        content:
          '출근길(7~9시) 강수형태 비 예보 시간: 7~8시·8~9시. 강수확률 최고 60%.',
        howCalculated: '출근(7~9시) 구간과 겹치는 예보 시간 중 강수형태 유무 확인.',
        evidence: '기상청 단기예보 2026-10-22 17:00 발표',
        tags: ['예보', '출근길', '우산'],
      },
      {
        id: 'story-region-anomaly',
        title: '전국 관측지점 8곳 중 7곳이 평소보다 3℃ 이상 높아요',
        category: '전국 비교',
        kind: 'obs',
        content:
          '17:00 기준 서울·인천·수원·대전·광주·부산·제주 7개 지점이 같은 시기·같은 시각 평균 대비 +3℃ 이상 높습니다.',
        howCalculated: '공통 최신 정시의 지점별 (실황 − 같은 시기 평균) 차이 비교.',
        evidence: '같은 실황 시각 17:00 · 8개 지점 동시 비교',
        tags: ['관측', '전국흐름'],
      },
    ],
  };
}

export function getDevFallbackSimilar(stationId: string): ApiRtSimilarResponse {
  const st = getStationById(stationId);
  return {
    ok: true,
    station: { id: st.id, name: st.name },
    day: 'today',
    source: 'ASOS 시간자료 (1990~2025)',
    kind: 'temperature-humidity-curve',
    matches: [
      {
        date: '1998-10-15',
        score: 96.4,
        similarityPercent: 96,
        taDiff: 0.4,
        hmDiff: -3,
        weatherSummary: '낮 최고 23.2℃로 포근하고 저녁까지 구름만 낀 가을날',
        taMax: 23.2,
        taMin: 12.8,
        rnDay: 0,
      },
      {
        date: '2017-10-10',
        score: 94.1,
        similarityPercent: 94,
        taDiff: -0.6,
        hmDiff: 4,
        weatherSummary: '일교차 11.5℃, 오후 햇살이 따뜻했던 날',
        taMax: 22.6,
        taMin: 11.1,
        rnDay: 0,
      },
      {
        date: '2023-10-18',
        score: 91.8,
        similarityPercent: 92,
        taDiff: 0.9,
        hmDiff: -5,
        weatherSummary: '평년보다 4℃ 이상 높았던 늦가을 포근한 오후',
        taMax: 22.1,
        taMin: 11.9,
        rnDay: 0,
      },
    ],
  };
}

export function getDevFallbackRecords(stationId: string): ApiRtRecordsResponse {
  const st = getStationById(stationId);
  return {
    ok: true,
    station: { id: st.id, name: st.name },
    now: '2026-10-22 17:00:00',
    periods: { from: 1990, to: 2025, count: 36 },
    now_rank: {
      ta: 21.4,
      rank: 5,
      total: 540,
      topPercentile: 99.2,
      label: '1990년 이후 같은 시기 이 시각 540개 중 따뜻한 쪽 5위',
    },
    rain1h: { value: 0, rank: null, historicalMax: 34.5, date: '2006-10-23' },
    rainCalendar30d: {
      rainyDays: 3,
      dryDays: 26,
      missingDays: 0,
      totalMm: 28.9,
      lastRainDate: '10월 13일',
      lastRainMm: 15.7,
      dryStreakDays: 3,
    },
    days: [
      { id: 'rec-max-ta', title: '10월 하순 역대 최고기온', metric: '일최고기온', value: 25.8, unit: '℃', date: '1998-10-11', year: 1998, rank: 1, note: 'ASOS 공식 일자료 기준 (1990~2025)' },
      { id: 'rec-min-ta', title: '10월 하순 역대 최저기온', metric: '일최저기온', value: 1.8, unit: '℃', date: '2002-10-28', year: 2002, rank: 1, note: 'ASOS 공식 일자료 기준 (1990~2025)' },
      { id: 'rec-max-rn', title: '10월 일강수량 최다 기록', metric: '일강수량', value: 68.5, unit: 'mm', date: '2006-10-23', year: 2006, rank: 1, note: '비 온 날(0.1mm 이상) 기준' },
    ],
    rule: 'ASOS 공식 일강수량 0.1mm 이상 = 비 온 날, 자료 없는 날은 따로(0으로 보지 않음)',
  };
}

export function getDevFallbackSeasons(stationId: string, basis: BasisId = 'all'): ApiRtSeasonsResponse {
  const st = getStationById(stationId);
  return {
    ok: true,
    station: { id: st.id, name: st.name },
    now: '2026-10-22',
    basisId: basis,
    events: [
      { id: 'first-30c', name: '첫 30℃ 이상', season: '여름 시작 신호', expectedDate: '06월 01일', actualDate: '05월 14일', diffDays: -18, status: '발생 완료 (평년보다 18일 빠름)', historicalAvgDate: basis === 'r5' ? '05월 24일' : '06월 01일', occurredSeasons: 36, totalSeasons: 36 },
      { id: 'latest-30c', name: '가장 최근 30℃', season: '늦더위 신호', expectedDate: '09월 10일', actualDate: '10월 12일', diffDays: 32, status: '평균보다 32일 늦게까지 관측', historicalAvgDate: basis === 'r5' ? '09월 15일' : '09월 10일', occurredSeasons: 36, totalSeasons: 36 },
      { id: 'first-subzero', name: '첫 영하 (최저 0℃ 미만)', season: '초겨울 신호', expectedDate: '11월 14일', actualDate: null, diffDays: null, status: '현재까지 확인되지 않음', historicalAvgDate: '11월 14일', occurredSeasons: 36, totalSeasons: 36 },
      { id: 'first-snow', name: '첫 신적설', season: '겨울 눈 신호', expectedDate: '12월 07일', actualDate: null, diffDays: null, status: '현재까지 확인되지 않음', historicalAvgDate: '12월 07일', occurredSeasons: 36, totalSeasons: 36 },
    ],
  };
}

export function getDevFallbackLife(stationId: string): ApiRtLifeResponse {
  const st = getStationById(stationId);
  return {
    ok: true,
    now: '2026-10-22 17:00',
    date: '2026-10-22',
    station: { id: st.id, name: st.name },
    items: [
      { id: 'walk', name: '산책·야외활동', category: '활동', score: 88, level: '좋음', valueText: '21.4℃ · 바람 2.4m/s', comment: '선선한 동남동풍이 불어 저녁 산책하기 쾌적합니다.' },
      { id: 'laundry', name: '빨래 건조', category: '생활', score: 65, level: '보통', valueText: '습도 50% · 내일 오전 비 예보', comment: '오늘 저녁 실내 건조를 권장해요.' },
      { id: 'carwash', name: '세차 지수', category: '생활', score: 40, level: '아쉬움', valueText: '내일 오전 강수확률 60%', comment: '내일 출근길 비 예보가 있어 주말 이후로 미루는 편이 좋습니다.' },
      { id: 'sleep', name: '수면 쾌적도', category: '건강', score: 84, level: '쾌적', valueText: '밤 최저 17℃ 내외', comment: '새벽 기온이 17℃까지 내려가니 가벼운 침구를 덮고 주무세요.' },
    ],
    scenarios: [
      { id: 'sc-evening', title: '오늘 저녁 · 밤 (18~24시)', hours: '18~24시', status: '외출 적합', description: '기온 18~21℃로 온화하며 강수 예보 없음' },
      { id: 'sc-morning', title: '내일 출근길 (07~09시)', hours: '07~09시', status: '우산 필수', description: '7~9시 비 예보(강수확률 60%), 기온 17~18℃' },
    ],
  };
}

export function getDevFallbackYearly(stationId: string): ApiStatsYearlyResponse {
  const st = getStationById(stationId);
  const offset = STATION_TEMP_OFFSETS[st.id] ?? 0;
  const years = [1990, 1995, 2000, 2005, 2010, 2015, 2018, 2020, 2021, 2022, 2023, 2024, 2025];
  const baseVals = [14.1, 14.3, 14.5, 14.7, 14.6, 15.0, 14.9, 15.2, 15.4, 15.1, 15.8, 16.0, 15.9];

  return {
    ok: true,
    station: { id: st.id, name: st.name },
    source: '기상청 ASOS 공식 일자료 (1990~2025)',
    rows: years.map((year, i) => ({
      year,
      start: `${year}-10-01`,
      end: `${year}-10-31`,
      days: 31,
      obs: 31,
      value: round1(baseVals[i] + offset),
      status: '정상 집계',
      missingDates: [],
    })),
    meta: {
      station: { id: st.id, name: st.name },
      metric: { id: 'ta_avg', label: '10월 평균기온', unit: '℃', agg: 'mean' },
      period: { fromYear: 1990, toYear: 2025 },
      source: 'ASOS 일자료',
      asOf: '2026-10-22',
    },
  };
}

export function getDevFallbackRegionStats(): ApiStatsRegionResponse {
  return {
    ok: true,
    view: 'decade-comparison',
    source: 'ASOS 공식 일자료 (1990~1999 vs 2016~2025)',
    timezone: 'Asia/Seoul',
    table: {
      columns: [
        { key: 'metric', label: '비교 항목' },
        { key: 'unit', label: '단위' },
        { key: 'm108', label: '서울 최근10년' },
        { key: 'd108', label: '서울 90년대 대비' },
        { key: 'm159', label: '부산 최근10년' },
        { key: 'd159', label: '부산 90년대 대비' },
        { key: 'm184', label: '제주 최근10년' },
        { key: 'd184', label: '제주 90년대 대비' },
      ],
      rows: [
        { metric: '연평균 기온', unit: '℃', m108: 13.5, d108: '+0.9', m159: 15.4, d159: '+0.7', m184: 16.8, d184: '+0.8' },
        { metric: '10월 평균기온', unit: '℃', m108: 15.4, d108: '+0.8', m159: 17.8, d159: '+0.6', m184: 19.2, d184: '+0.9' },
        { metric: '연간 강수일수(0.1mm↑)', unit: '일', m108: 106, d108: '+2', m159: 98, d159: '+1', m184: 132, d184: '+4' },
        { metric: '일최고 30℃ 이상 일수', unit: '일', m108: 44, d108: '+11', m159: 31, d159: '+9', m184: 48, d184: '+13' },
      ],
    },
  };
}

export function getDevFallbackHighlights(stationId: string): ApiStatsHighlightsResponse {
  const st = getStationById(stationId);
  return {
    ok: true,
    station: { id: st.id, name: st.name },
    asOf: '2026-10-22',
    source: '1990~1999년 평균 vs 최근 완료된 10개 연도(2016~2025) ASOS 관측 비교',
    cards: [
      { id: 'q-warmer', title: `우리 동네(${st.name})는 예전보다 더워졌을까?`, question: '1990년대와 최근 10년의 연평균 기온 비교', metric: '연평균 기온 변화', value: '+0.9', pastValue: '12.6℃ (1990~1999)', recentValue: '13.5℃ (2016~2025)', unit: '℃', description: '1990~1999년 평균(12.6℃)보다 최근 완료된 10년(2016~2025년) 평균이 0.9℃ 높아졌습니다.', badge: '관측 확인', trend: 'up' },
      { id: 'q-rain-days', title: '비 오는 날이 예전보다 더 많아졌을까?', question: '일강수량 0.1mm 이상 강수일수 및 강수 강도 비교', metric: '비 온 날 1일당 평균 강수량', value: '+1.8', pastValue: '12.4mm/일', recentValue: '14.2mm/일', unit: 'mm', description: '한 번 비가 내릴 때의 평균 강수 강도는 시간당·일당 모두 증가한 경향을 보입니다.', badge: '강수 강도 증가', trend: 'up' },
      { id: 'q-heat-start', title: '여름 더위(첫 30℃)는 예년보다 일찍 찾아왔을까?', question: '해마다 첫 일최고기온 30℃ 도달일 비교', metric: '올해 첫 30℃ 발생일', value: '5월 14일', pastValue: '평균 6월 1일', recentValue: '올해 18일 빠름', unit: '', description: '1990년 이후 36개 시즌 평균 첫 30℃ 도달일은 6월 1일이며, 올해는 5월 14일에 관측되었습니다.', badge: '계절 신호', trend: 'up' },
    ],
  };
}

export function getDevFallbackDateWeather(stationId: string, month: number, day: number): ApiStatsDateWeatherResponse {
  const st = getStationById(stationId);
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return {
    ok: true,
    date: `${mm}-${dd}`,
    station: { id: st.id, name: st.name },
    weather: {
      taAvg: 14.8,
      taMax: 20.3,
      taMin: 10.6,
      rnAvg: 1.8,
      rainProbability: 19,
      typicalSummary: `${month}월 ${day}일 ${st.name}은(는) 1990~2025년 중 81%의 해에 비 없이 맑거나 구름만 낀 선선한 날이었습니다.`,
    },
    historical: [
      { year: 2025, solarDate: `2025-${mm}-${dd}`, taAvg: 15.9, taMax: 21.4, taMin: 11.2, rnDay: 0, wsAvg: 1.9, summary: '맑고 포근한 날' },
      { year: 2024, solarDate: `2024-${mm}-${dd}`, taAvg: 15.1, taMax: 19.8, taMin: 10.9, rnDay: 3.2, wsAvg: 2.5, summary: '약한 가을비 후 갬' },
      { year: 2023, solarDate: `2023-${mm}-${dd}`, taAvg: 14.4, taMax: 20.1, taMin: 9.5, rnDay: 0, wsAvg: 1.7, summary: '쾌청한 가을 하늘' },
      { year: 1998, solarDate: `1998-${mm}-${dd}`, taAvg: 17.1, taMax: 22.4, taMin: 12.6, rnDay: 0, wsAvg: 1.6, summary: '역대 상위권 포근함' },
    ],
  };
}

export function getDevFallbackDateBattle(stationId: string, date1: string, date2: string): ApiStatsDateBattleResponse {
  const st = getStationById(stationId);
  return {
    ok: true,
    station: { id: st.id, name: st.name },
    contestant1: { date: date1, taAvg: 15.9, taMax: 21.4, taMin: 11.2, rnDay: 0, wsAvg: 1.9, score: 89 },
    contestant2: { date: date2, taAvg: 14.2, taMax: 18.9, taMin: 9.8, rnDay: 3.2, wsAvg: 2.6, score: 74 },
    winner: {
      date: date1,
      reason: `${date1}이(가) 강수 없이 낮 최고기온 21.4℃로 야외 활동 쾌적도가 더 높았습니다.`,
      scoreDiff: 15,
    },
  };
}
