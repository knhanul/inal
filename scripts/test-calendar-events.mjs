// src/lib/calendarEvents.ts 순수 함수 검증 — 저장소의 다른 검증(scripts/verify.mjs)과 같은 방식(assert + ✓ 줄)을 따른다.
// 이 파일은 .ts 를 직접 읽는다. Node 22.6+ 는 타입을 그대로 벗겨 읽고, 그보다 낮으면 vite 에 딸린 esbuild 로 바꿔 읽는다.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TS_PATH = path.join(ROOT, 'src/lib/calendarEvents.ts');

async function loadModule() {
  try {
    return await import(pathToFileURL(TS_PATH).href);
  } catch (err) {
    const { transformSync } = await import('esbuild');
    const code = transformSync(fs.readFileSync(TS_PATH, 'utf-8'), { loader: 'ts', format: 'esm' }).code;
    const tmp = path.join(ROOT, 'node_modules/.cache');
    fs.mkdirSync(tmp, { recursive: true });
    const out = path.join(tmp, `calendarEvents.${process.pid}.mjs`);
    fs.writeFileSync(out, code);
    try {
      return await import(pathToFileURL(out).href);
    } finally {
      fs.rmSync(out, { force: true });
    }
  }
}

const { indexEventsByDate, eventsOfYear, shortEventLabel, sameMonthDayEvents } = await loadModule();

// weather.nuni.co.kr /api/calendar/events 에서 실제로 받은 응답과 같은 모양의 표본(값 포함).
const ev = (over) => ({
  id: 'x',
  kind: 'holiday',
  kindLabel: '명절·기념일',
  label: '설날',
  note: null,
  oneOff: false,
  year: 2025,
  yearLabel: null,
  solarDate: '2025-01-29',
  lunarText: '음력 2025년 1월 1일',
  ...over,
});

const EVENTS = [
  ev({ id: 'csat-2026', kind: 'csat', kindLabel: '대학수학능력시험', label: '2026학년도 대학수학능력시험', oneOff: true, yearLabel: '2026학년도', solarDate: '2025-11-13', year: 2025 }),
  ev({ id: 'csat-2015', kind: 'csat', kindLabel: '대학수학능력시험', label: '2015학년도 대학수학능력시험', oneOff: true, yearLabel: '2015학년도', solarDate: '2014-11-13', year: 2014 }),
  ev({ id: 'csat-2009', kind: 'csat', kindLabel: '대학수학능력시험', label: '2009학년도 대학수학능력시험', oneOff: true, yearLabel: '2009학년도', solarDate: '2008-11-13', year: 2008 }),
  ev({ id: 'hak-1991', kind: 'hakryeok', kindLabel: '학력고사', label: '1991학년도 대학입학 학력고사 전기', oneOff: true, yearLabel: '1991학년도', solarDate: '1990-12-18', year: 1990 }),
  ev({ id: 'seollal-2025', solarDate: '2025-01-29', year: 2025 }),
  ev({ id: 'chuseok-2025', label: '추석', solarDate: '2025-10-06', lunarText: '음력 2025년 8월 15일', year: 2025 }),
  ev({ id: 'seollal-2026', solarDate: '2026-02-17', year: 2026, lunarText: '음력 2026년 1월 1일' }),
  ev({ id: 'custom-long', kind: 'custom', kindLabel: '직접 추가', label: '아주 긴 이름의 직접 추가 기념일입니다', oneOff: true, yearLabel: null, solarDate: '2026-05-05', year: 2026 }),
];

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log('=== [1/2] src/lib/calendarEvents.ts 순수 함수 검증 ===');

check('indexEventsByDate: 날짜별로 묶고, 같은 날 이벤트는 배열 순서를 지킨다', () => {
  const map = indexEventsByDate(EVENTS);
  assert.equal(map.get('2025-11-13').length, 1);
  assert.equal(map.get('2025-11-13')[0].id, 'csat-2026');
  assert.deepEqual(
    indexEventsByDate([ev({ id: 'a', solarDate: '2025-01-29' }), ev({ id: 'b', solarDate: '2025-01-29' })]).get('2025-01-29').map((e) => e.id),
    ['a', 'b'],
  );
  assert.equal(map.has('2025-01-01'), false);
  // 날짜가 없는 항목은 조용히 건너뛴다
  assert.equal(indexEventsByDate([ev({ solarDate: '' }), ev({ solarDate: null })]).size, 0);
});

