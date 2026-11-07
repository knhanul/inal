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
    recent7: { mean: null, days: 0, diff: null },
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
  assert.match(root.textContent, /0\/7일/);
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
