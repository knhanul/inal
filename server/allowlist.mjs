/** 읽기 전용으로 프록시할 Weather 경로. 수집·관리·내보내기·원자료 CSV 는 넣지 않는다. */
export const READ_PATHS = [
  "/api/health",
  "/api/stations",
  "/api/rt/now",
  "/api/rt/today",
  "/api/rt/forecast",
  "/api/rt/forecast-wind",
  "/api/rt/regions",
  "/api/rt/baseline",
  "/api/rt/records",
  "/api/rt/life",
  "/api/rt/similar",
  "/api/rt/stories",
  "/api/rt/seasons",
  "/api/rt/ytd",
  "/api/stats/date-weather",
  "/api/stats/date-battle",
];

export function isAllowedRead(method, pathname) {
  const m = String(method || "").toUpperCase();
  if (m !== "GET" && m !== "HEAD") return false;
  return READ_PATHS.includes(pathname);
}
