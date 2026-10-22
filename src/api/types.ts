export type BasisId = "all" | "r10" | "r5";

export type Station = {
  station_id: string;
  station_name: string;
  region?: string | null;
  enabled?: boolean;
  favorite?: boolean;
  latitude?: number | null;
  longitude?: number | null;
};

export type PeriodBrief = {
  id: string;
  label: string;
  range: string;
  mean?: number | null;
  diff?: number | null;
  status?: string;
  statusText?: string;
  samples?: number | null;
  percentile?: number | null;
  rankHigh?: number | null;
  rankLow?: number | null;
};

export type Freshness = { state?: string; ageMin?: number | null; text?: string };

export type CurrentObs = {
  time?: string;
  hour?: number;
  kind?: string;
  source?: string;
  freshness?: Freshness;
  values?: {
    ta?: number | null;
    hm?: number | null;
    rn1?: number | null;
    ws?: number | null;
    vec?: number | null;
    windDir?: string | null;
    pty?: string | null;
  } | null;
  compare?: { ta?: PeriodBrief[]; hm?: PeriodBrief[]; rn?: PeriodBrief[]; ws?: PeriodBrief[] };
  message?: string;
};

export type DayExtreme = {
  kind?: string;
  source?: string;
  base?: string | null;
  value?: number | null;
  compare?: PeriodBrief[];
  note?: string;
};

export type TodayHour = {
  hour: number;
  time: string;
  obs?: number | null;
  fcst?: number | null;
  fcstSource?: string | null;
  base?: Record<string, number | null>;
};

export type TodayResponse = {
  ok?: boolean;
  warming?: boolean;
  message?: string;
  now?: string;
  date?: string;
  station?: { id: string; name: string };
  periods?: { id: string; label: string; range: string }[];
  current?: CurrentObs;
  day?: { max?: DayExtreme; min?: DayExtreme };
  hours?: TodayHour[];
  stories?: { id: string; title: string; value?: string; text?: string; basis?: string; asOf?: string; kind?: string }[];
  part?: string;
};

export type ForecastHour = {
  time: string;
  ta?: number | null;
  pop?: number | null;
  pcp?: string | null;
  pty?: string | null;
  sky?: string | null;
  hm?: number | null;
  ws?: number | null;
  source?: string;
  base?: string | null;
  diff?: Record<string, number | null>;
  avg?: Record<string, number | null>;
};

export type ForecastDay = {
  date: string;
  max?: number | null;
  min?: number | null;
  maxSource?: string | null;
  minSource?: string | null;
  maxBase?: string | null;
  minBase?: string | null;
  pop?: number | null;
  popNote?: string | null;
  sky?: string | null;
  wf?: string | null;
  wxSource?: string | null;
  none?: boolean;
  maxCmp?: PeriodBrief[];
  minCmp?: PeriodBrief[];
};

export type ForecastResponse = {
  ok?: boolean;
  warming?: boolean;
  message?: string;
  now?: string;
  date?: string;
  station?: { id: string; name: string };
  hours?: ForecastHour[];
  days?: ForecastDay[];
  outlook?: { text?: string | null; tmFc?: string; region?: string | null; source?: string; freshness?: Freshness; note?: string };
  releases?: { ultra?: { base?: string }; vilage?: { base?: string } };
};

export type YtdResponse = {
  ok?: boolean;
  message?: string;
  asOf?: string;
  source?: string;
  items?: { id: string; label: string; unit: string; value?: number | null; periods?: PeriodBrief[]; status?: string }[];
};

export type LifeItem = {
  id: string;
  q: string;
  answer?: string | null;
  note?: string;
  value?: number | string | null;
  unit?: string;
  kind?: string;
  basis?: string;
  judgement?: string;
};

export type LifeResponse = { ok?: boolean; message?: string; items?: LifeItem[] };

export type RecordsResponse = {
  ok?: boolean;
  message?: string;
  now_rank?: {
    time?: string;
    value?: number;
    kind?: string;
    periods?: { id: string; label: string; range: string; rankHigh?: number | null; rankLow?: number | null; samples?: number | null; percentile?: number | null; max?: { value?: number; date?: string } | null; min?: { value?: number; date?: string } | null }[];
  } | null;
  days?: { date: string; kind?: string; max?: number | null; min?: number | null; maxSource?: string | null }[];
  rule?: string;
};

export type RegionsResponse = {
  ok?: boolean;
  message?: string;
  time?: string | null;
  comparable?: number;
  note?: string;
  rows?: { id: string; name: string; temp?: number | null; note?: string }[];
  rankDeviation?: { id: string; rank?: number; direction?: string; diff?: number | null; percentile?: number | null }[];
  rankAboveAvg?: { id: string; rank?: number }[];
};

export type StoryCard = {
  title?: string;
  text?: string;
  kind?: string;
  basis?: string;
  phenomenon?: string;
  asOf?: string;
  ruleId?: string;
};

export type StoriesResponse = {
  ok?: boolean;
  warming?: boolean;
  message?: string;
  basisId?: string;
  basisName?: string;
  stale?: boolean;
  staleNote?: string | null;
  emptyText?: string | null;
  stories?: StoryCard[];
  failedParts?: string[];
};

export type DateWeatherResponse = {
  ok?: boolean;
  message?: string;
  specLabel?: string;
  window?: { label?: string };
  stories?: { id?: string; text?: string }[];
  selected?: { referenceYear?: number; dateStatus?: string; values?: { max?: number | null; min?: number | null; rain?: number | null } }[];
};

export type BattleResponse = {
  ok?: boolean;
  message?: string;
  window?: { label?: string };
  cases?: { id: string; specLabel?: string; year?: number }[];
  tallies?: { word?: string; def?: string; n?: number; results?: { case: string; k?: number }[]; ties?: number }[];
};
