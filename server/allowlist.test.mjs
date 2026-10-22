import test from "node:test";
import assert from "node:assert/strict";
import { isAllowedRead } from "./allowlist.mjs";

test("조회 GET 만 허용", () => {
  assert.equal(isAllowedRead("GET", "/api/rt/now"), true);
  assert.equal(isAllowedRead("HEAD", "/api/stations"), true);
  assert.equal(isAllowedRead("GET", "/api/stats/date-weather"), true);
});

test("수집·관리·다른 메서드는 막음", () => {
  assert.equal(isAllowedRead("POST", "/api/rt/now"), false);
  assert.equal(isAllowedRead("GET", "/api/collect"), false);
  assert.equal(isAllowedRead("GET", "/api/key"), false);
  assert.equal(isAllowedRead("GET", "/api/rt/raw"), false);
  assert.equal(isAllowedRead("GET", "/api/export"), false);
  assert.equal(isAllowedRead("DELETE", "/api/stations"), false);
});
