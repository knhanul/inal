// src/lib/dateSeries.ts 순수 함수 검증 — 저장소의 다른 검증(scripts/test-calendar-events.mjs)과 같은 방식(assert + ✓ 줄).
// 이 파일은 .ts 를 직접 읽는다. Node 22.6+ 는 타입을 그대로 벗겨 읽고, 그보다 낮으면 vite 에 딸린 esbuild 로 바꿔 읽는다.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TS_PATH = path.join(ROOT, 'src/lib/dateSeries.ts');

async function loadModule(file) {
  try {
    return await import(pathToFileURL(file).href);
  } catch (err) {
    const { transformSync } = await import('esbuild');
    const code = transformSync(fs.readFileSync(file, 'utf-8'), { loader: 'ts', format: 'esm' }).code;
    const tmp = path.join(ROOT, 'node_modules/.cache');
    fs.mkdirSync(tmp, { recursive: true });
    const out = path.join(tmp, `${path.basename(file, '.ts')}.${process.pid}.mjs`);
    fs.writeFileSync(out, code);
    try {
      return await import(pathToFileURL(out).href);
    } finally {
      fs.rmSync(out, { force: true });
    }
  }
}

const L = await loadModule(TS_PATH);

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

// weather.nuni.co.kr /api/stats/date-series?s​tn=108&kind=csat 응답에서 뽑은 표본(값 포함).
const pt = (over) => ({
  eventId: 'e',
  kind: 'csat',
  label: '2026학년도 대학수학능력시험',
  yearLabel: '2026학년도',
  note: null,
  oneOff: true,
  year: 2025,
  solarDate: '2025-11-13',
  lunarText: '음력 2025년 9월 24일',
  dateStatus: 'ok',
  rowPresent: true,
  values: { avg: 11.1, max: 17.6, min: 6.7, rain: 0, wind: 1.7, hum: 65.4, nsnow: 0, range: 10.9 },
  ...over,
});

const POINTS = [
  pt({ year: 1998, yearLabel: '1999학년도', solarDate: '1998-11-18', values: { avg: -3, max: 0.7, min: -5.3, rain: 0, nsnow: 0, range: 6 } }),
  pt({ year: 2015, yearLabel: '2016학년도', solarDate: '2015-11-12', values: { avg: 14.8, max: 21, min: 8.6, rain: 0, nsnow: 0, range: 12.4 } }),
  pt({ year: 2023, yearLabel: '2024학년도', solarDate: '2023-11-16', values: { avg: 6.6, max: 7.4, min: 5.7, rain: 8.4, nsnow: 0, range: 1.7 } }),
  pt({ year: 2024, yearLabel: '2025학년도', solarDate: '2024-11-14', values: { avg: 14.8, max: 16.8, min: 13.2, rain: 0.1, nsnow: 0, range: 3.6 } }),
  pt({ year: 2025, yearLabel: '2026학년도', solarDate: '2025-11-13', values: { avg: 11.1, max: 17.6, min: 6.7, rain: 0, nsnow: 0, range: 10.9 } }),
  pt({
    year: 2026,
    yearLabel: '2027학년도',
    solarDate: '2026-11-19',
    dateStatus: 'future',
    rowPresent: false,
    values: { avg: null, max: null, min: null, rain: null, nsnow: null, range: null },
  }),
];

const SUMMARY = {
  max: { n: 5, mean: 12.7, min: 0.7, max: 21, minYears: [1998], maxYears: [2015] },
  min: { n: 5, mean: 5.8, min: -5.3, max: 13.2, minYears: [1998], maxYears: [2024] },
  avg: { n: 5, mean: 8.9, min: -3, max: 14.8 },
  rainCount: { k: 2, n: 5, share: 40, hitYears: [2023, 2024] },
  extremes: {
    hottest: { value: 21, yearLabel: '2016학년도', solarDate: '2015-11-12', year: 2015, years: [2015], tie: false },
    coldest: { value: -5.3, yearLabel: '1999학년도', solarDate: '1998-11-18', year: 1998, years: [1998], tie: false },
    wettest: { value: 8.4, yearLabel: '2024학년도', solarDate: '2023-11-16', year: 2023, years: [2023], tie: false },
  },
  excluded: [{ year: 2026, yearLabel: '2027학년도', label: '2027학년도 대학수학능력시험', solarDate: '2026-11-19', dateStatus: 'future', reason: 'future', reasonText: '아직 관측되지 않음' }],
  recent10: {
    fromYear: 2017,
    toYear: 2026,
    label: '최근 10년(2017~2026)',
    points: 10,
    max: { n: 9, mean: 11.63, min: 4.2, max: 17.6 },
    min: { n: 9, mean: 4.01, min: -2.5, max: 13.2 },
    avg: { n: 9, mean: 7.47, min: 0.7, max: 14.8 },
    rainCount: { k: 3, n: 9, share: 33.3 },
  },
};

