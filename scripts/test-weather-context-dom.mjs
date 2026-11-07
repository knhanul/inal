// Pure DOM regression tests (jsdom), not a real browser or screenshot automation.
import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { mountWeatherContext } from "../public/weather-context.mjs";
const tick = () => new Promise((r) => setTimeout(r, 0));
async function ready(root) {
  for (let i = 0; i < 50; i++) {
    await tick();
    if (!root.querySelector("[aria-busy]")) return;
  }
  throw Error("renderer did not finish");
}
function setup(respond) {
  const dom = new JSDOM(
    '<!doctype html><html><head></head><body><div id="root"></div></body></html>',
    { url: "http://localhost/" },
  );
  globalThis.document = dom.window.document;
  globalThis.FormData = dom.window.FormData;
  const requests = [];
  globalThis.fetch = async (url) => {
    requests.push(String(url));
    return {
      ok: true,
      json: async () =>
        String(url) === "/api/stations"
          ? [{ station_id: "108", station_name: "서울" }]
          : respond(new URL(url, "http://localhost")),
    };
  };
  return { dom, root: document.querySelector("#root"), requests };
}
const battle = {
  ok: true,
  station: { name: "서울" },
  date1: "2026-11-06",
  date2: "2026-11-05",
  kind: "완료된 하루 공식 관측",
  fieldNote: "일평균기온",
  rows: [
    {
      label: "더 선선한 날",
      a: 6.9,
      b: 14,
      unit: "℃",
      winner: "A",
      reason: "기준 날 승 — 더 선선한 날 기준, 차이 7.1℃",
      tie: 0.5,
      samples: 1,
    },
  ],
  wins: { A: 1, B: 0, draw: 0, unavailable: 0 },
  available: { first: "1970-01-01", last: "2026-11-06" },
  window: null,
  policy: "선택한 조건에서만 승패",
};
test("battle controls submit actual opponent, criteria and period; empty selection rejected", async () => {
  const { root, dom, requests } = setup(() => battle);
  const cleanup = mountWeatherContext(root, { mode: "battle" });
  await ready(root);
  assert.match(root.textContent, /기준 6.9℃ \/ 상대 14.0℃/);
  assert.equal(
    new URL(
      requests.find((u) => u.includes("context-battle")),
      "http://local",
    ).searchParams.get("date1"),
    null,
  );
  assert.equal(root.querySelector("[name=date1]").value, "2026-11-06");
  assert.match(root.textContent, /7.1℃/);
  const form = root.querySelector("form");
  const opponent = form.querySelector("[name=opponent]");
  opponent.value = "custom";
  opponent.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  assert.equal(form.querySelector(".wc-custom").hidden, false);
  form.elements.date2.value = "2024-02-29";
  form.elements.period.value = "all";
  form.dispatchEvent(
    new dom.window.Event("submit", { bubbles: true, cancelable: true }),
  );
  await ready(root);
  const q = new URL(requests.at(-1), "http://local").searchParams;
  assert.equal(q.get("opponent"), "custom");
  assert.equal(q.get("date2"), "2024-02-29");
  assert.equal(q.get("period"), "all");
  assert.equal(q.get("criteria"), "cooler,dry,calm");
  root.querySelector(".wc-last").click();
  await ready(root);
  assert.equal(form.elements.date1.value, "2026-11-06");
  for (const input of form.querySelectorAll("[name=criteria]"))
    input.checked = false;
  const before = requests.length;
  form.dispatchEvent(new dom.window.Event("submit", { cancelable: true }));
  await ready(root);
  assert.equal(requests.length, before);
  assert.match(root.textContent, /하나 이상/);
  cleanup();
  assert.equal(root.childNodes.length, 0);
  dom.window.close();
});
test("today unavailable is not rendered as zero; missing graph and evidence stay expandable", async () => {
  const { root, dom } = setup(() => ({
    ok: true,
    station: { name: "서울" },
    available: false,
    message: "오늘 관측 없음",
    value: null,
    diff: null,
    previous: null,
    recent7: { mean: null, days: null, computed: false, diff: null },
    extras: [],
    series: [{ hour: 0, today: null, yesterday: null }],
    recentDays: [{ date: "2026-11-07", max: null, min: null }],
    policy: "같은 정시",
    thresholds: "서비스 기준",
  }));
  const stop = mountWeatherContext(root, { mode: "today", compact: true });
  await ready(root);
  assert.match(root.textContent, /비교할 자료가 없어요/);
  assert.doesNotMatch(root.textContent, /0\.0℃/);
  assert.equal(root.querySelector("details").open, false);
  assert.doesNotMatch(root.textContent, /0\/7일/);
  assert.match(root.textContent, /계산하지 않았어요/);
  stop();
  dom.window.close();
});
test("season year/name controls and selected year vs multiple years remain distinct; text escaped", async () => {
  const sample = { mean: 10, days: 14, expected: 14 };
  const { root, dom, requests } = setup(() => ({
    ok: true,
    name: "입춘",
    question: "입춘이면 따뜻해질까?",
    station: { name: "<img src=x onerror=bad()>" },
    selected: {
      year: 2025,
      date: "2025-02-03",
      value: 12,
      adjacent: sample,
      before: { ...sample, days: 7, expected: 7 },
      after: { ...sample, days: 7, expected: 7 },
      diff: 2,
      change: 0,
      summer: null,
      winter: null,
      firstFreeze: null,
      laterCold: null,
    },
    history: { from: 2021, to: 2024, years: 3, excluded: 1, meanDiff: 0.3 },
    points: [],
    available: { first: "2021-01-01", last: "2026-11-06" },
    calendar: { method: "KST 날짜 계산", links: [] },
    policy: "관측만",
  }));
  const stop = mountWeatherContext(root, { mode: "season" });
  await ready(root);
  const form = root.querySelector("form");
  form.elements.year.value = "2025";
  form.elements.name.value = "입춘";
  form.dispatchEvent(new dom.window.Event("submit", { cancelable: true }));
  await ready(root);
  const q = new URL(requests.at(-1), "http://local").searchParams;
  assert.equal(q.get("year"), "2025");
  assert.equal(q.get("name"), "입춘");
  assert.match(root.textContent, /선택한 해/);
  assert.match(root.textContent, /완전한 3개 해/);
  assert.equal(root.querySelector("img"), null);
  stop();
  dom.window.close();
});
test("cleanup prevents late request overwriting a new station view", async () => {
  const { root, dom } = setup(() => battle);
  const stop = mountWeatherContext(root, { mode: "battle" });
  stop();
  await tick();
  assert.equal(root.childNodes.length, 0);
  dom.window.close();
});

