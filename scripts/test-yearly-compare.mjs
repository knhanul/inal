// 연도별 같은 기간 비교 카드 — 제목/기간/연도 수가 API 응답에서만 나오는지.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { transformSync } from 'esbuild';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = path.join(ROOT, 'node_modules/.cache'); fs.mkdirSync(tmp, { recursive: true });
const out = path.join(tmp, `yearlyCompare.${process.pid}.mjs`);
fs.writeFileSync(out, transformSync(fs.readFileSync(path.join(ROOT, 'src/lib/yearlyCompare.ts'), 'utf8'), { loader: 'ts', format: 'esm' }).code);
const { buildYearlyCompareView } = await import(pathToFileURL(out).href); fs.rmSync(out);

// Production shape (2026-11-11 /api/stats/yearly?station=108): 1990~2026, period 10월 전체.
const real = { 1990: 15.4, 1991: 13.8, 1992: 14, 2022: 14.6, 2023: 15.8, 2024: 16.7, 2025: 16.5, 2026: 16.2 };
const years = Array.from({ length: 37 }, (_, i) => 1990 + i);
const api = { ok: true, period: { key: 'month:10', label: '10월 전체' }, metric: { label: '평균기온' }, fromYear: 1990, toYear: 2026,
  rows: years.map((y) => ({ year: y, value: real[y] ?? 15, days: 31, obs: 31 })) };

test('title states the actual month and actual year range, not a hardcoded window', () => {
  const v = buildYearlyCompareView(api, 'all', '서울');
  assert.equal(v.title, '서울 10월 평균기온 · 1990~2026년');
  assert.equal(v.rows.length, 37);
  assert.deepEqual(v.shown.map((r) => r.year), [2026, 2025, 2024, 2023, 2022]);
  assert.equal(v.hiddenCount, 32);
  assert.match(v.summary, /1990~2026년 37개 해 평균/);
  assert.match(v.summary, /가장 높은 해 2024년 16\.7℃/);
  assert.match(v.summary, /가장 낮은 해 1991년 13\.8℃/);
});
test('expanded shows every year newest first', () => {
  const v = buildYearlyCompareView(api, 'all', '서울', true);
  assert.equal(v.shown.length, 37); assert.equal(v.shown[0].year, 2026); assert.equal(v.shown.at(-1).year, 1990);
});
test('최근 10년 / 5년 pills restrict the window to the latest actual years', () => {
  const r10 = buildYearlyCompareView(api, 'r10', '서울');
  assert.equal(r10.title, '서울 10월 평균기온 · 2017~2026년'); assert.equal(r10.rows.length, 10);
  const r5 = buildYearlyCompareView(api, 'r5', '서울');
  assert.equal(r5.title, '서울 10월 평균기온 · 2022~2026년'); assert.equal(r5.hiddenCount, 0);
});
test('missing values are excluded from summary, never zero; empty response says no data', () => {
  const gap = { ...api, rows: [{ year: 2024, value: null }, { year: 2025, value: 16.5 }, { year: 2026, value: 16.2 }] };
  const v = buildYearlyCompareView(gap, 'all', '서울');
  assert.match(v.summary, /2개 해 평균 16\.4℃/); assert.doesNotMatch(v.summary, /0\.0℃/);
  const empty = buildYearlyCompareView({ ok: true, rows: [] }, 'all', '서울');
  assert.equal(empty.title, '서울 같은 기간 평균기온 · 자료 없음'); assert.match(empty.summary, /자료가 없어요/);
});
test('ComparePage no longer hardcodes 1990/2025 or slices to five without a way to see all years', () => {
  const src = fs.readFileSync(path.join(ROOT, 'src/pages/ComparePage.tsx'), 'utf8');
  const card = src.slice(src.indexOf('const renderYearlyCompareCard'), src.indexOf('const renderRegionStatsCard'));
  assert.doesNotMatch(card, /1990|2025|slice\(-5\)/);
  assert.match(card, /buildYearlyCompareView\(raw, basis/); assert.match(card, /aria-expanded/);
});