console.log('=== [1/5] 날짜·이름 표기 (순수 함수) ===');

check('weekdayOf: 2024-11-14 는 목요일, 2026-11-19 는 목요일, 잘못된 날짜는 빈 문자열', () => {
  assert.equal(L.weekdayOf('2024-11-14'), '목');
  assert.equal(L.weekdayOf('2026-11-19'), '목');
  assert.equal(L.weekdayOf('2023-11-16'), '목');
  assert.equal(L.weekdayOf('2025-10-06'), '월'); // 2025년 추석
  assert.equal(L.weekdayOf(''), '');
  assert.equal(L.weekdayOf('2024-13-01'), '');
  assert.equal(L.weekdayOf('abc'), '');
});

check('formatSeriesDate*: 표·그래프·요약에 쓰는 날짜 문구가 한 가지 모양으로 나온다', () => {
  assert.equal(L.formatSeriesDateShort('2024-11-14'), '11.14');
  assert.equal(L.formatSeriesDateKo('2024-11-14'), '11월 14일');
  assert.equal(L.formatSeriesDateWithWeekday('2024-11-14'), '11.14 (목)');
  assert.equal(L.formatSeriesDateShort(''), '');
});

check('shortLunarText: 긴 음력 문구를 짧게 줄이고, 해석 못 하면 원문을 그대로 둔다', () => {
  assert.equal(L.shortLunarText('음력 2025년 9월 24일'), '음 9.24');
  assert.equal(L.shortLunarText('음력 1994년 10월 21일'), '음 10.21');
  assert.equal(L.shortLunarText(null), '');
  assert.equal(L.shortLunarText('윤달 정보 없음'), '윤달 정보 없음');
});

check('seriesYearText / seriesShortYearText: 학년도가 있으면 학년도, 없으면 연도', () => {
  assert.equal(L.seriesYearText({ year: 2025, yearLabel: '2026학년도' }), '2026학년도');
  assert.equal(L.seriesYearText({ year: 2025, yearLabel: null }), '2025년');
  assert.equal(L.seriesShortYearText({ year: 2025, yearLabel: '2026학년도' }), '2026');
  assert.equal(L.seriesShortYearText({ year: 2025, yearLabel: null }), '2025');
});

check('seriesBasisWord: 시험은 "실제 시행일", 명절은 "실제 날짜"', () => {
  assert.equal(L.seriesBasisWord('csat'), '실제 시행일');
  assert.equal(L.seriesBasisWord('hakryeok'), '실제 시행일');
  assert.equal(L.seriesBasisWord('holiday'), '실제 날짜');
  assert.equal(L.seriesBasisWord('custom'), '실제 날짜');
});

check('seriesNameText: 서버가 준 이름을 우선하고, 없으면 종류 이름', () => {
  assert.equal(L.seriesNameText({ name: '수능일', kind: 'csat', label: null }), '수능일');
  assert.equal(L.seriesNameText({ name: '추석', kind: 'holiday', label: '추석' }), '추석');
  assert.equal(L.seriesNameText({ name: '', kind: 'holiday', label: '추석' }), '추석');
  assert.equal(L.seriesNameText({ name: '', kind: 'csat', label: null }), '대학수학능력시험');
  assert.equal(L.seriesNameText(null), '특정일');
});

console.log('\n=== [2/5] 칩 → 특정일 모드 전환 대상 ===');