check('eventsOfYear: 양력 날짜의 해로 거르고 날짜 오름차순으로 돌려준다', () => {
  assert.deepEqual(eventsOfYear(EVENTS, 2025).map((e) => e.solarDate), ['2025-01-29', '2025-10-06', '2025-11-13']);
  assert.deepEqual(eventsOfYear(EVENTS, 2026).map((e) => e.solarDate), ['2026-02-17', '2026-05-05']);
  assert.deepEqual(eventsOfYear(EVENTS, 1999), []);
  // 원본 배열을 건드리지 않는다
  assert.notEqual(eventsOfYear(EVENTS, 2025), eventsOfYear(EVENTS, 2025));
});

check('shortEventLabel: 수능·학력고사는 줄이고, 긴 이름은 12자에서 자른다', () => {
  assert.equal(shortEventLabel(EVENTS[0]), '수능');
  assert.equal(shortEventLabel(EVENTS[3]), '학력고사');
  assert.equal(shortEventLabel(EVENTS[4]), '설날');
  const longLabel = EVENTS[7].label; // '아주 긴 이름의 직접 추가 기념일입니다' (16자)
  assert.equal(longLabel.length > 12, true);
  assert.equal(shortEventLabel(EVENTS[7]), `${longLabel.slice(0, 12)}…`);
  assert.equal(shortEventLabel(EVENTS[7]).replace('…', '').length, 12);
  assert.equal(shortEventLabel(EVENTS[7]).endsWith('…'), true);
  // 12자 이하는 자르지 않는다
  const exactly12 = ev({ kind: 'custom', label: '가나다라마바사아자차카타' });
  assert.equal(shortEventLabel(exactly12), '가나다라마바사아자차카타');
});

check('sameMonthDayEvents: 11월 13일 → 역대 수능일 3회를 최근 해부터', () => {
  const hits = sameMonthDayEvents(EVENTS, 11, 13);
  assert.deepEqual(hits.map((h) => h.year), [2025, 2014, 2008]);
  assert.deepEqual(hits.map((h) => h.event.yearLabel), ['2026학년도', '2015학년도', '2009학년도']);
  assert.deepEqual(sameMonthDayEvents(EVENTS, 1, 29).map((h) => h.year), [2025]);
  assert.deepEqual(sameMonthDayEvents(EVENTS, 12, 25), []);
});

check('sameMonthDayEvents: 월·일을 두 자리로 맞춰도 1월 9일/10월 9일을 섞지 않는다', () => {
  const set = [ev({ id: 'jan9', solarDate: '2024-01-09' }), ev({ id: 'oct9', solarDate: '2024-10-09' })];
  assert.deepEqual(sameMonthDayEvents(set, 1, 9).map((h) => h.event.id), ['jan9']);
  assert.deepEqual(sameMonthDayEvents(set, 10, 9).map((h) => h.event.id), ['oct9']);
});

console.log('\n=== [2/2] 프록시 화이트리스트 밖 경로 차단 확인(읽기 전용) ===');
const { matchAllowedRoute } = await import('../server/proxy-config.mjs');
check('/api/calendar/events 만 통과, 쓰기 경로는 차단', () => {
  assert.equal(matchAllowedRoute('/api/calendar/events').allowed, true);
  assert.equal(matchAllowedRoute('/api/calendar/seed').allowed, false);
  assert.equal(matchAllowedRoute('/api/calendar/import').allowed, false);
  assert.equal(matchAllowedRoute('/api/calendar/events/abc').allowed, false);
});

console.log(`\n🎉 특정일 달력 검증 통과! (총 ${passed}개 항목 성공)\n`);
