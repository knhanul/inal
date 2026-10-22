import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ALLOWED_READONLY_ROUTES,
  matchAllowedRoute,
  sanitizeSearchParams,
} from '../server/proxy-config.mjs';
import { createInalProxyMiddleware } from '../server/proxy.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

async function checkAsync(name, fn) {
  await fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

console.log('=== [1/4] 필수 폴더·문서·컴포넌트 파일 존재성 검증 ===');

const REQUIRED_FILES = [
  'README.md',
  '.env.example',
  '.gitignore',
  'package.json',
  'tsconfig.json',
  'vite.config.ts',
  'tailwind.config.js',
  'index.html',
  'public/manifest.webmanifest',
  'public/sw.js',
  'public/favicon.svg',
  'public/icons/inal-icon.svg',
  'public/icons/inal-maskable.svg',
  'public/mobile-preview.html',
  'server/proxy-config.mjs',
  'server/proxy.mjs',
  'docs/ARCHITECTURE.md',
  'docs/WEATHER_API_MAPPING.md',
  'docs/FEATURE_STATUS.md',
  'docs/DEPLOY.md',
  'docs/WEATHER_BACKEND_PROPOSALS.md',
  'src/main.tsx',
  'src/App.tsx',
  'src/styles/index.css',
  'src/types/api.ts',
  'src/types/domain.ts',
  'src/types/viewmodel.ts',
  'src/api/endpoints.ts',
  'src/api/client.ts',
  'src/api/mappers.ts',
  'src/api/devFallback.ts',
  'src/store/settingsStore.ts',
  'src/hooks/useWeatherQueries.ts',
  'src/hooks/useSwipeCarousel.ts',
  'src/components/layout/AppShell.tsx',
  'src/components/layout/Header.tsx',
  'src/components/layout/RegionSelector.tsx',
  'src/components/layout/BottomNavigation.tsx',
  'src/components/layout/SettingsSheet.tsx',
  'src/components/common/BrandLogo.tsx',
  'src/components/common/WeatherIcon.tsx',
  'src/components/common/WeatherMetric.tsx',
  'src/components/common/DataSourceLabel.tsx',
  'src/components/common/CardCarousel.tsx',
  'src/components/common/CardPagination.tsx',
  'src/components/common/DetailBottomSheet.tsx',
  'src/components/common/LoadingSkeleton.tsx',
  'src/components/common/EmptyState.tsx',
  'src/components/common/ErrorState.tsx',
  'src/components/cards/WeatherHeroCard.tsx',
  'src/components/cards/ForecastCard.tsx',
  'src/components/cards/ForecastTimeline.tsx',
  'src/components/cards/ComparisonCard.tsx',
  'src/components/cards/StoryCard.tsx',
  'src/components/cards/RecordCard.tsx',
  'src/pages/TodayPage.tsx',
  'src/pages/ForecastPage.tsx',
  'src/pages/ComparePage.tsx',
  'src/pages/StoryPage.tsx',
];

for (const relPath of REQUIRED_FILES) {
  check(`파일 존재 및 비어있지 않음: ${relPath}`, () => {
    const full = path.join(ROOT, relPath);
    assert.equal(fs.existsSync(full), true, `${relPath} 파일이 존재해야 합니다.`);
    const stat = fs.statSync(full);
    assert.equal(stat.size > 20, true, `${relPath} 파일 내용이 비어있지 않아야 합니다.`);
  });
}

console.log('\n=== [2/4] 읽기 전용 API 프록시 화이트리스트 및 차단 정책 검증 ===');

check('18개 조회 엔드포인트 화이트리스트 등록 확인', () => {
  const expectedRoutes = [
    '/api/rt/now',
    '/api/rt/today',
    '/api/rt/forecast',
    '/api/rt/forecast-wind',
    '/api/rt/regions',
    '/api/rt/baseline',
    '/api/rt/records',
    '/api/rt/life',
    '/api/rt/similar',
    '/api/rt/stories',
    '/api/rt/seasons',
    '/api/stats/yearly',
    '/api/stats/overlay',
    '/api/stats/region',
    '/api/stats/date-weather',
    '/api/stats/date-battle',
    '/api/stats/calendar-map',
    '/api/stats/highlights',
  ];
  for (const route of expectedRoutes) {
    const res = matchAllowedRoute(route);
    assert.equal(res.allowed, true, `${route} 는 허용되어야 합니다.`);
  }
  assert.equal(ALLOWED_READONLY_ROUTES.length >= 18, true);
});

check('관리자·수집·인증·DB 변경 API 경로는 403 차단 대상인지 확인', () => {
  const blockedRoutes = [
    '/api/admin/users',
    '/api/collect/asos',
    '/api/ingest/hourly',
    '/api/missing/check',
    '/api/history/logs',
    '/api/auth/kakao',
    '/api/service-key',
    '/api/unknown-endpoint',
  ];
  for (const blocked of blockedRoutes) {
    const res = matchAllowedRoute(blocked);
    assert.equal(res.allowed, false, `${blocked} 는 차단되어야 합니다.`);
  }
});

check('쿼리 파라미터 정제 및 station <-> stn 자동 호환 매핑 확인', () => {
  const rawParams = new URLSearchParams('stn=159&malicious=<script>&basis=r10');
  const cleanedRt = sanitizeSearchParams(rawParams, '/api/rt/now');
  assert.equal(cleanedRt.get('station'), '159');
  assert.equal(cleanedRt.get('basis'), 'r10');
  assert.equal(cleanedRt.has('malicious'), false);
});

console.log('\n=== [3/4] 프록시 HTTP 서버 동작·캐시·메서드 차단 통합 테스트 ===');

await checkAsync('실제 HTTP 프록시 미들웨어 요청/응답·캐시 HIT·POST 차단 검증', async () => {
  let upstreamCallCount = 0;

  const mockUpstream = http.createServer((req, res) => {
    upstreamCallCount += 1;
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(
      JSON.stringify({
        ok: true,
        url: req.url,
        station: { id: '108', name: '서울' },
      })
    );
  });

  await new Promise((r) => mockUpstream.listen(0, '127.0.0.1', r));
  const upstreamPort = mockUpstream.address().port;

  const middleware = createInalProxyMiddleware({
    upstreamBaseUrl: `http://127.0.0.1:${upstreamPort}`,
    timeoutMs: 3000,
    cacheEnabled: true,
  });

  const proxyServer = http.createServer((req, res) => {
    middleware(req, res, () => {
      res.writeHead(404);
      res.end();
    });
  });

  await new Promise((r) => proxyServer.listen(0, '127.0.0.1', r));
  const proxyPort = proxyServer.address().port;

  try {
    const healthRes = await fetch(`http://127.0.0.1:${proxyPort}/api/health`);
    assert.equal(healthRes.status, 200);

    const postRes = await fetch(`http://127.0.0.1:${proxyPort}/api/rt/now?station=108`, {
      method: 'POST',
    });
    assert.equal(postRes.status, 405);

    const adminRes = await fetch(`http://127.0.0.1:${proxyPort}/api/collect/start`);
    assert.equal(adminRes.status, 403);

    const firstGet = await fetch(`http://127.0.0.1:${proxyPort}/api/rt/now?stn=108`);
    assert.equal(firstGet.status, 200);
    assert.equal(firstGet.headers.get('x-inal-proxy-cache'), 'MISS');

    const secondGet = await fetch(`http://127.0.0.1:${proxyPort}/api/rt/now?station=108`);
    assert.equal(secondGet.status, 200);
    assert.equal(secondGet.headers.get('x-inal-proxy-cache'), 'HIT');
    assert.equal(upstreamCallCount, 1);
  } finally {
    proxyServer.close();
    mockUpstream.close();
  }
});

console.log('\n=== [4/4] 결측치 보호 및 도메인 코드 규칙 정적 검증 ===');

check('mappers.ts에서 결측치를 0이나 맑음으로 치환하지 않고 자료 없음으로 처리하는지 확인', () => {
  const mapperCode = fs.readFileSync(path.join(ROOT, 'src/api/mappers.ts'), 'utf-8');
  assert.equal(mapperCode.includes("MISSING_TEXT = '자료 없음'"), true);
  assert.equal(mapperCode.includes('하늘 상태 미수집'), true);
});

console.log(`\n🎉 모든 검증 통과! (총 ${passed}개 항목 성공)\n`);