check('seriesTargetForEvent: 수능·학력고사는 종류 전체(label 없음), 명절·직접추가는 이름까지', () => {
  assert.deepEqual(L.seriesTargetForEvent({ kind: 'csat', label: '2027학년도 대학수학능력시험' }), { kind: 'csat' });
  assert.deepEqual(L.seriesTargetForEvent({ kind: 'hakryeok', label: '1991학년도 대학입학 학력고사 전기' }), { kind: 'hakryeok' });
  assert.deepEqual(L.seriesTargetForEvent({ kind: 'holiday', label: '추석' }), { kind: 'holiday', label: '추석' });
  assert.deepEqual(L.seriesTargetForEvent({ kind: 'custom', label: '우리 집 기념일' }), { kind: 'custom', label: '우리 집 기념일' });
  // 이름이 비면 종류만
  assert.deepEqual(L.seriesTargetForEvent({ kind: 'holiday', label: '' }), { kind: 'holiday' });
  assert.deepEqual(L.seriesTargetForEvent({ kind: 'holiday', label: '  ' }), { kind: 'holiday' });
});

check('defaultSeriesFrom: 수능 1994 · 학력고사 1981 · 명절 1990(모르는 종류도 1990)', () => {
  assert.equal(L.defaultSeriesFrom('csat'), 1994);
  assert.equal(L.defaultSeriesFrom('hakryeok'), 1981);
  assert.equal(L.defaultSeriesFrom('holiday'), 1990);
  assert.equal(L.defaultSeriesFrom('custom'), 1990);
  assert.equal(L.defaultSeriesFrom('??'), 1990);
});

check('seriesTargetKey / resolveSeriesTargetFromSearch / seriesSearchSuffix: 주소 왕복(새로고침·뒤로 가기)', () => {
  assert.equal(L.seriesTargetKey({ kind: 'csat' }), 'csat');
  assert.equal(L.seriesTargetKey({ kind: 'holiday', label: '추석' }), 'holiday|추석');
  assert.equal(L.seriesTargetKey(null), '');

  const suffix = L.seriesSearchSuffix({ kind: 'holiday', label: '추석' });
  assert.equal(suffix, 'series=holiday&seriesLabel=%EC%B6%94%EC%84%9D');
  assert.deepEqual(L.resolveSeriesTargetFromSearch(`?tab=story&${suffix}`), { kind: 'holiday', label: '추석' });
  assert.deepEqual(L.resolveSeriesTargetFromSearch('?series=csat'), { kind: 'csat' });
  assert.deepEqual(L.resolveSeriesTargetFromSearch(`?${suffix}`), { kind: 'holiday', label: '추석' });
  assert.equal(L.resolveSeriesTargetFromSearch('?tab=story'), null);
  assert.equal(L.resolveSeriesTargetFromSearch(''), null);
  assert.equal(L.seriesSearchSuffix(null), '');
});

console.log('\n=== [3/5] 상태 문구·값 표기 ===');

check('pointStatusText: future 는 "관측 전", 행이 없으면 "자료 없음", 있으면 서버 문구', () => {
  const statusText = { ok: '자료 있음', future: '아직 관측되지 않음', missing: '자료 없음' };
  assert.equal(L.pointStatusText(POINTS[5], statusText), '관측 전');
  assert.equal(L.pointStatusText({ dateStatus: 'ok', rowPresent: false }, statusText), '자료 없음');
  assert.equal(L.pointStatusText({ dateStatus: 'ok', rowPresent: true }, statusText), '자료 있음');
  assert.equal(L.pointStatusText({ dateStatus: 'range', rowPresent: false }, statusText), '자료 없음');
  // statusText 가 없어도 문구가 나온다
  assert.equal(L.pointStatusText(POINTS[0]), '자료 있음');
});

check('pointHasData: 관측 전·자료 없음은 값이 있는 것으로 치지 않는다(0으로 채우지 않음)', () => {
  assert.equal(L.pointHasData(POINTS[0]), true);
  assert.equal(L.pointHasData(POINTS[5]), false);
  assert.equal(L.pointHasData({ dateStatus: 'ok', rowPresent: false }), false);
  assert.equal(L.pointHasData({ dateStatus: 'future', rowPresent: true }), false);
});

