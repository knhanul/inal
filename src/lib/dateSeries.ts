/**
 * 특정일(수능·학력고사·설날·추석) '해마다 실제 날짜' 화면의 순수 함수 모음 — React 와 무관하다.
 *
 * 왜 필요한가: '날짜로 보는 날씨'는 고른 월·일을 해마다 고정한다. 수능일처럼 해마다 양력 날짜가 바뀌는 날은
 * 그해 실제 시행일의 날씨가 아니라 고른 월·일의 날씨가 나온다. 이 화면은 서버(/api/stats/date-series)가
 * 달력으로 푼 '그해 실제 양력 날짜'를 따라가며 그날 하루의 관측값을 해마다 한 점으로 잇는다.
 * 여기서는 날짜를 다시 계산하지 않고, 서버가 준 값만 배치·요약·표시 문구로 바꾼다.
 */
import type {
  ApiDateSeriesPoint,
  ApiDateSeriesSeries,
  ApiDateSeriesSummary,
  ApiDateSeriesValues,
  ApiCalendarEvent,
} from '../types/api';

/** 특정일 종류별 기본 시작 연도(양력 날짜의 해). 수능은 1995학년도부터, 학력고사는 1982학년도부터. */
export const SERIES_DEFAULT_FROM: Record<string, number> = {
  csat: 1994,
  hakryeok: 1981,
  holiday: 1990,
  custom: 1990,
};

export const SERIES_KIND_LABEL: Record<string, string> = {
  csat: '대학수학능력시험',
  hakryeok: '학력고사',
  holiday: '명절·기념일',
  custom: '직접 추가',
};

/** 이 화면이 다루는 대상 — 종류(kind)와, 명절·직접 추가처럼 이름이 여럿일 때의 이름(label). */
export interface SeriesTarget {
  kind: string;
  label?: string;
}

export function isExamKind(kind: string): boolean {
  return kind === 'csat' || kind === 'hakryeok';
}

/** 특정일 종류의 기본 시작 연도. 모르는 종류는 1990년(달력 자료가 시작하는 해). */
export function defaultSeriesFrom(kind: string): number {
  return SERIES_DEFAULT_FROM[kind] ?? 1990;
}

/**
 * 달력 칩(한 해의 특정일) → 이 화면이 열 대상.
 * 수능·학력고사는 시행일마다 이름이 달라(2027학년도 수능 …) 이름으로 좁히지 않고 종류 전체를 본다.
 * 명절·직접 추가는 이름까지 좁힌다(설날과 추석이 섞이지 않게).
 */
export function seriesTargetForEvent(event: Pick<ApiCalendarEvent, 'kind' | 'label'>): SeriesTarget {
  const kind = String(event.kind || '');
  if (isExamKind(kind)) return { kind };
  const label = (event.label || '').trim();
  return label ? { kind, label } : { kind };
}

/** 화면 키·쿼리 키로 쓰는 짧은 문자열. 예: 'csat', 'holiday|추석' */
export function seriesTargetKey(target: SeriesTarget | null | undefined): string {
  if (!target) return '';
  return target.label ? `${target.kind}|${target.label}` : target.kind;
}

/** URL(?series=csat&seriesLabel=추석)에서 대상 복원. 없으면 null. 새로고침·뒤로 가기에 쓴다. */
export function resolveSeriesTargetFromSearch(search: string): SeriesTarget | null {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  } catch {
    return null;
  }
  const kind = (params.get('series') || '').trim();
  if (!kind) return null;
  const label = (params.get('seriesLabel') || '').trim();
  return label ? { kind, label } : { kind };
}

