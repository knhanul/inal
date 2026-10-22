# 기존 Weather API 분석 및 Inal 매핑 명세 (`WEATHER_API_MAPPING.md`)

본 문서는 기존 운영 중인 **Weather 프로젝트**(`https://github.com/knhanul/weather.git`, 운영 주소 `https://weather.nuni.co.kr`)의 백엔드 소스(`server.mjs`, `rt-api.mjs`, `date-api.mjs`, `stats-api.mjs`, `rt-baseline.mjs`, `rt-forecast.mjs`, `rt-stories.mjs`, `rt-season.mjs` 등)와 실제 운영 API 응답을 전수 분석하여 정리한 문서입니다.

---

## 1. 기존 Weather 시스템 개요 및 핵심 데이터 원칙

### 1.1 프로젝트 및 서버 구조
- **백엔드 엔트리**: `server.mjs` (ES Modules 기반 Node.js 서버)
- **실시간/분석 라우터**: `rt-api.mjs` (`/api/rt/*`)
  - 세부 모듈: `rt-baseline.mjs`, `rt-changes.mjs`, `rt-forecast.mjs`, `rt-forecast-wind.mjs`, `rt-region.mjs`, `rt-season.mjs`, `rt-stories.mjs`
- **통계/역사 라우터**: `stats-api.mjs`, `date-api.mjs` (`/api/stats/*`)
- **공유/인증 라우터**: `share-api.mjs`, `auth-nuni.mjs` (카카오 로그인 기반 관리자 승인 체계)

### 1.2 지원 관측지점 (ASOS 8대 지점)
기존 서비스에서 기본 제공하는 기상청 종관기상관측(ASOS) 8개 표준 지점은 다음과 같습니다.

| 지점 번호 (`station` / `stn`) | 지점명 (`name`) | 권역 | 격자 좌표 (`nx`, `ny`) 예시 | 기본 즐겨찾기 여부 |
| :--- | :--- | :--- | :--- | :--- |
| `108` | 서울 | 수도권 | `(60, 127)` | 기본값 / 즐겨찾기 |
| `112` | 인천 | 수도권 | `(55, 124)` | 즐겨찾기 |
| `119` | 수원 | 수도권 | `(60, 121)` | 일반 |
| `133` | 대전 | 충청 | `(67, 100)` | 일반 |
| `143` | 대구 | 경상 | `(89, 90)` | 일반 |
| `156` | 광주 | 전라 | `(58, 74)` | 일반 |
| `159` | 부산 | 경상 | `(98, 76)` | 즐겨찾기 |
| `184` | 제주 | 제주 | `(52, 38)` | 일반 |

### 1.3 비교 기준 기간 (`basis` / `periods`) 및 계산 규칙
기존 Weather는 기상청 공식 30년 기후평년값을 그대로 쓰지 않고, **1990년부터 적재된 ASOS 시간·일 관측 자료**를 기반으로 그날그날 직접 계산합니다.
- **3대 비교 기준**:
  1. `all` (**1990년 이후 평균**): `1990 ~ 직전 완료 연도(2025)` (36개 연도)
  2. `r10` (**최근 10년 평균**): `2016 ~ 2025` (완료된 최근 10개 연도)
  3. `r5` (**최근 5년 평균**): `2021 ~ 2025` (완료된 최근 5개 연도)
  - *주의*: 진행 중인 당해 연도(`2026`)는 기준 평균 모집단에 포함하지 않습니다.
- **시간/일자 비교 창(Window)**:
  - 같은 월·일 **±7일(총 15일 창)**, 같은 정시(00~23시) 관측값을 모집단으로 사용합니다.
  - 연도별 표본 편향을 막기 위해 **해마다 평균을 먼저 낸 뒤 해끼리 동일 가중치로 평균**합니다.
- **유효 표본 및 결측치 처리 원칙**:
  - 연도 내 유효 관측값이 50% 미만인 해는 제외하며, 유효 연도 수가 기준 연도 수의 80% 미만이면 `'비교 데이터 부족'`으로 판정합니다.
  - 백분위(`percentile`) 및 순위(`rank`)는 유효 표본이 **60개 이상**일 때만 산출합니다.
  - 보통 범위는 **10~90% 백분위(`p10 ~ p90`)** 구간으로 정의합니다.
  - **결측치 처리 절대 원칙**: 관측·예보·통계 값이 없을 때는 `null`로 반환하며, 프런트엔드에서도 **`0`, `'맑음'`, `'정상'` 등의 임의 값으로 치환하지 않고 `'자료 없음'`으로 명시**합니다.
