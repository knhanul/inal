# Inal 기능 구현 및 API 연결 현황 (`FEATURE_STATUS.md`)

본 문서는 **이날(Inal) — 이야기가 있는 날씨** 초기 버전의 화면별 기능 구현 상태, 기존 Weather API 연결 현황, 예외 처리 및 향후 고도화 과제를 정리합니다.

---

## 1. 핵심 요구사항 구현 상태 요약

| 구분 | 세부 항목 | 상태 | 구현 파일 |
| :--- | :--- | :---: | :--- |
| **레이아웃 & 내비게이션** | `AppShell` (320px~430px 모바일 뷰포트, 100dvh, Safe Area, PC 중앙 프리뷰) | 완료 | `src/components/layout/AppShell.tsx` |
| **레이아웃 & 내비게이션** | `Header` (브랜드 로고, 현재 지역 선택 버튼, 오른쪽 설정 아이콘) | 완료 | `src/components/layout/Header.tsx` |
| **레이아웃 & 내비게이션** | `BottomNavigation` (오늘 / 예보 / 비교 / 이야기 4개 고정 메뉴, 44px 이상 터치 영역) | 완료 | `src/components/layout/BottomNavigation.tsx` |
| **레이아웃 & 내비게이션** | 브라우저 히스토리(`popstate`) 및 URL 쿼리(`?tab=...&stn=...`) 연동 | 완료 | `src/App.tsx` |
| **공통 컴포넌트** | `CardCarousel` & `CardPagination` (터치 스와이프, 이전/다음 버튼, 인디케이터, 경계 처리) | 완료 | `src/components/common/CardCarousel.tsx` |
| **공통 컴포넌트** | `DetailBottomSheet` (카드별 상세 그래프, 백분위 분포 띠, 계산 기준 및 출처 표시) | 완료 | `src/components/common/DetailBottomSheet.tsx` |
| **공통 컴포넌트** | `LoadingSkeleton`, `EmptyState`, `ErrorState` (카드별 독립 재시도 지원) | 완료 | `src/components/common/*` |
| **공통 컴포넌트** | `DataSourceLabel` (실황 관측 / 초단기·단기·중기예보 / ASOS 과거 통계 구분 배지) | 완료 | `src/components/common/DataSourceLabel.tsx` |
| **지역 & 설정** | `RegionSelector` (8대 ASOS 관측지점 검색·선택, 실시간 기온/편차 미리보기, 최근 지역) | 완료 | `src/components/layout/RegionSelector.tsx` |
| **지역 & 설정** | `SettingsSheet` (기본 지역, 비교 기간 기본값 `all`/`r10`/`r5`, 글자 크기, PC 상세 서비스 이동) | 완료 | `src/components/layout/SettingsSheet.tsx` |
| **보안 & 프록시** | 읽기 전용 GET 화이트리스트 API 프록시 (`server/proxy.mjs`) | 완료 | `server/proxy.mjs` |
| **PWA & 미리보기** | `manifest.webmanifest`, `sw.js`, 벡터 아이콘, 독립 실행형 `mobile-preview.html` | 완료 | `public/*` |

---

## 2. 4대 화면별 기능 및 Weather API 연결 현황

### A. 오늘 (`TodayPage.tsx`)
1. **대표 현재 날씨 카드 (`WeatherHeroCard`)**: `GET /api/rt/now?station={stn}` 연결 — 현재 기온, 하늘 상태, 평년 대비 편차 한 줄 요약, 오늘 최고·최저, 습도·바람·1시간 강수 및 3대 기준 분포 바텀시트.
2. **오늘의 날씨 이야기 (`StoryCard`)**: `GET /api/rt/stories?station={stn}` 연결 — 후보 중 자동 선별된 최대 4개 이야기 전환 및 계산 근거 확인.
3. **앞으로 12시간 예보 & 옷차림 (`ForecastCard`)**: `GET /api/rt/forecast` + `GET /api/rt/today` 연결 — 12시간 타임라인, 밤/출근/낮/퇴근 구간별 옷차림 가이드, 0~23시 실황·예보 분리 차트.
4. **과거 평균 3대 기준 비교 (`ComparisonCard`)**: `GET /api/rt/now` 연결 — `1990년 이후` / `최근 10년` / `최근 5년` 기준별 기온·습도·강수·풍속 비교.
5. **오늘과 닮았던 과거 날씨 (`ComparisonCard`)**: `GET /api/rt/similar?station={stn}` 연결 — 시간대별 기온·습도 흐름이 가장 비슷했던 과거 날짜 매칭.

