export const ALLOWED_READONLY_ROUTES = [
  { path: '/api/stats/context-today', ttlSeconds: 30, category: 'stats' },
  { path: '/api/stats/context-battle', ttlSeconds: 60, category: 'stats' },
  { path: '/api/stats/context-season', ttlSeconds: 600, category: 'stats' },
  { path: '/api/rt/now', ttlSeconds: 60, category: 'realtime' },
  { path: '/api/rt/today', ttlSeconds: 60, category: 'realtime' },
  { path: '/api/rt/forecast', ttlSeconds: 180, category: 'forecast' },
  { path: '/api/rt/forecast-wind', ttlSeconds: 180, category: 'forecast' },
  { path: '/api/rt/regions', ttlSeconds: 60, category: 'realtime' },
  { path: '/api/rt/baseline', ttlSeconds: 600, category: 'stats' },
  { path: '/api/rt/records', ttlSeconds: 300, category: 'stats' },
  { path: '/api/rt/life', ttlSeconds: 180, category: 'forecast' },
  { path: '/api/rt/similar', ttlSeconds: 300, category: 'stats' },
  { path: '/api/rt/stories', ttlSeconds: 120, category: 'realtime' },
  { path: '/api/rt/seasons', ttlSeconds: 600, category: 'stats' },
  { path: '/api/stats/yearly', ttlSeconds: 600, category: 'stats' },
  { path: '/api/stats/overlay', ttlSeconds: 600, category: 'stats' },
  { path: '/api/stats/region', ttlSeconds: 600, category: 'stats' },
  { path: '/api/stats/date-weather', ttlSeconds: 600, category: 'stats' },
  { path: '/api/stats/date-battle', ttlSeconds: 600, category: 'stats' },
  { path: '/api/stats/calendar-map', ttlSeconds: 600, category: 'stats' },
  { path: '/api/stats/highlights', ttlSeconds: 600, category: 'stats' },
  { path: '/api/stations', ttlSeconds: 1800, category: 'meta' },
  // 특정일(설날·추석·수능·학력고사) 달력 — 공개 읽기 전용. 하루 두어 번 바뀌는 자료라 10분 캐시.
  { path: '/api/calendar/events', ttlSeconds: 600, category: 'stats' },
  // 특정일 '해마다 실제 날짜' — 그해 실제 시행일 하루의 관측값. 읽기 전용(조회)만.
  { path: '/api/stats/date-series', ttlSeconds: 600, category: 'stats' },
];

export const BLOCKED_PATH_PREFIXES = [
  '/api/admin',
  '/api/collect',
  '/api/ingest',
  '/api/missing',
  '/api/history',
  '/api/auth',
  '/api/users',
  '/api/providers',
  '/api/service-key',
];

export const ALLOWED_QUERY_KEYS = new Set([
  'station',
  'stn',
  'stnId',
  'stations',
  'date',
  'date1',
  'date2',
  'hour',
  'field',
  'daily',
  'value',
  'day',
  'basis',
  'period',
  'metric',
  'from',
  'to',
  'format',
  'years',
  'view',
  'm',
  'd',
  'cmp',
  'year',
  'month',
  'set',
  'cases',
  'cal',
  'part',
  // 특정일 '해마다 실제 날짜'(/api/stats/date-series): 종류(kind)와 이름(label). from·to·format 은 위에 이미 있다.
  'kind',
  'label',
  'opponent',
  'criteria',
  'name',
]);

export function matchAllowedRoute(pathname) {
  const normalized = pathname.replace(/\/+$/, '') || '/';
  for (const blocked of BLOCKED_PATH_PREFIXES) {
    if (normalized === blocked || normalized.startsWith(`${blocked}/`)) {
      return { allowed: false, reason: 'BLOCKED_ADMIN_OR_INGEST_ROUTE', route: null };
    }
  }
  const matched = ALLOWED_READONLY_ROUTES.find((r) => r.path === normalized);
  if (!matched) {
    return { allowed: false, reason: 'NOT_IN_READONLY_WHITELIST', route: null };
  }
  return { allowed: true, reason: 'OK', route: matched };
}

export function sanitizeSearchParams(searchParams, pathname) {
  const rawMap = new Map();
  for (const [key, val] of searchParams.entries()) {
    if (ALLOWED_QUERY_KEYS.has(key) && typeof val === 'string' && val.length <= 64) {
      rawMap.set(key, val.trim());
    }
  }

  const stnVal = rawMap.get('station') || rawMap.get('stn') || rawMap.get('stnId');
  rawMap.delete('station');
  rawMap.delete('stn');
  rawMap.delete('stnId');

  if (stnVal) {
    if (pathname.startsWith('/api/stats/date-') || pathname === '/api/stats/calendar-map') {
      rawMap.set('stn', stnVal);
    } else {
      rawMap.set('station', stnVal);
    }
  }

  const sortedKeys = Array.from(rawMap.keys()).sort();
  const clean = new URLSearchParams();
  for (const k of sortedKeys) {
    clean.set(k, rawMap.get(k));
  }
  return clean;
}