/** 화면에 붙일 쿼리 문자열 조각(?series=…&seriesLabel=…). 대상이 없으면 ''. */
export function seriesSearchSuffix(target: SeriesTarget | null | undefined): string {
  if (!target || !target.kind) return '';
  const params = new URLSearchParams({ series: target.kind });
  if (target.label) params.set('seriesLabel', target.label);
  return params.toString();
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 'YYYY-MM-DD' → 요일 한 글자. 날짜가 아니면 ''. */
export function weekdayOf(solarDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(solarDate || '');
  if (!m) return '';
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return '';
  return WEEKDAYS[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
}

/** 'YYYY-MM-DD' → '11.19' */
export function formatSeriesDateShort(solarDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(solarDate || '');
  if (!m) return solarDate || '';
  return `${Number(m[2])}.${Number(m[3])}`;
}

/** 'YYYY-MM-DD' → '11월 19일' (요일 없이) */
export function formatSeriesDateKo(solarDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(solarDate || '');
  if (!m) return solarDate || '';
  return `${Number(m[2])}월 ${Number(m[3])}일`;
}

/** 'YYYY-MM-DD' → '11.19 (목)' — 표의 실제 양력 날짜 칸 */
export function formatSeriesDateWithWeekday(solarDate: string): string {
  const wd = weekdayOf(solarDate);
  const md = formatSeriesDateShort(solarDate);
  return wd ? `${md} (${wd})` : md;
}

/** '음력 1994년 10월 21일' → '음 10.21'. 형식이 다르면 ''. */
export function shortLunarText(lunarText: string | null | undefined): string {
  if (!lunarText) return '';
  const m = /음력\s*\d+\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/.exec(lunarText);
  if (!m) return lunarText.trim();
  return `음 ${Number(m[1])}.${Number(m[2])}`;
}

/** 그 점의 해 표기 — 학년도가 있으면 '2027학년도', 없으면 '2026년'. */
export function seriesYearText(point: Pick<ApiDateSeriesPoint, 'year' | 'yearLabel'>): string {
  return point.yearLabel ? point.yearLabel : `${point.year}년`;
}

/** 그래프 x축 위쪽 눈금 — 학년도가 있으면 '2027', 없으면 '2026'. */
export function seriesShortYearText(point: Pick<ApiDateSeriesPoint, 'year' | 'yearLabel'>): string {
  if (point.yearLabel) return point.yearLabel.replace(/학년도$/, '');
  return String(point.year);
}

/** '실제 시행일' vs '실제 날짜' — 시험은 시행일, 명절·기념일은 날짜로 부른다. */
export function seriesBasisWord(kind: string): string {
  return isExamKind(kind) ? '실제 시행일' : '실제 날짜';
}

/** 이 화면의 이름. 서버가 준 series.name 을 우선한다(예: '수능일', '추석'). */
export function seriesNameText(series: Pick<ApiDateSeriesSeries, 'name' | 'kind' | 'label'> | null | undefined): string {
  if (!series) return '특정일';
  if (series.name) return series.name;
  if (series.label) return series.label;
  return SERIES_KIND_LABEL[String(series.kind)] || '특정일';
}

// ---------------------------------------------------------------- 숫자·상태 문구

export function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/** 소수 한 자리 + ℃. 값이 없으면 '자료 없음'. */
export function tempText(v: number | null | undefined): string {
  if (!isNum(v)) return '자료 없음';
  return `${(Math.round(v * 10) / 10).toFixed(1)}℃`;
}

/** 소수 한 자리 mm. 값이 없으면 '자료 없음'. */
export function rainText(v: number | null | undefined): string {
  if (!isNum(v)) return '자료 없음';
  return `${(Math.round(v * 10) / 10).toFixed(1)}mm`;
}

/**
 * 표·상세의 상태 문구. 관측 전(future)은 짧게 '관측 전', 그날 행이 없으면 '자료 없음'.
 * 그 밖의 상태는 서버 statusText 를 그대로 쓴다.
 */
export function pointStatusText(
  point: Pick<ApiDateSeriesPoint, 'dateStatus' | 'rowPresent'>,
  statusText?: Record<string, string> | null,
): string {
  if (point.dateStatus === 'future') return '관측 전';
  if (point.dateStatus === 'ok') {
    return point.rowPresent ? statusText?.ok || '자료 있음' : '자료 없음';
  }
  return statusText?.[point.dateStatus] || '자료 없음';
}

/** 그 점에 쓸 수 있는 값이 있는지(관측 전·자료 없음은 false). */
export function pointHasData(point: Pick<ApiDateSeriesPoint, 'dateStatus' | 'rowPresent'>): boolean {
  return point.dateStatus === 'ok' && point.rowPresent;
}

function valuesOf(point: ApiDateSeriesPoint): ApiDateSeriesValues {
  return point.values || ({} as ApiDateSeriesValues);
}

// ---------------------------------------------------------------- 그래프

/**
 * 점 개수에 맞춰 x축 눈금을 솎는다 — 처음·끝은 반드시 넣고 그 사이를 고르게. 점이 5개 이하면 전부.
 */
export function pickTickIndices(count: number, maxTicks = 5): number[] {
  if (!Number.isFinite(count) || count <= 0) return [];
  const cap = Math.max(2, Math.floor(maxTicks));
  if (count <= cap) return Array.from({ length: count }, (_, i) => i);
  const step = (count - 1) / (cap - 1);
  const out: number[] = [];
  for (let i = 0; i < cap; i += 1) {
    const idx = Math.round(i * step);
    if (!out.includes(idx)) out.push(idx);
  }
  return out;
}

function niceStep(span: number, targetTicks: number): number {
  const raw = Math.max(1e-6, span) / Math.max(1, targetTicks);
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  const mult = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return mult * pow;
}

/** y축 범위와 눈금. 값이 하나도 없으면 0~10 기본값을 돌려준다(그래프는 비어 있게 그린다). */
export function buildYScale(values: number[], targetTicks = 4): { lo: number; hi: number; ticks: number[] } {
  const nums = values.filter(isNum);
  if (!nums.length) return { lo: 0, hi: 10, ticks: [0, 5, 10] };
  const minV = Math.min(...nums);
  const maxV = Math.max(...nums);
  const step = niceStep(Math.max(1, maxV - minV), targetTicks);
  const lo = Math.floor((minV - step * 0.35) / step) * step;
  const hi = Math.ceil((maxV + step * 0.35) / step) * step;
  const ticks: number[] = [];
  const count = Math.round((hi - lo) / step);
  for (let i = 0; i <= count; i += 1) ticks.push(Math.round((lo + i * step) * 10) / 10);
  return { lo, hi, ticks };
}

export interface SeriesChartGeometry {
  width: number;
  height: number;
  plotTop: number;
  plotBottom: number;
  padLeft: number;
  padRight: number;
  /** 점 순서별 x 좌표(0 → 왼쪽). */
  xPositions: number[];
  yTicks: Array<{ value: number; y: number }>;
  xTicks: Array<{ index: number; x: number; yearText: string; mdText: string; anchor: 'start' | 'middle' | 'end' }>;
  dots: Array<{ index: number; x: number; yMax: number; yMin: number }>;
  /** 자료가 있는 점만 이어 그린 선들 — 값이 없는 점에서 끊긴다. */
  maxLines: string[];
  minLines: string[];
  /** 값이 없는 점의 x 좌표(회색 띠로 표시). */
  missingXs: number[];
}

/**
 * 기온 선 그래프 좌표를 만든다. x = 점 순서(실제 시행일 순), y = 기온.
 * 폭 360px 화면에서도 가로 스크롤이 없도록 viewBox 안에 전부 배치한다(width:100% 로 늘려 그림).
 */
export function buildSeriesChart(
  points: ApiDateSeriesPoint[],
  options: { width?: number; height?: number; maxTicks?: number } = {},
): SeriesChartGeometry {
  const width = options.width ?? 300;
  const height = options.height ?? 196;
  const padLeft = 30;
  const padRight = 12;
  const plotTop = 12;
  const plotBottom = height - 42;
  const n = points.length;

  const allValues: number[] = [];
  for (const p of points) {
    if (!pointHasData(p)) continue;
    const v = valuesOf(p);
    if (isNum(v.max)) allValues.push(v.max);
    if (isNum(v.min)) allValues.push(v.min);
  }
  const scale = buildYScale(allValues);
  const span = Math.max(1e-6, scale.hi - scale.lo);
  const yOf = (v: number) => plotTop + (1 - (v - scale.lo) / span) * (plotBottom - plotTop);
  const plotWidth = width - padLeft - padRight;
  const xPositions =
    n === 0 ? [] : n === 1 ? [padLeft + plotWidth / 2] : points.map((_, i) => padLeft + (i / (n - 1)) * plotWidth);

  const yTicks = scale.ticks
    .map((value) => ({ value, y: yOf(value) }))
    .filter((t) => t.y >= plotTop - 0.5 && t.y <= plotBottom + 0.5);

  const xTicks = pickTickIndices(n, options.maxTicks ?? 5).map((index) => {
    const p = points[index];
    return {
      index,
      x: xPositions[index],
      yearText: seriesShortYearText(p),
      mdText: formatSeriesDateShort(p.solarDate),
      anchor: index === 0 ? ('start' as const) : index === n - 1 ? ('end' as const) : ('middle' as const),
    };
  });

  const dots: SeriesChartGeometry['dots'] = [];
  const missingXs: number[] = [];
  const maxSegments: string[][] = [];
  const minSegments: string[][] = [];
  let curMax: string[] = [];
  let curMin: string[] = [];

  points.forEach((p, i) => {
    const v = valuesOf(p);
    const hasData = pointHasData(p) && isNum(v.max) && isNum(v.min);
    if (!hasData) {
      // 값이 없는 해는 선을 끊는다(다른 날·다른 해 값으로 채우지 않는다).
      if (curMax.length) maxSegments.push(curMax);
      if (curMin.length) minSegments.push(curMin);
      curMax = [];
      curMin = [];
      missingXs.push(xPositions[i]);
      return;
    }
    const yMax = yOf(v.max as number);
    const yMin = yOf(v.min as number);
    dots.push({ index: i, x: xPositions[i], yMax, yMin });
    curMax.push(`${xPositions[i].toFixed(1)},${yMax.toFixed(1)}`);
    curMin.push(`${xPositions[i].toFixed(1)},${yMin.toFixed(1)}`);
  });
  if (curMax.length) maxSegments.push(curMax);
  if (curMin.length) minSegments.push(curMin);

  return {
    width,
    height,
    plotTop,
    plotBottom,
    padLeft,
    padRight,
    xPositions,
    yTicks,
    xTicks,
    dots,
    maxLines: maxSegments.map((seg) => seg.join(' ')),
    minLines: minSegments.map((seg) => seg.join(' ')),
    missingXs,
  };
}

// ---------------------------------------------------------------- 요약 문장

function extremeYearText(x: { year: number; yearLabel: string | null }): string {
  return x.yearLabel ? x.yearLabel : `${x.year}년`;
}

function tieSuffix(x: { tie?: boolean; years?: number[] }): string {
  if (!x.tie || !x.years || x.years.length < 2) return '';
  return ` (${x.years.join('·')}년 공동)`;
}

/**
 * 요약 2~3문장 — 가장 더웠던 해·가장 추웠던 해, 비·눈 온 해 수, 최근 10년 평균.
 * 값은 모두 API 응답에서만 만들고, 없는 문장은 빼 둔다(0이나 '—'로 채우지 않는다).
 */
export function buildSeriesSummaryLines(
  summary: ApiDateSeriesSummary | null | undefined,
  series?: Pick<ApiDateSeriesSeries, 'kind'> | null,
): string[] {
  if (!summary) return [];
  const lines: string[] = [];
  const hot = summary.extremes?.hottest;
  const cold = summary.extremes?.coldest;
  const hotTemp = hot && isNum(hot.value) ? tempText(hot.value) : null;
  const coldTemp = cold && isNum(cold.value) ? tempText(cold.value) : null;

  if (hotTemp && coldTemp && hot && cold) {
    lines.push(
      `가장 더웠던 해는 ${extremeYearText(hot)}(${formatSeriesDateKo(hot.solarDate)}) ${hotTemp}${tieSuffix(hot)}, ` +
        `가장 추웠던 해는 ${extremeYearText(cold)}(${formatSeriesDateKo(cold.solarDate)}) ${coldTemp}${tieSuffix(cold)}입니다.`,
    );
  } else if (hotTemp && hot) {
    lines.push(`가장 더웠던 해는 ${extremeYearText(hot)}(${formatSeriesDateKo(hot.solarDate)}) ${hotTemp}${tieSuffix(hot)}입니다.`);
  } else if (coldTemp && cold) {
    lines.push(`가장 추웠던 해는 ${extremeYearText(cold)}(${formatSeriesDateKo(cold.solarDate)}) ${coldTemp}${tieSuffix(cold)}입니다.`);
  }

  const rc = summary.rainCount;
  if (rc && isNum(rc.k) && isNum(rc.n) && rc.n > 0) {
    lines.push(`비나 눈이 온 해는 ${rc.n}번 중 ${rc.k}번(${Math.round(rc.share)}%)입니다.`);
  }

  const r10 = summary.recent10;
  if (r10 && r10.max && r10.min && isNum(r10.max.mean) && isNum(r10.min.mean)) {
    const label = r10.label || `최근 10년(${r10.fromYear}~${r10.toYear})`;
    const n = isNum(r10.max.n) && r10.max.n > 0 ? r10.max.n : null;
    const nText = n && r10.points && n !== r10.points ? `${n}개 해` : '';
    lines.push(
      `${label}${nText ? ` ${nText}` : ''} 평균은 최고 ${tempText(r10.max.mean)} · 최저 ${tempText(r10.min.mean)}입니다.`,
    );
  }

  // 시험 종류가 아니면 학년도가 없으니 문장에서 쓰지 않는다 — 위 문장들은 학년도가 있으면 그대로, 없으면 연도로 적는다.
  void series;
  return lines;
}

// ---------------------------------------------------------------- 표

export interface SeriesTableRow {
  /** points 배열에서의 위치(그래프 선택과 맞춘다) */
  index: number;
  yearText: string;
  shortYearText: string;
  dateText: string;
  lunarText: string;
  max: number | null;
  min: number | null;
  avg: number | null;
  rain: number | null;
  statusText: string;
  note: string | null;
  hasData: boolean;
}

/** 표는 최근 해부터(점 순서의 역순). 값은 그 점에 있을 때만 채운다. */
export function buildSeriesRows(
  points: ApiDateSeriesPoint[],
  statusText?: Record<string, string> | null,
): SeriesTableRow[] {
  return points
    .map((p, index) => ({ p, index }))
    .reverse()
    .map(({ p, index }) => {
      const hasData = pointHasData(p);
      const v = valuesOf(p);
      return {
        index,
        yearText: seriesYearText(p),
        shortYearText: seriesShortYearText(p),
        dateText: formatSeriesDateWithWeekday(p.solarDate),
        lunarText: shortLunarText(p.lunarText),
        max: hasData && isNum(v.max) ? v.max : null,
        min: hasData && isNum(v.min) ? v.min : null,
        avg: hasData && isNum(v.avg) ? v.avg : null,
        rain: hasData && isNum(v.rain) ? v.rain : null,
        statusText: pointStatusText(p, statusText),
        note: p.note,
        hasData,
      };
    });
}

/** 표 머리말용 기간 문구. 예: '1994~2026년 · 실제 시행일 기준' */
export function seriesBasisText(kind: string, fromYear: number, toYear: number): string {
  return `${fromYear}~${toYear}년 · ${seriesBasisWord(kind)} 기준`;
}