check('tempText / rainText: 없는 값은 "자료 없음"(0℃·0mm 로 바꾸지 않음)', () => {
  assert.equal(L.tempText(17.6), '17.6℃');
  assert.equal(L.tempText(-5.3), '-5.3℃');
  assert.equal(L.tempText(0), '0.0℃');
  assert.equal(L.tempText(null), '자료 없음');
  assert.equal(L.tempText(undefined), '자료 없음');
  assert.equal(L.rainText(8.4), '8.4mm');
  assert.equal(L.rainText(0), '0.0mm');
  assert.equal(L.rainText(null), '자료 없음');
});

console.log('\n=== [4/5] 기온 선 그래프 좌표 ===');

check('pickTickIndices: 처음·끝을 넣고 고르게 솎는다, 점이 적으면 전부', () => {
  assert.deepEqual(L.pickTickIndices(3), [0, 1, 2]);
  assert.deepEqual(L.pickTickIndices(5), [0, 1, 2, 3, 4]);
  assert.deepEqual(L.pickTickIndices(33), [0, 8, 16, 24, 32]);
  assert.deepEqual(L.pickTickIndices(6), [0, 1, 3, 4, 5]);
  assert.deepEqual(L.pickTickIndices(0), []);
  // 솎은 눈금은 중복이 없고 항상 5개 이하
  const ticks = L.pickTickIndices(37);
  assert.equal(ticks.length <= 5, true);
  assert.equal(new Set(ticks).size, ticks.length);
  assert.equal(ticks[0], 0);
  assert.equal(ticks[ticks.length - 1], 36);
});

check('buildSeriesChart: 점 순서대로 x 를 잡고, 값이 없는 해에서 선을 끊는다', () => {
  const geo = L.buildSeriesChart(POINTS, { width: 268, height: 200 });
  assert.equal(geo.xPositions.length, POINTS.length);
  // x 는 왼쪽에서 오른쪽으로 늘어난다(실제 시행일 순서)
  for (let i = 1; i < geo.xPositions.length; i += 1) assert.equal(geo.xPositions[i] > geo.xPositions[i - 1], true);
  // 자료가 있는 점 5개 + 관측 전 1개는 점을 찍지 않는다
  assert.equal(geo.dots.length, 5);
  // 선은 관측 전에서 끊겨 두 줄기(자료 5개가 연속이라 한 줄기) — 마지막 점 뒤로 이어지지 않는다
  assert.equal(geo.maxLines.length, 1);
  assert.equal(geo.minLines.length, 1);
  assert.equal(geo.maxLines[0].split(' ').length, 5);
  assert.equal(geo.missingXs.length, 1);
  // 모든 좌표가 viewBox 안에 들어간다(가로 스크롤 없이 그리기 위한 조건)
  for (const d of geo.dots) {
    assert.equal(d.x >= 0 && d.x <= geo.width, true);
    assert.equal(d.yMax >= geo.plotTop - 0.5 && d.yMax <= geo.plotBottom + 0.5, true);
    assert.equal(d.yMin >= geo.plotTop - 0.5 && d.yMin <= geo.plotBottom + 0.5, true);
  }
  // 최고기온 선은 최저기온 선보다 항상 위(작은 y)
  for (const d of geo.dots) assert.equal(d.yMax <= d.yMin, true);
});

check('buildSeriesChart: 중간에 빠진 해가 있으면 선을 두 줄기로 끊는다', () => {
  const withHole = [POINTS[0], POINTS[1], pt({ year: 2000, yearLabel: '2001학년도', solarDate: '2000-11-15', dateStatus: 'ok', rowPresent: false, values: { avg: null, max: null, min: null, rain: null } }), POINTS[3], POINTS[4]];
  const geo = L.buildSeriesChart(withHole);
  assert.equal(geo.dots.length, 4);
  assert.equal(geo.maxLines.length, 2);
  assert.equal(geo.minLines.length, 2);
  assert.equal(geo.missingXs.length, 1);
});

check('buildSeriesChart: x축 눈금은 학년도(위)와 실제 월·일(아래)을 함께 준다', () => {
  const geo = L.buildSeriesChart(POINTS, { maxTicks: 3 });
  assert.equal(geo.xTicks.length, 3);
  assert.equal(geo.xTicks[0].yearText, '1999');
  assert.equal(geo.xTicks[0].mdText, '11.18');
  assert.equal(geo.xTicks[geo.xTicks.length - 1].yearText, '2027');
  assert.equal(geo.xTicks[geo.xTicks.length - 1].mdText, '11.19');
  // 첫·끝 눈금은 카드 밖으로 글자가 넘치지 않게 정렬을 바꾼다
  assert.equal(geo.xTicks[0].anchor, 'start');
  assert.equal(geo.xTicks[geo.xTicks.length - 1].anchor, 'end');
});