test("resolved identical comparisons are cached across repeated mounts, no extra network requests", async () => {
  const { root, dom, requests } = setup(() => battle);
  let stop = mountWeatherContext(root, { mode: "battle", station: "112" });
  await ready(root);
  stop();
  stop = mountWeatherContext(root, { mode: "battle", station: "112" });
  await ready(root);
  assert.equal(requests.filter((u) => u.includes("context-battle?")).length, 1);
  stop();
  dom.window.close();
});
test("no spring observations are labeled unavailable, not zero freezing days", async () => {
  const { root, dom } = setup(() => ({
    ok: true,
    name: "입춘",
    question: "입춘이면 따뜻해질까?",
    station: { name: "인천" },
    selected: {
      date: "2025-02-03",
      value: null,
      adjacent: { mean: null, days: 0, expected: 14 },
      before: { mean: null, days: 0, expected: 7 },
      after: { mean: null, days: 0, expected: 7 },
      diff: null,
      change: null,
      laterCold: { days: 0, expected: 30, daysBelowZero: null },
    },
    history: {
      from: null,
      to: null,
      eligibleYears: 0,
      years: 0,
      excluded: 0,
      meanDiff: null,
    },
    points: [],
    available: { first: null, last: null },
    calendar: { method: "KST", links: [] },
    policy: "관측만",
  }));
  const stop = mountWeatherContext(root, { mode: "season", station: "112" });
  await ready(root);
  assert.match(root.textContent, /영하 일수 자료 없음/);
  assert.doesNotMatch(root.textContent, /영하 0일/);
  stop();
  dom.window.close();
});