### B. 예보 (`ForecastPage.tsx`)
- **시간별 예보 모드**: `GET /api/rt/forecast` + `GET /api/rt/forecast-wind` 연결 — 앞으로 12시간 집중 예보, 72시간(3일) 단기예보, 시간별 풍향(16방위)·풍속 및 강풍 주의 구간 카드.
- **일별 예보 모드**: `GET /api/rt/forecast` + `GET /api/rt/now` 연결 — 1~5일 단기예보 카드, 6~10일 중기예보 카드, 예년(1990~2025) 평균 대비 최고·최저기온 비교 카드.

### C. 비교 (`ComparePage.tsx`)
1. **한눈에 보기 (지금 전국은)**: `GET /api/rt/regions` 연결 — 전국 8개 관측지점 실시간 기온·편차·백분위 및 지점 즉시 전환.
2. **과거 평균 비교**: `GET /api/rt/now` 연결 — 상단 기준 선택기(`1990년 이후`/`최근 10년`/`최근 5년`) 연동 분포 비교.
3. **연도별 비교**: `GET /api/stats/yearly` 연결 — 1990년 이후 연도별 같은 시기 평균기온 추이 및 막대 그래프 바텀시트.
4. **지역별 비교**: `GET /api/stats/region?stations=108,159,184` 연결 — 서울·부산·제주 1990년대 대비 최근 10년 기후 지표 변화량.
5. **생활 속 날씨**: `GET /api/rt/life` 연결 — 산책·빨래·세차·수면 지수 및 출퇴근 생활 시나리오.
6. **날씨 기록 & 계절 신호**: `GET /api/rt/records` + `GET /api/rt/seasons` 연결 — 역대 극값, 첫 30℃/첫 영하/첫 눈 계절 신호, 최근 30일 비 달력.

### D. 이야기 (`StoryPage.tsx`)
1. **질문으로 보는 날씨**: `GET /api/stats/highlights` 연결 — "우리 동네는 예전보다 더워졌을까?", "비 오는 날이 더 많아졌을까?", "여름 더위는 예년보다 일찍 찾아왔을까?" 등 관측 기반 문답.
2. **날짜로 보는 날씨 (내가 기억하는 이날)**: `GET /api/stats/date-weather` 연결 — 월/일 선택기로 생일·기념일의 역대 평균 날씨 및 연도별 기록 조회.
3. **날씨 배틀**: `GET /api/stats/date-battle` 연결 — 비교 날짜 2~4개(월/일 선택·추가)의 최근 10년 해마다 대결.
4. **흥미로운 기상 기록**: `GET /api/rt/records` 연결 — 이 시기의 역대 최고·최저 기온 및 최다 강수 기록.

---

## 3. 의도적 미연결(차단) 및 후속 개발 사항
- **관리자·수집·DB 변경 기능 차단**: `자료수집`, `미적재 현황`, `수집이력`, `관측지점 관리`, `공급원 인증키`, `사용자 관리`는 기존 시스템 보호 원칙에 따라 프록시에서 403/405 차단합니다.
- **대용량 원자료 표 및 CSV 내려받기 (`날씨 자료실`)**: 모바일 화면 대신 설정 시트의 'PC 상세 서비스(`https://weather.nuni.co.kr`)로 이동' 링크로 연결합니다.
- **후속 확장 과제**: 카카오 로그인 연동 서버 설정 동기화(`SettingsSyncAdapter` 인터페이스 기구현), 카카오톡 공유 카드 연동(`share-api.mjs`).