- **데이터 출처 및 시각 분리**:
  - **현재 실황**: 기상청 초단기실황 (동네예보 5km 격자 기준 — ASOS 관측소 위치와 차이가 있을 수 있음을 안내)
  - **예보 자료**: 기상청 초단기예보 + 단기예보 + 중기예보 (발표 시각 `base` 명시, 그래프에서 관측선과 예보선은 이어 그리지 않고 구분)
  - **과거 통계**: 기상청 ASOS 정시 시간자료 및 공식 일자료 (매일 11:30 전날 자료까지 수집, 공식 일자료 미수집 시 시간자료 집계 여부 명시)
  - 모든 시각은 **한국 표준시(`Asia/Seoul`, KST)** 기준입니다.

---

## 2. 실시간 및 분석 API 검증 결과 (`/api/rt/*`)

| 엔드포인트 | 주요 파라미터 | 검증된 핵심 응답 필드 | Inal 매핑 화면 및 역할 |
| :--- | :--- | :--- | :--- |
| `GET /api/rt/now` | `station` (`108` 등) | `{ ok, now, date, station, method, periods, current: { time, hour, kind, source, freshness, values: { ta, hm, rn1, ws, vec, windDir, pty, sky }, compare: { ta, hm, rn, ws } }, day: { max, min } }` | **오늘** (대표 현재 날씨 히어로 카드, 3대 기준 비교 카드), **비교** (과거 평균 비교) |
| `GET /api/rt/today` | `station` | `{ ok, now, date, station, grid: { nx, ny, note }, hourly: [{ hour, time, obs, fcst, fcstSource, fcstBase, compare }], summary: { headline, outfit, tempRange, rainNote, segments } }` | **오늘** (12시간·옷차림 카드 및 0~23시 실황·예보 분리 차트 바텀시트) |
| `GET /api/rt/forecast` | `station` | `{ ok, station, releases: { ultra, vilage, mid }, hours: [{ time, hour, ta, hm, ws, pcp, pty, pop, sky, source, base, pcpText, ptyName, skyName }], days: [...], week: [...] }` | **오늘** (12시간 예보), **예보** (12h/72h 시간별 타임라인, 10일 일별 예보 카드) |
| `GET /api/rt/forecast-wind` | `station` | `{ ok, station, hours: [{ time, vec, ws, source, base }], note }` | **예보** (시간별 상세 풍향·풍속 예보 및 강풍 주의 구간) |
| `GET /api/rt/regions` | 없음 | `{ ok, asOf, periods, rows: [{ id, name, category, lat, lon, ta, hm, ws, rn, pty, diff, percentile, rank, summary }], rankings: { maxTa, minTa, maxRn, maxWs }, note }` | **헤더 지역 선택기**, **비교** (한눈에 보기 — 지금 전국은 8대 지점 비교) |
| `GET /api/rt/baseline` | `station`, `date`, `hour`, `field`, `daily`, `value` | `{ ok, station, date, hour, kind, field, baseline: { mean, std, p10, p25, p50, p75, p90, min, max, count, period, unit, label }, comparison: { percentile, diff, zscore, rank, label, summary } }` | **오늘 / 비교** 상세 바텀시트 (백분위 분포 띠 및 극값 검증) |
| `GET /api/rt/records` | `station` | `{ ok, station, now, periods, now_rank, rain1h, rainCalendar30d, days: [{ id, title, metric, value, unit, date, year, rank, note }], rule }` | **비교** (날씨 기록 & 30일 비 달력), **이야기** (흥미로운 기상 기록) |
| `GET /api/rt/life` | `station` | `{ ok, now, date, station, items: [{ id, name, category, score, level, valueText, comment }], scenarios: [{ id, title, hours, status, description, suitabilities }] }` | **비교** (생활 속 날씨 카드 및 출퇴근 시나리오) |
| `GET /api/rt/similar` | `station`, `day` | `{ ok, station, day, source, kind, matches: [{ date, score, similarityPercent, taDiff, hmDiff, weatherSummary, taMax, taMin, rnDay }] }` | **오늘** (오늘과 비슷했던 과거 날씨 카드) |
| `GET /api/rt/stories` | `station` | `{ ok, station, basis, totalCandidates, stories: [{ id, title, category, kind, content, howCalculated, evidence, tags }] }` | **오늘** (오늘의 날씨 이야기 자동 선별 4선 카드) |
| `GET /api/rt/seasons` | `station`, `basis` (`all`\|`r10`\|`r5`) | `{ ok, station, now, basisId, events: [{ id, name, season, expectedDate, actualDate, diffDays, status, historicalAvgDate, occurredSeasons, totalSeasons, note }] }` | **비교** (계절 신호 — 첫 30℃, 최근 30℃, 첫 영하, 첫 눈 비교) |

