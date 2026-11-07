import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  matchAllowedRoute,
  sanitizeSearchParams,
  ALLOWED_READONLY_ROUTES,
} from "../server/proxy-config.mjs";
import { lineChart } from "../public/weather-context.mjs";
test("context APIs are explicit read-only additions, never open admin paths", () => {
  for (const p of ["today", "battle", "season"])
    assert.equal(matchAllowedRoute("/api/stats/context-" + p).allowed, true);
  for (const p of [
    "/api/collect",
    "/api/stats/context-admin",
    "/api/admin",
    "/api/ingest",
  ])
    assert.equal(matchAllowedRoute(p).allowed, false);
  assert.equal(
    new Set(ALLOWED_READONLY_ROUTES.map((r) => r.path)).size,
    ALLOWED_READONLY_ROUTES.length,
  );
});
test("proxy preserves station, date, period, criteria, story controls, drops secrets", () => {
  const s = sanitizeSearchParams(
    new URLSearchParams(
      "station=108&date1=2026-11-06&opponent=year&period=all&criteria=cooler,dry&name=입춘&year=2025&password=ignore&token=ignore",
    ),
    "/api/stats/context-battle",
  );
  assert.equal(s.get("station"), "108");
  assert.equal(s.get("opponent"), "year");
  assert.equal(s.get("period"), "all");
  assert.equal(s.get("criteria"), "cooler,dry");
  assert.equal(s.get("name"), "입춘");
  assert.equal(s.get("password"), null);
  assert.equal(s.get("token"), null);
});
test("shared observation graph does not bridge missing points, preserves real zero", () => {
  const s = lineChart([
    { hour: 0, today: 0, yesterday: null },
    { hour: 1, today: null, yesterday: null },
    { hour: 2, today: 2, yesterday: null },
  ]);
  assert.match(s, /M35\.0/);
  assert.match(s, /M75\.9/);
  assert.doesNotMatch(s, /L75\.9/);
  assert.match(s, /circle/);
  assert.match(
    lineChart([{ hour: 0, today: null, yesterday: null }]),
    /자료 없음/,
  );
});
test("compact mobile mounts same renderer in today, battle and story tabs", async () => {
  const today = await readFile(
    new URL("../src/pages/TodayPage.tsx", import.meta.url),
    "utf8",
  );
  const story = await readFile(
    new URL("../src/pages/StoryPage.tsx", import.meta.url),
    "utf8",
  );
  assert.match(today, /mode="today"/);
  assert.match(story, /mode="battle"/);
  assert.match(story, /mode="season"/);
  assert.match(story, /기존 날짜별 상세 비교/);
});