test("today identifies same-grid live source, separate ASOS extrema and versioned proxy cache key", async () => {
  const { root, dom, requests } = setup(() => ({
    ok: true,
    station: { name: "수원" },
    source: "기상청 초단기실황 · 동일 격자 비교",
    grid: { nx: 60, ny: 120, note: "ASOS 관측소와 다름" },
    available: true,
    message: "2026-11-08 8시 KST",
    value: 4.4,
    previous: 0.9,
    diff: 3.5,
    recent7: { mean: 7, days: 7, computed: true, diff: -2.6 },
    extras: [],
    series: [{ hour: 8, today: 4.4, yesterday: 0.9 }],
    recentDays: [{ date: "2026-11-07", max: 15, min: 2 }],
    dailySource: "ASOS 공식 일자료 · 별도",
    policy: "동일격자",
    thresholds: "서비스 기준",
    latestTemperatureTime: "2026-11-08 08:00:00",
    precipitation: {
      today: { text: "1mm 미만" },
      yesterday: { text: "0" },
      note: "RN1 직전1시간 · 범위값은 수치차이 제외",
    },
  }));
  const stop = mountWeatherContext(root, { mode: "today", station: "119" });
  await ready(root);
  assert.match(root.textContent, /기상청 초단기실황 · 동일 격자 비교/);
  assert.match(root.textContent, /60,120/);
  assert.match(root.textContent, /오늘 4.4℃ \/ 어제 0.9℃/);
  assert.match(root.textContent, /7\/7일/);
  assert.match(root.textContent, /ASOS 최고·최저 \(별도 자료\)/);
  assert.match(root.textContent, /1mm 미만/);
  const q = new URL(
    requests.find((u) => u.includes("context-today")),
    "http://local",
  ).searchParams;
  assert.equal(q.get("basis"), "grid-v1");
  assert.equal(q.get("station"), "119");
  stop();
  dom.window.close();
});


