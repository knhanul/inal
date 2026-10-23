/**
 * 하루 구간별 옷차림 — weather.nuni.co.kr(rt-story-visuals.js)와 같은 규칙.
 * /api/rt/today 는 summary.segments 를 주지 않으므로, 실황·예보로 클라이언트에서 계산한다.
 */
import type {
  ApiRtForecastDayItem,
  ApiRtForecastHourItem,
  ApiRtForecastResponse,
  ApiRtTodayOutfitSegment,
  ApiRtTodayResponse,
} from '../types/api';

export const SEG_DEFAULT = [
  { id: 'am', label: '출근', from: 7, to: 9 },
  { id: 'day', label: '낮', from: 12, to: 15 },
  { id: 'pm', label: '퇴근', from: 18, to: 20 },
  { id: 'night', label: '밤', from: 21, to: 6 },
] as const;

const WEAR: Array<[number, string]> = [
  [28, '민소매·반바지'],
  [23, '반팔·얇은 셔츠'],
  [20, '얇은 가디건·긴팔'],
  [17, '맨투맨·얇은 니트'],
  [12, '자켓·가디건'],
  [9, '트렌치코트·야상'],
  [5, '코트·히트텍'],
  [-99, '패딩·목도리'],
];

const RULE = { easyLayerSeg: 8, easyLayerDay: 10, wind: 5, hotT: 25, hotRH: 70, popHigh: 60 };

export function wearOf(t: number): string {
  const hit = WEAR.find(([lo]) => t >= lo);
  return hit ? hit[1] : '패딩·목도리';
}

function fin(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function addDay(ymd: string, k: number): string {
  return new Date(Date.parse(`${ymd}T00:00:00Z`) + k * 864e5).toISOString().slice(0, 10);
}

/** `YYYY-MM-DD HH:mm` 또는 `YYYY-MM-DD HH:mm:ss` → 비교용 19자 */
function normalizeNowW(now: string | undefined, date: string | undefined): string {
  const raw = (now || '').trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(raw)) return raw.slice(0, 19);
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(raw)) return `${raw}:00`;
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) return `${date} 12:00:00`;
  const d = new Date();
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  const hm = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  return `${ymd} ${hm}:00`;
}

