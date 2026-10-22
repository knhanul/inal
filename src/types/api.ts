export type BasisId = 'all' | 'r10' | 'r5';

export interface ApiStationRef {
  id: string;
  name: string;
}

export interface ApiPeriodMeta {
  fromYear?: number;
  toYear?: number;
  from?: number;
  to?: number;
  count: number;
  label?: string;
}

export interface ApiBasisStat {
  id?: BasisId | string;
  range?: string;
  period?: string;
  mean: number | null;
  diff: number | null;
  p10?: number | null;
  p25?: number | null;
  p50?: number | null;
  p75?: number | null;
  p90?: number | null;
  percentile?: number | null;
  zscore?: number | null;
  rank?: number | null;
  rankHigh?: number | null;
  rankLow?: number | null;
  total?: number | null;
  samples?: number | null;
  sampleCount?: number | null;
  min?: { value: number | null; year?: number; date?: string } | number | null;
  max?: { value: number | null; year?: number; date?: string } | number | null;
  label?: string | null;
  summary?: string | null;
  byBasis?: Partial<Record<BasisId, ApiBasisStat>>;
  r10Mean?: number | null;
  r10Diff?: number | null;
  r5Mean?: number | null;
  r5Diff?: number | null;
}

export type ApiCompareField = ApiBasisStat | ApiBasisStat[] | null | undefined;

export interface ApiRtNowResponse {
  ok: boolean;
  now: string;
  date: string;
  station: ApiStationRef;
  method?: {
    windowDays?: number;
    rule?: string;
    note?: string;
  };
  periods?: ApiPeriodMeta;
  current: {
    time: string;
    hour: number;
    kind: 'obs' | 'fcst' | string;
    source: string;
    freshness?: {
      base?: string;
      ageMinutes?: number | null;
      ageMin?: number | null;
      status?: string;
      state?: string;
      label?: string;
      text?: string;
    };
    values: {
      ta: number | null;
      hm: number | null;
      rn1: number | null;
      ws: number | null;
      vec: number | null;
      windDir: string | null;
      pty: string | null;
      sky?: string | null;
    };
    compare?: {
      ta?: ApiCompareField;
      hm?: ApiCompareField;
      rn?: ApiCompareField;
      ws?: ApiCompareField;
    };
  };
  day?: {
    max?: {
      kind: string;
      source: string;
      base: string;
      value: number | null;
      compare?: ApiCompareField;
    };
    min?: {
      kind: string;
      source: string;
      base: string;
      value: number | null;
      compare?: ApiCompareField;
    };
  };
}

export interface ApiRtTodayHourlyItem {
  hour: number;
  time: string;
  obs: number | null;
  fcst: number | null;
  fcstSource?: string | null;
  fcstBase?: string | null;
  base?: Partial<Record<BasisId, number | null>>;
  compare?: {
    mean: number | null;
    r10Mean?: number | null;
    r5Mean?: number | null;
    p10?: number | null;
    p90?: number | null;
    diff?: number | null;
  } | null;
}

export interface ApiRtTodayOutfitSegment {
  id: string;
  label: string;
  hours: string;
  outer: string;
  inner: string;
  note: string;
  minTa: number | null;
  maxTa: number | null;
}

export interface ApiRtTodayResponse {
  ok: boolean;
  now: string;
  date: string;
  station: ApiStationRef;
  grid?: {
    nx: number;
    ny: number;
    note?: string;
  };
  hourly?: ApiRtTodayHourlyItem[];
  hours?: ApiRtTodayHourlyItem[];
  summary?: {
    headline?: string;
    outfit?: string;
    tempRange?: number | null;
    rainNote?: string | null;
    segments?: ApiRtTodayOutfitSegment[];
  };
}

export interface ApiRtForecastHourItem {
  time: string;
  hour?: number;
  ta: number | null;
  hm: number | null;
  ws: number | null;
  pcp: number | string | null;
  pty: number | string | null;
  pop: number | null;
  sky: number | string | null;
  source: string;
  base: string;
  pcpText?: string | null;
  ptyName?: string | null;
  skyName?: string | null;
}