check('buildSeriesChart: 값이 하나도 없어도 터지지 않고 빈 그래프 좌표를 준다', () => {
  const empty = L.buildSeriesChart([]);
  assert.deepEqual(empty.dots, []);
  assert.deepEqual(empty.maxLines, []);
  assert.equal(empty.xPositions.length, 0);
  const onlyFuture = L.buildSeriesChart([POINTS[5]]);
  assert.equal(onlyFuture.dots.length, 0);
  assert.equal(onlyFuture.xPositions.length, 1);
});

check('buildSeriesChart: 세로 눈금은 값 범위를 덮고, 눈금 수가 지나치게 많지 않다', () => {
  const geo = L.buildSeriesChart(POINTS);
  assert.equal(geo.yTicks.length >= 2, true);
  assert.equal(geo.yTicks.length <= 7, true);
  const values = geo.yTicks.map((t) => t.value);
  assert.equal(Math.min(...values) <= -5.3, true);
  assert.equal(Math.max(...values) >= 21, true);
  // 값이 커질수록 화면 위쪽(y 가 작다)
  for (let i = 1; i < geo.yTicks.length; i += 1) assert.equal(geo.yTicks[i].y < geo.yTicks[i - 1].y, true);
});

console.log('\n=== [5/5] 요약 문장·표·프록시 화이트리스트 ===');

check('buildSeriesSummaryLines: 더웠던 해·추웠던 해·비 온 해·최근 10년 평균 (값은 API 응답에서만)', () => {
  const lines = L.buildSeriesSummaryLines(SUMMARY, { kind: 'csat' });
  assert.equal(lines.length, 3);
  assert.match(lines[0], /2016학년도/);
  assert.match(lines[0], /21\.0℃/);
  assert.match(lines[0], /11월 12일/);
  assert.match(lines[0], /1999학년도/);
  assert.match(lines[0], /-5\.3℃/);
  assert.match(lines[1], /5번 중 2번/);
  assert.match(lines[1], /40%/);
  assert.match(lines[2], /최근 10년\(2017~2026\)/);
  assert.match(lines[2], /11\.6℃/);
  assert.match(lines[2], /4\.0℃/);
});

check('buildSeriesSummaryLines: 없는 값은 그 문장을 뺀다(0·가짜 값으로 채우지 않음)', () => {
  assert.deepEqual(L.buildSeriesSummaryLines(null), []);
  const noExtremes = {
    ...SUMMARY,
    extremes: { hottest: { ...SUMMARY.extremes.hottest, value: null }, coldest: { ...SUMMARY.extremes.coldest, value: null } },
    rainCount: { k: 0, n: 0, share: 0, hitYears: [] },
    recent10: { ...SUMMARY.recent10, max: { ...SUMMARY.recent10.max, mean: null } },
  };
  assert.deepEqual(L.buildSeriesSummaryLines(noExtremes), []);
  // 한쪽만 있어도 그 문장만 만든다
  const onlyHot = { ...SUMMARY, extremes: { ...SUMMARY.extremes, coldest: { ...SUMMARY.extremes.coldest, value: null } } };
  assert.match(L.buildSeriesSummaryLines(onlyHot)[0], /가장 더웠던 해는/);
  assert.equal(L.buildSeriesSummaryLines(onlyHot)[0].includes('가장 추웠던'), false);
});

check('buildSeriesSummaryLines: 공동 기록은 함께 적는다(추석 1990·2017 최저 10.7℃)', () => {
  const tie = {
    ...SUMMARY,
    extremes: {
      hottest: { ...SUMMARY.extremes.hottest, value: 33.2, yearLabel: null, year: 2024, solarDate: '2024-09-17' },
      coldest: { value: 10.7, yearLabel: null, year: 1990, solarDate: '1990-10-03', years: [1990, 2017], tie: true },
    },
  };
  const line = L.buildSeriesSummaryLines(tie, { kind: 'holiday' })[0];
  assert.match(line, /2024년\(9월 17일\) 33\.2℃/);
  assert.match(line, /1990년\(10월 3일\) 10\.7℃ \(1990·2017년 공동\)/);
});

