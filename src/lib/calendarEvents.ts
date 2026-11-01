/**
 * 특정일 달력(설날·추석·수능·학력고사) 다루기 — React 와 무관한 순수 함수만 둔다.
 * 날짜는 서버가 이미 양력(solarDate: 'YYYY-MM-DD')으로 바꿔 주므로 여기서 음력을 다시 계산하지 않는다.
 */
import type { ApiCalendarEvent } from '../types/api';

/** 'YYYY-MM-DD' → 그 날의 특정일 목록. 같은 날 시험과 명절이 겹칠 수 있어 배열로 둔다. */
export function indexEventsByDate(events: ApiCalendarEvent[]): Map<string, ApiCalendarEvent[]> {
  const map = new Map<string, ApiCalendarEvent[]>();
  for (const e of events) {
    if (!e || typeof e.solarDate !== 'string' || e.solarDate.length < 10) continue;
    const hit = map.get(e.solarDate);
    if (hit) hit.push(e);
    else map.set(e.solarDate, [e]);
  }
  return map;
}

/** 그 해(양력 날짜의 해) 특정일 — 날짜 오름차순. */
export function eventsOfYear(events: ApiCalendarEvent[], year: number): ApiCalendarEvent[] {
  return events
    .filter((e) => typeof e.solarDate === 'string' && Number(e.solarDate.slice(0, 4)) === year)
    .slice()
    .sort((a, b) => a.solarDate.localeCompare(b.solarDate));
}

/** 칩·배지에 쓰는 짧은 이름. 수능·학력고사는 줄여 쓰고, 긴 이름은 12자에서 자른다. */
export function shortEventLabel(e: ApiCalendarEvent): string {
  if (e.kind === 'csat') return '수능';
  if (e.kind === 'hakryeok') return '학력고사';
  const label = (e.label || '').trim();
  if (label.length <= 12) return label;
  return `${label.slice(0, 12)}…`;
}

/**
 * 고른 '월·일'에 열린 역대 특정일 — 연도 내림차순(최근 해부터).
 * 이날 날짜 카드는 월·일만 고르므로, 예를 들어 11월 13일을 고르면 역대 수능일 중 11월 13일에 열린 해들이 나온다.
 */
export function sameMonthDayEvents(
  events: ApiCalendarEvent[],
  month: number,
  day: number,
): Array<{ year: number; event: ApiCalendarEvent }> {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const suffix = `-${mm}-${dd}`;
  return events
    .filter((e) => typeof e.solarDate === 'string' && e.solarDate.slice(4) === suffix)
    .map((e) => ({ year: Number(e.solarDate.slice(0, 4)), event: e }))
    .sort((a, b) => b.year - a.year);
}