export interface ApiRtForecastDayItem {
  date: string;
  dayOfWeek?: string;
  tmX?: number | null;
  tmN?: number | null;
  max?: number | null;
  min?: number | null;
  popMax?: number | null;
  pop?: number | null;
  pcpSum?: number | null;
  skyCode?: number | null;
  skyName?: string | null;
  sky?: string | null;
  wf?: string | null;
  ptyCode?: number | null;
  ptyName?: string | null;
  isObserved?: boolean;
  normalMax?: number | null;
  normalMin?: number | null;
  maxCmp?: ApiBasisStat[];
  minCmp?: ApiBasisStat[];
  source?: string;
  maxSource?: string | null;
  wxSource?: string | null;
}

export type ApiReleaseInfo = string | { base?: string; freshness?: { state?: string; ageMin?: number; text?: string } } | null;

export interface ApiRtForecastResponse {
  ok: boolean;
  now?: string;
  date?: string;
  station: ApiStationRef;
  releases?: {
    ultra?: ApiReleaseInfo;
    vilage?: ApiReleaseInfo;
    mid?: ApiReleaseInfo;
    midTa?: ApiReleaseInfo;
    midLand?: ApiReleaseInfo;
  };
  hours: ApiRtForecastHourItem[];
  days: ApiRtForecastDayItem[];
  week?: ApiRtForecastDayItem[] | { from?: string; to?: string; days?: ApiRtForecastDayItem[] };
}

export interface ApiRtForecastWindItem {
  time: string;
  vec: number | null;
  ws: number | null;
  source: string;
  base: string;
}

export interface ApiRtForecastWindResponse {
  ok?: boolean;
  now?: string;
  station?: ApiStationRef;
  hours: ApiRtForecastWindItem[];
  note?: string;
}

export interface ApiRtRegionRow {
  id: string;
  name: string;
  category?: string;
  lat: number;
  lon: number;
  ta: number | null;
  hm: number | null;
  ws: number | null;
  rn: number | null;
  pty: string | null;
  diff: number | null;
  percentile: number | null;
  rank: number | null;
  summary?: string | null;
}

export interface ApiRtRegionsResponse {
  ok: boolean;
  asOf?: string;
  time?: string;
  periods?: ApiPeriodMeta;
  rows: ApiRtRegionRow[];
  rankings?: {
    maxTa?: { id: string; name: string; value: number | null };
    minTa?: { id: string; name: string; value: number | null };
    maxRn?: { id: string; name: string; value: number | null };
    maxWs?: { id: string; name: string; value: number | null };
  };
  note?: string;
}

export interface ApiRtRecordDayItem {
  id: string;
  title: string;
  metric: string;
  value: number | null;
  unit: string;
  date: string;
  year?: number;
  rank?: number;
  note?: string;
}

export interface ApiRtRecordsResponse {
  ok: boolean;
  station: ApiStationRef;
  now?: string;
  periods?: ApiPeriodMeta;
  now_rank?: {
    ta: number | null;
    rank: number | null;
    total: number | null;
    topPercentile: number | null;
    label: string;
  } | null;
  rain1h?: {
    value: number | null;
    rank: number | null;
    historicalMax: number | null;
    date: string | null;
  } | null;
  rainCalendar30d?: {
    rainyDays: number;
    dryDays: number;
    missingDays: number;
    totalMm: number | null;
    lastRainDate: string | null;
    lastRainMm: number | null;
    dryStreakDays: number;
  } | null;
  days: ApiRtRecordDayItem[];
  rule?: string;
}

export interface ApiRtLifeItem {
  id: string;
  name: string;
  category: string;
  score: number | null;
  level: string;
  valueText: string;
  comment: string;
  icon?: string;
}

export interface ApiRtLifeScenario {
  id: string;
  title: string;
  hours?: string;
  status: string;
  description: string;
  suitabilities?: Array<{ label: string; value: string }>;
}

export interface ApiRtLifeResponse {
  ok: boolean;
  now?: string;
  date?: string;
  station: ApiStationRef;
  items: ApiRtLifeItem[];
  scenarios: ApiRtLifeScenario[];
}