function dayWord(d: string, today: string): string {
  if (d === today) return '오늘';
  if (d === addDay(today, 1)) return '내일';
  if (d === addDay(today, -1)) return '어제';
  return `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
}

function ptyText(pty: number | string | null | undefined): string | null {
  if (pty == null || pty === '' || pty === '없음' || pty === 0 || pty === '0') return null;
  if (typeof pty === 'number') {
    if (pty === 1 || pty === 4) return '비';
    if (pty === 2) return '비/눈';
    if (pty === 3) return '눈';
    return String(pty);
  }
  return String(pty);
}

type SegDef = { id: string; label: string; from: number; to: number };

type HourPoint = {
  time: string;
  ta?: number | null;
  hm?: number | null;
  ws?: number | null;
  pty?: number | string | null;
  pop?: number | null;
  kind: 'obs' | 'fcst';
  items?: ApiRtForecastHourItem['items'];
};

type Occ = SegDef & { date: string; startW: string; endW: string };

function segOccurrence(seg: SegDef, nowW: string): Occ | null {
  const ymd = nowW.slice(0, 10);
  const nowCmp = `${nowW}:00`.slice(0, 19);
  for (const k of [-1, 0, 1] as const) {
    const d = addDay(ymd, k);
    const startW = `${d} ${pad(seg.from)}:00:00`;
    const endW = `${seg.to < seg.from ? addDay(d, 1) : d} ${pad(seg.to)}:00:00`;
    if (endW > nowCmp) return { ...seg, date: d, startW, endW };
  }
  return null;
}

function buildSegment(
  seg: SegDef,
  nowW: string,
  obsHours: HourPoint[],
  fc: HourPoint[],
  days: Array<{ date: string; max?: number | null; min?: number | null }>,
  current: HourPoint | null,
  todayYmd: string
): ApiRtTodayOutfitSegment | null {
  const occ = segOccurrence(seg, nowW);
  if (!occ) return null;

  const inT = (t: string) => t >= occ.startW && t <= occ.endW;
  const hrs = new Map<string, HourPoint>();
  for (const o of obsHours) {
    if (inT(o.time) && fin(o.ta)) hrs.set(o.time, { ...o, kind: 'obs' });
  }
  if (current && inT(current.time) && fin(current.ta)) {
    hrs.set(current.time, { ...current, kind: 'obs' });
  }
  for (const h of fc) {
    if (inT(h.time) && !hrs.has(h.time)) hrs.set(h.time, { ...h, kind: 'fcst' });
  }
  const list = [...hrs.values()].sort((a, b) => (a.time < b.time ? -1 : 1));
  const tas = list.filter((h) => fin(h.ta)) as Array<HourPoint & { ta: number }>;

  let outer = '기온 자료 없음';
  let inner = '기온 자료 없음';
  let minTa: number | null = null;
  let maxTa: number | null = null;
  const notes: string[] = [];

  if (tas.length) {
    const cold = tas.reduce((a, b) => (b.ta < a.ta ? b : a));
    const warm = tas.reduce((a, b) => (b.ta > a.ta ? b : a));
    minTa = cold.ta;
    maxTa = warm.ta;
    const o = wearOf(cold.ta);
    const i = wearOf(warm.ta);
    outer = o;
    inner = i;
    const segR = Math.round((warm.ta - cold.ta) * 10) / 10;
    const dd = days.find((d) => d.date === occ.date);
    const dayR = dd && fin(dd.max) && fin(dd.min) ? Math.round((dd.max! - dd.min!) * 10) / 10 : null;
    if (segR >= RULE.easyLayerSeg || (dayR != null && dayR >= RULE.easyLayerDay)) {
      notes.push('벗고 입기 쉬운 겉옷');
    }
  }

  const wsH = list.filter((h) => fin(h.ws)) as Array<HourPoint & { ws: number }>;
  if (wsH.length) {
    const w = wsH.reduce((a, b) => (b.ws > a.ws ? b : a));
    if (w.ws >= RULE.wind) notes.push(`바람 최대 ${w.ws}m/s`);
  }

  const hmHot = list.filter((h) => fin(h.ta) && fin(h.hm) && (h.ta as number) >= RULE.hotT && (h.hm as number) >= RULE.hotRH);
  if (hmHot.length) {
    const x = hmHot.reduce((a, b) => ((b.ta as number) > (a.ta as number) ? b : a));
    notes.push(`기온 ${x.ta}℃·습도 ${x.hm}%`);
  }

  const ov = (h: HourPoint) => {
    const it = h.items?.pty;
    const a = it?.intervalStart || h.time;
    const b = it?.intervalEnd || h.time;
    return a === b ? inT(a) : b > occ.startW && a < occ.endW;
  };
  const fcIn = fc.filter(ov);
  const ptyH = fcIn.filter((h) => ptyText(h.pty));
  const popH = fcIn.filter((h) => fin(h.pop));
  const popMax = popH.length ? Math.max(...popH.map((h) => h.pop as number)) : null;
  if (ptyH.length) {
    const snow = ptyH.some((h) => /눈/.test(String(ptyText(h.pty))));
    notes.unshift(snow ? '눈 예보 · 우산' : '우산');
  } else if (popMax != null && popMax >= RULE.popHigh) {
    notes.unshift(`강수확률 ${popMax}% · 우산 챙기기`);
  }

  const hoursLabel = `${pad(seg.from)}~${pad(seg.to)}시`;
  return {
    id: seg.id,
    label: `${seg.label} (${dayWord(occ.date, todayYmd)} ${seg.from}~${seg.to}시)`,
    hours: hoursLabel,
    outer,
    inner,
    note: notes.join(' · '),
    minTa,
    maxTa,
  };
}

function asTodayExtras(today: ApiRtTodayResponse): {
  current: HourPoint | null;
  obsHours: HourPoint[];
  dayMax: number | null;
  dayMin: number | null;
} {
  const anyToday = today as ApiRtTodayResponse & {
    current?: { time?: string; values?: { ta?: number | null; hm?: number | null; ws?: number | null } };
    day?: { max?: { value?: number | null } | number | null; min?: { value?: number | null } | number | null };
    hours?: Array<{ time: string; obs?: number | null }>;
    hourly?: Array<{ time: string; obs?: number | null }>;
  };
  const cur = anyToday.current;
  const current: HourPoint | null =
    cur?.time && fin(cur.values?.ta)
      ? { time: cur.time.length === 16 ? `${cur.time}:00` : cur.time, ta: cur.values!.ta, hm: cur.values?.hm ?? null, ws: cur.values?.ws ?? null, kind: 'obs' }
      : null;

  const rows = anyToday.hours || anyToday.hourly || [];
  const obsHours: HourPoint[] = rows
    .filter((h) => h?.time && fin(h.obs))
    .map((h) => ({ time: h.time.length === 16 ? `${h.time}:00` : h.time, ta: h.obs as number, kind: 'obs' as const }));

  const maxRaw = anyToday.day?.max;
  const minRaw = anyToday.day?.min;
  const dayMax = typeof maxRaw === 'number' ? maxRaw : maxRaw && typeof maxRaw === 'object' ? maxRaw.value ?? null : null;
  const dayMin = typeof minRaw === 'number' ? minRaw : minRaw && typeof minRaw === 'object' ? minRaw.value ?? null : null;

  return { current, obsHours, dayMax: fin(dayMax) ? dayMax : null, dayMin: fin(dayMin) ? dayMin : null };
}

function mapFcHours(forecast: ApiRtForecastResponse | null | undefined): HourPoint[] {
  return (forecast?.hours || []).map((h) => ({
    time: h.time.length === 16 ? `${h.time}:00` : h.time,
    ta: h.ta,
    hm: h.hm,
    ws: h.ws,
    pty: h.pty,
    pop: h.pop,
    kind: 'fcst' as const,
    items: h.items,
  }));
}

function mapDays(forecast: ApiRtForecastResponse | null | undefined): Array<{ date: string; max?: number | null; min?: number | null }> {
  return (forecast?.days || []).map((d: ApiRtForecastDayItem) => ({
    date: d.date,
    max: d.max ?? d.tmX ?? null,
    min: d.min ?? d.tmN ?? null,
  }));
}

/** weather 히어로 "오늘 뭐 입지?" 한 줄과 같은 요약 */
export function buildOutfitHeadline(
  today: ApiRtTodayResponse | null | undefined,
  forecast: ApiRtForecastResponse | null | undefined
): string | null {
  if (!today) return null;
  const { current, dayMax, dayMin } = asTodayExtras(today);
  const items: string[] = [];
  if (current && fin(current.ta)) items.push(wearOf(current.ta));
  if (fin(dayMax) && fin(dayMin) && dayMax! - dayMin! >= 10) {
    items.push(`일교차 ${Math.round((dayMax! - dayMin!) * 10) / 10}℃, 겉옷`);
  }
  const hs = (forecast?.hours || []).slice(0, 12);
  const ptyH = hs.find((h) => ptyText(h.pty));
  const popH = hs.find((h) => fin(h.pop) && (h.pop as number) >= RULE.popHigh);
  const first = ptyH && (!popH || ptyH.time <= popH.time) ? ptyH : popH;
  if (first && first === ptyH && ptyH) {
    items.push(`☂ ${Number(ptyH.time.slice(11, 13))}시 ${ptyText(ptyH.pty)} 예보, 우산`);
  } else if (popH) {
    items.push(`☂ ${Number(popH.time.slice(11, 13))}시 강수확률 ${popH.pop}%, 우산 챙기기`);
  }
  if (!items.length) return null;
  return `오늘 뭐 입지? ${items.join(' · ')}`;
}

/** 다음 발생 시각 순으로 정렬 (weather segments()와 동일) */
export function buildOutfitSegmentsChronological(
  today: ApiRtTodayResponse | null | undefined,
  forecast: ApiRtForecastResponse | null | undefined,
  segs: SegDef[] = SEG_DEFAULT.map((s) => ({ ...s }))
): ApiRtTodayOutfitSegment[] {
  if (!today) return [];
  const existing = today.summary?.segments;
  if (Array.isArray(existing) && existing.length > 0) return existing;

  const nowW = normalizeNowW(today.now, today.date);
  const todayYmd = nowW.slice(0, 10);
  const { current, obsHours } = asTodayExtras(today);
  const fc = mapFcHours(forecast);
  const days = mapDays(forecast);

  const withStart = segs
    .map((s) => {
      const occ = segOccurrence(s, nowW);
      const seg = buildSegment(s, nowW, obsHours, fc, days, current, todayYmd);
      return seg && occ ? { seg, startW: occ.startW } : null;
    })
    .filter((x): x is { seg: ApiRtTodayOutfitSegment; startW: string } => Boolean(x))
    .sort((a, b) => (a.startW < b.startW ? -1 : 1));

  return withStart.map((x) => x.seg);
}
