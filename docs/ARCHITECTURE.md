# Inal (이날 — 이야기가 있는 날씨) 아키텍처 설계서 (`ARCHITECTURE.md`)

## 1. 아키텍처 목표 및 설계 철학

**이날(Inal)** 모바일 웹서비스(`https://inal.nuni.co.kr`)는 기존 PC 중심 기상 플랫폼인 **Weather**(`https://weather.nuni.co.kr`)의 풍부한 관측·예보·통계 API를 재사용하되, 스마트폰 사용자의 한 손 탐색 환경에 맞춰 완전히 새롭게 설계된 독립 프런트엔드 + 경량 API 프록시 애플리케이션입니다.

### 핵심 원칙
1. **기존 시스템 무결성 보존**: 기존 `knhanul/weather` 저장소, 데이터베이스, 기상청 수집 스케줄러, 인증 체계를 일절 수정하거나 복제하지 않습니다.
2. **프록시 기반 보안 격리**: 브라우저는 기존 Weather 서버나 DB에 직접 접근하지 않고, Inal 전용 **읽기 전용(GET) 화이트리스트 API 프록시**를 통해서만 데이터를 조회합니다.
3. **3계층 데이터 분리**:
   - `API Response Layer (src/types/api.ts)`: Weather 백엔드 JSON 응답 원형
   - `Domain Model Layer (src/types/domain.ts)`: 결측치(`null`)와 데이터 출처(`obs` / `fcst` / `stats`), 기준 기간(`all` / `r10` / `r5`)이 정규화된 도메인 객체
   - `ViewModel Layer (src/types/viewmodel.ts)`: 모바일 카드 및 바텀시트 UI가 즉시 렌더링할 수 있는 포맷팅된 모델
4. **세로 스크롤 최소화 & 가로 카드 스와이프**: 한 화면에는 하나의 핵심 주제 카드만 집중 배치하고, 보조 정보는 좌우 터치 스와이프(`CardCarousel`)와 상세 바텀시트(`DetailBottomSheet`)로 탐색합니다.

---

## 2. 전체 시스템 구성도

```text
[모바일 브라우저 / PWA (320px ~ 430px, PC 중앙 뷰포트 지원)]
       │
       │ HTTPS (GET /api/rt/*, GET /api/stats/*)
       ▼
[Inal 경량 API 프록시 (server/proxy.mjs)]
  - 메서드 제한: GET, HEAD, OPTIONS만 허용 (POST/PUT/DELETE 405 차단)
  - 경로 화이트리스트: 승인된 조회 엔드포인트만 통과 (관리/수집 API 403 차단)
  - 인메모리 TTL 캐시: 실황(60초), 예보(180초), 통계/역사(600초) 캐싱 및 중복 요청 병합
  - 타임아웃 & 에러 표준화: 8초 타임아웃, 표준 JSON 에러 응답 반환
       │
       │ Server-to-Server HTTPS (WEATHER_API_BASE_URL=https://weather.nuni.co.kr)
       ▼
[기존 Weather 서버 (https://weather.nuni.co.kr)]
  - 기상청 초단기실황 / 단기·중기예보 / 1990년~ ASOS 관측 DB 및 통계 엔진
```

---

## 3. 디렉토리 및 파일 구조