export interface ApiRtSimilarMatch {
  date: string;
  score: number;
  similarityPercent: number;
  taDiff: number | null;
  hmDiff: number | null;
  weatherSummary: string;
  taMax?: number | null;
  taMin?: number | null;
  rnDay?: number | null;
}

export interface ApiRtSimilarResponse {
  ok: boolean;
  station: ApiStationRef;
  day?: string;
  source?: string;
  kind?: string;
  matches: ApiRtSimilarMatch[];
}

export interface ApiRtStoryItem {
  id: string;
  title: string;
  category: string;
  kind?: 'obs' | 'fcst' | 'mix' | string;
  content: string;
  howCalculated?: string;
  evidence?: string;
  tags: string[];
  createdAt?: string;
}

export interface ApiRtStoriesResponse {
  ok: boolean;
  station: ApiStationRef;
  basis?: string;
  totalCandidates?: number;
  stories: ApiRtStoryItem[];
}

export interface ApiRtSeasonEvent {
  id: string;
  name: string;
  season: string;
  expectedDate: string | null;
  actualDate: string | null;
  diffDays: number | null;
  status: string;
  historicalAvgDate: string | null;
  occurredSeasons?: number;
  totalSeasons?: number;
  note?: string;
}

export interface ApiRtSeasonsResponse {
  ok: boolean;
  station: ApiStationRef;
  now?: string;
  basisId?: BasisId;
  events: ApiRtSeasonEvent[];
}

export interface ApiStatsYearlyRow {
  year: number;
  start?: string;
  end?: string;
  days?: number;
  obs?: number;
  value: number | null;
  date?: string | null;
  status?: string;
  missingDates?: string[] | string;
}

export interface ApiStatsYearlyResponse {
  ok: boolean;
  station?: ApiStationRef;
  source?: string;
  rows: ApiStatsYearlyRow[];
  meta?: {
    station?: ApiStationRef;
    metric?: { id: string; label: string; unit: string; agg?: string };
    period?: { fromYear: number; toYear: number };
    source?: string;
    asOf?: string;
  };
}

export interface ApiStatsRegionResponse {
  ok: boolean;
  view?: string;
  source?: string;
  timezone?: string;
  dataVersion?: string;
  table: {
    columns: Array<{ key: string; label: string }>;
    rows: Array<Record<string, string | number | null>>;
  };
}

export interface ApiStatsDateWeatherHistoricalItem {
  year: number;
  solarDate: string;
  lunarDate?: string | null;
  taAvg: number | null;
  taMax: number | null;
  taMin: number | null;
  rnDay: number | null;
  wsAvg: number | null;
  summary: string | null;
}

export interface ApiStatsDateWeatherResponse {
  ok: boolean;
  date?: string;
  station: ApiStationRef;
  weather: {
    taAvg: number | null;
    taMax: number | null;
    taMin: number | null;
    rnAvg: number | null;
    rainProbability: number | null;
    typicalSummary: string;
  };
  historical: ApiStatsDateWeatherHistoricalItem[];
}

export interface ApiStatsBattleContestant {
  date: string;
  taAvg: number | null;
  taMax: number | null;
  taMin: number | null;
  rnDay: number | null;
  wsAvg: number | null;
  score: number;
}

export interface ApiStatsDateBattleResponse {
  ok: boolean;
  station: ApiStationRef;
  contestant1: ApiStatsBattleContestant;
  contestant2: ApiStatsBattleContestant;
  winner: {
    date: string;
    reason: string;
    scoreDiff: number;
  };
}

export interface ApiStatsHighlightCard {
  id: string;
  title: string;
  question?: string;
  metric: string;
  value: number | string | null;
  pastValue?: number | string | null;
  recentValue?: number | string | null;
  unit: string;
  description: string;
  badge: string | null;
  trend: 'up' | 'down' | 'flat' | string | null;
}

export interface ApiStatsHighlightsResponse {
  ok: boolean;
  station: { station_id: string; station_name: string } | ApiStationRef;
  asOf?: string;
  source?: string;
  cards: ApiStatsHighlightCard[];
}