---

## 3. 과거 통계·비교·이야기 API 검증 결과 (`/api/stats/*`)

| 엔드포인트 | 주요 파라미터 | 검증된 핵심 응답 필드 | Inal 매핑 화면 및 역할 |
| :--- | :--- | :--- | :--- |
| `GET /api/stats/yearly` | `station`, `period`, `metric`, `from`, `to` | `{ ok, station, source, rows: [{ year, start, end, days, obs, value, date, status, missingDates }], meta }` | **비교** → `연도별 비교` 카드 및 연도 추이 그래프 바텀시트 |
| `GET /api/stats/overlay` | `station`, `period`, `metric`, `years` | `{ ok, station, series: [{ year, points: [{ date, value }] }] }` | **비교** → `연도별 비교` 중첩 시계열 |
| `GET /api/stats/region` | `stations` (`108,159,184`), `period`, `metric` | `{ ok, view, source, timezone, table: { columns: [{ key, label }], rows: [...] } }` | **비교** → `지역별 비교` 카드 (1990년대 vs 최근 10년 지점 간 비교) |
| `GET /api/stats/date-weather` | `stn`/`stnId`, `date`, `m`, `d` | `{ ok, station, weather: { taAvg, taMax, taMin, rnAvg, rainProbability, typicalSummary }, historical: [{ year, solarDate, taAvg, taMax, taMin, rnDay, wsAvg, summary }] }` | **이야기** → `날짜로 보는 날씨 (내가 기억하는 이날)` & `과거 같은 날짜의 날씨` |
| `GET /api/stats/date-battle` | `stn`/`stnId`, `date1`, `date2`, `metric` | `{ ok, station, contestant1: { date, taAvg, taMax, taMin, rnDay, wsAvg, score }, contestant2: { ... }, winner: { date, reason, scoreDiff } }` | **이야기** → `날씨 배틀` 카드 (두 날짜 간 기온·강수·바람 대결) |
| `GET /api/stats/highlights` | `station`, `set` | `{ ok, station, asOf, source, cards: [{ id, title, question, metric, value, pastValue, recentValue, unit, description, badge, trend }] }` | **이야기** → `질문으로 보는 날씨` (“우리 동네는 예전보다 더워졌을까?” 등 관측 문답) |
| `GET /api/stats/calendar-map` | `stn`/`stnId`, `year`, `month` | `{ ok, station, calendar: [{ date, rnDay, rainy, missing, taAvg, taMax, taMin }] }` | **비교 / 이야기** → 월간 강수 및 결측 달력 |

---

## 4. 차단 대상 엔드포인트 (프록시 화이트리스트 제외)

신규 Inal 모바일 서비스는 **읽기 전용 조회**만 수행하며, 기존 Weather의 관리·수집·인증·DB 변경 엔드포인트는 Inal API 프록시(`server/proxy.mjs`)에서 원천 차단(`403 Forbidden` / `405 Method Not Allowed`)합니다.
- 차단 경로: `/api/admin/*`, `/api/collect/*`, `/api/ingest/*`, `/api/missing/*`, `/api/history/*`, `/api/auth/*`, `/api/users/*`, `/api/providers/*`, `/api/service-key/*`
- 차단 메서드: 모든 `POST`, `PUT`, `PATCH`, `DELETE` 요청