```text
inal/
├── README.md                          # 프로젝트 소개, 빠른 시작, 스크립트 안내
├── .env.example                       # 개발/운영 환경변수 템플릿
├── .gitignore                         # Git 제외 목록
├── package.json                       # 의존성 및 실행/빌드/검증 스크립트
├── tsconfig.json                      # TypeScript 컴파일러 설정
├── tsconfig.node.json                 # Vite/Node용 TypeScript 설정
├── vite.config.ts                     # Vite 빌드 및 개발 프록시 미들웨어 설정
├── tailwind.config.js                 # 디자인 토큰 및 모바일 뷰포트 유틸리티 설정
├── postcss.config.js                  # PostCSS 설정
├── index.html                         # 모바일 뷰포트(viewport-fit=cover), PWA 메타 태그
├── public/
│   ├── manifest.webmanifest           # PWA 설치 매니페스트
│   ├── sw.js                          # 정적 에셋 캐시 및 실시간 API 네트워크 우선 서비스 워커
│   ├── mobile-preview.html            # 빌드 전에도 즉시 실행 가능한 독립 모바일 미리보기
│   ├── favicon.svg                    # 브라우저 파비콘
│   └── icons/
│       ├── inal-icon.svg              # PWA 기본 아이콘 (벡터)
│       └── inal-maskable.svg          # Android Maskable 아이콘
├── server/
│   ├── proxy-config.mjs               # 화이트리스트 라우트, 캐시 TTL, 보안 정책 설정
│   └── proxy.mjs                      # 독립 실행 및 미들웨어 겸용 경량 API 프록시 서버
├── scripts/
│   ├── dev.sh                         # 개발 서버 + 프록시 통합 실행 스크립트
│   ├── build.sh                       # 프로덕션 빌드 스크립트
│   ├── start-proxy.sh                 # 운영 환경 프록시 및 정적 파일 서버 실행 스크립트
│   └── verify.mjs                     # 아키텍처, API 매핑, 결측치 규칙, 파일 무결성 자동 검증기
├── docs/
│   ├── ARCHITECTURE.md                # 아키텍처 설계서 (본 문서)
│   ├── WEATHER_API_MAPPING.md         # 기존 Weather API 전수 분석 및 매핑 명세
│   ├── FEATURE_STATUS.md              # 화면별 구현 및 API 연결 현황
│   ├── DEPLOY.md                      # https://inal.nuni.co.kr 독립 배포 가이드
│   └── WEATHER_BACKEND_PROPOSALS.md   # 기존 Weather 서버 개선 제안서 (무수정 원칙 준수)
└── src/
    ├── main.tsx                       # 앱 엔트리, QueryClient 및 서비스 워커 등록
    ├── App.tsx                        # 라우팅/탭 전환, 전역 상태, 바텀시트 제어
    ├── vite-env.d.ts                  # Vite 환경변수 타입 선언
    ├── styles/
    │   └── index.css                  # CSS 변수(날씨별 테마), Safe Area, 100dvh, 터치 규격
    ├── types/
    │   ├── api.ts                     # 기존 Weather API 응답 원형 인터페이스
    │   ├── domain.ts                  # 정규화된 도메인 모델
    │   └── viewmodel.ts               # 카드 UI 전용 ViewModel 인터페이스
    ├── api/
    │   ├── endpoints.ts               # 조회 전용 API 경로 빌더 및 8대 관측지점 정의
    │   ├── client.ts                  # Fetch 래퍼, 타임아웃, 에러 분류, 개발용 fallback 제어
    │   ├── mappers.ts                 # API → Domain → ViewModel 순수 변환 함수 (결측치 보호)
    │   └── devFallback.ts             # 명시적 개발 모드(VITE_ENABLE_DEV_FALLBACK=true) 전용 데이터
    ├── store/
    │   └── settingsStore.ts           # 지역, 비교 기간, 최근 지역, 글꼴 크기 상태 및 동기화 어댑터
    ├── hooks/
    │   ├── useWeatherQueries.ts       # 탭별 지연 로딩(Lazy Query) 및 인접 카드 프리페칭 훅
    │   └── useSwipeCarousel.ts        # 터치 스와이프 제스처, 세로 스크롤 충돌 방지 훅
    ├── components/
    │   ├── layout/                    # AppShell, Header, RegionSelector, BottomNavigation, SettingsSheet
    │   ├── common/                    # BrandLogo, WeatherIcon, WeatherMetric, DataSourceLabel,
    │   │                              # CardCarousel, CardPagination, DetailBottomSheet,
    │   │                              # LoadingSkeleton, EmptyState, ErrorState
    │   └── cards/                     # WeatherHeroCard, ForecastCard, ForecastTimeline,
    │                                  # ComparisonCard, StoryCard, RecordCard
    └── pages/
        ├── TodayPage.tsx              # 1. 오늘 탭 화면
        ├── ForecastPage.tsx           # 2. 예보 탭 화면
        ├── ComparePage.tsx            # 3. 비교 탭 화면
        └── StoryPage.tsx              # 4. 이야기 탭 화면
```