check('buildSeriesRows: 최근 해부터, 관측 전은 값 없이 "관측 전", note 는 그대로', () => {
  const rows = L.buildSeriesRows([...POINTS.slice(0, 4), { ...POINTS[4], note: '포항 지진으로 1주 연기' }, POINTS[5]], { ok: '자료 있음' });
  assert.equal(rows.length, 6);
  assert.equal(rows[0].yearText, '2027학년도');
  assert.equal(rows[0].hasData, false);
  assert.equal(rows[0].max, null);
  assert.equal(rows[0].statusText, '관측 전');
  assert.equal(rows[1].yearText, '2026학년도');
  assert.equal(rows[1].note, '포항 지진으로 1주 연기');
  assert.equal(rows[1].max, 17.6);
  assert.equal(rows[1].min, 6.7);
  assert.equal(rows[1].dateText, '11.13 (목)');
  assert.equal(rows[1].lunarText, '음 9.24');
  assert.equal(rows[5].yearText, '1999학년도');
  assert.equal(rows[5].index, 0); // 원래 점 순서(그래프 선택과 맞추기)
});

check('buildSeriesRows: 비 0mm 와 자료 없음(null)을 구분한다', () => {
  const rows = L.buildSeriesRows([pt({ rain: 0 }), pt({ dateStatus: 'ok', rowPresent: false, values: { avg: null, max: null, min: null, rain: null } })]);
  assert.equal(rows[1].rain, 0);
  assert.equal(rows[0].rain, null);
  assert.equal(rows[0].statusText, '자료 없음');
});

check('seriesBasisText: 제목·출처에 쓰는 기간 문구', () => {
  assert.equal(L.seriesBasisText('csat', 1994, 2026), '1994~2026년 · 실제 시행일 기준');
  assert.equal(L.seriesBasisText('holiday', 1990, 2026), '1990~2026년 · 실제 날짜 기준');
});

const { ALLOWED_READONLY_ROUTES, matchAllowedRoute, sanitizeSearchParams } = await import('../server/proxy-config.mjs');

check('프록시: /api/stats/date-series 는 읽기 전용으로 통과하고 읽기 전용 목록이 21개', () => {
  const route = matchAllowedRoute('/api/stats/date-series');
  assert.equal(route.allowed, true);
  assert.equal(route.route.ttlSeconds, 600);
  assert.equal(route.route.category, 'stats');
  assert.equal(ALLOWED_READONLY_ROUTES.length, 21);
  // 원래 있던 경로가 그대로 남아 있다(목록 보존)
  for (const p of ['/api/stats/date-weather', '/api/stats/date-battle', '/api/calendar/events', '/api/stats/highlights']) {
    assert.equal(matchAllowedRoute(p).allowed, true, `${p} 는 그대로 허용`);
  }
  // 쓰기 경로는 없다
  for (const p of ['/api/stats/date-series/seed', '/api/stats/date-series/write', '/api/admin/date-series', '/api/collect/date-series']) {
    assert.equal(matchAllowedRoute(p).allowed, false, `${p} 는 차단`);
  }
});

check('프록시: date-series 쿼리에서 kind · label · from · to · format 만 통과한다', () => {
  const cleaned = sanitizeSearchParams(
    new URLSearchParams('stn=108&kind=holiday&label=추석&from=1990&to=2026&format=csv&evil=1&sql=drop'),
    '/api/stats/date-series',
  );
  assert.equal(cleaned.get('stn'), '108'); // date-* 계열은 stn 으로 넘긴다
  assert.equal(cleaned.get('kind'), 'holiday');
  assert.equal(cleaned.get('label'), '추석');
  assert.equal(cleaned.get('from'), '1990');
  assert.equal(cleaned.get('to'), '2026');
  assert.equal(cleaned.get('format'), 'csv');
  assert.equal(cleaned.has('evil'), false);
  assert.equal(cleaned.has('sql'), false);
  assert.equal(cleaned.has('station'), false);
});

console.log(`\n🎉 특정일 '해마다 실제 날짜' 검증 통과! (총 ${passed}개 항목 성공)\n`);