const mobileToday = {
  ok: true, station: { name: "서울" }, available: true,
  source: "기상청 초단기실황 · 동일 격자 비교", grid: { nx: 60, ny: 127, note: "기술 격자" },
  basis: { time: "2026-11-08 08:00:00" }, value: 4.4, previous: 0.9, diff: 3.5,
  recent7: { mean: 7, days: 7, computed: true, diff: -2.6 }, extras: [],
  policy: "계산 정책", thresholds: "서비스 기준", series: [], recentDays: [],
};
const noEvidence = root => {
  assert.equal(root.querySelector("details, table, svg, .wc-result a"), null);
  assert.doesNotMatch(root.textContent, /기상청|ASOS|격자|표본|\d\/7일|근거|계산 정책|서비스 기준|무승부 기준|관측 \d/);
};
test("inal today renders core values/time only, not even hidden evidence DOM", async () => {
  const { root, dom, requests } = setup(() => mobileToday);
  const stop = mountWeatherContext(root, { mode: "today", station: "201", showEvidence: false });
  await ready(root); noEvidence(root);
  assert.match(root.textContent, /서울 · 2026-11-08 08:00 KST/);
  assert.match(root.textContent, /오늘 4.4℃ \/ 어제 0.9℃/);
  assert.match(root.textContent, /최근 7일 같은 시각 평균 7.0℃ · 오늘과 -2.6℃/);
  assert.match(root.textContent, /3.5℃ 높아요/);
  assert.match(requests[0], /basis=grid-v1/);
  stop(); dom.window.close();
});
test("inal partial and missing today preserve honest caveat without sample counters or invented zero", async () => {
  for (const [station, data, expected] of [
    ["202", { ...mobileToday, previous: null, diff: null, recent7: { ...mobileToday.recent7, days: 6 } }, /일부 날짜 자료가 없어/],
    ["203", { ...mobileToday, available: false, value: null, previous: null, diff: null, recent7: { computed: false, days: null, mean: null } }, /자료가 아직 없어요/],
  ]) {
    const { root, dom } = setup(() => data);
    const stop = mountWeatherContext(root, { mode: "today", station, showEvidence: false });
    await ready(root); noEvidence(root); assert.match(root.textContent, expected);
    assert.doesNotMatch(root.textContent, /0\.0℃|0\/7|6\/7/);
    stop(); dom.window.close();
  }
});
test("inal battle keeps controls, both numbers and win/draw/unavailable reasons; hides thresholds and sample coverage", async () => {
  const data = { ...battle, window: { fromYear: 2020, toYear: 2025, expected: 6 }, rows: [
    { ...battle.rows[0], samples: 5 },
    { label: "비가 적은 날", a: 0, b: 0.1, unit: "mm", winner: "draw", reason: "무승부 — 차이가 작아요", samples: 6 },
    { label: "바람이 약한 날", a: null, b: null, unit: "m/s", winner: "unavailable", reason: "비교할 자료가 없어요", samples: 0 },
  ], wins: { A: 1, B: 0, draw: 1, unavailable: 1 } };
  const { root, dom } = setup(() => data);
  const stop = mountWeatherContext(root, { mode: "battle", station: "301", showEvidence: false });
  await ready(root); noEvidence(root);
  assert.match(root.textContent, /기준 6.9℃ \/ 상대 14.0℃/);
  assert.match(root.textContent, /기준 날 승.*7.1℃/);
  assert.match(root.textContent, /무승부 — 차이가 작아요/);
  assert.match(root.textContent, /비교할 자료가 없어요/);
  assert.match(root.textContent, /일부 과거 자료가 없어/);
  for (const name of ["opponent", "criteria", "period", "date1"]) assert.ok(root.querySelector(`[name=${name}]`));
  assert.equal(root.querySelector('[name=period] option[value=all]').textContent, "전체 기간 같은 월·일");
  stop(); dom.window.close();
});
test("inal seasonal result separates selected year and history, keeps controls, escapes text and partial/no-data caveats", async () => {
  const sample = { mean: 10, days: 7, expected: 7 };
  const data = { ok: true, name: "입춘", question: "입춘이면 따뜻해질까?", station: { name: "<img src=x>" },
    selected: { date: "2025-02-03", value: 12, adjacent: { ...sample, expected: 14 }, before: sample, after: sample,
      diff: 2, change: 0, laterCold: { days: 0, expected: 30, daysBelowZero: null } },
    history: { years: 3, meanDiff: 0.3 }, calendar: { method: "날짜 계산 근거", links: ["https://example.test"] },
    points: [], available: {}, policy: "계산 정책" };
  const { root, dom } = setup(() => data);
  const stop = mountWeatherContext(root, { mode: "season", station: "401", showEvidence: false });
  await ready(root); noEvidence(root);
  assert.match(root.textContent, /2025-02-03/); assert.match(root.textContent, /선택한 해 일평균 12.0℃/);
  assert.match(root.textContent, /여러 해의 주변 대비 평균 차이 \+0.3℃/);
  assert.match(root.textContent, /잠정 비교/); assert.match(root.textContent, /영하 일수 자료 없음/);
  assert.doesNotMatch(root.textContent, /영하 0일|3개 해/); assert.equal(root.querySelector("img"), null);
  assert.ok(root.querySelector('[name=year]')); assert.ok(root.querySelector('[name=name]'));
  stop(); dom.window.close();
});
