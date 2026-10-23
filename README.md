# 이날 (Inal) — 이야기가 있는 날씨

> **모바일 전용 날씨 조회·비교·이야기 웹서비스 (`https://inal.nuni.co.kr`)**  
> 1990년부터 쌓인 기상청 관측(ASOS)과 초단기실황·단기·중기예보를 바탕으로, 복잡한 통계 표 대신 **좌우로 넘기는 감성적인 날씨 카드**로 오늘과 과거의 날씨 이야기를 전합니다.

---

## 1. 빠른 시작 (개발 및 실행)

```bash
# 1. 환경변수 파일 준비
cp .env.example .env

# 2. 패키지 설치 및 개발 서버 실행 (읽기 전용 Weather API 프록시 자동 연동)
npm install
npm run dev

# 3. 프로덕션 빌드 및 운영 프록시 서버 실행
npm run build
npm run start

# 4. 자동 구조·프록시·결측치 규칙 검증 테스트
npm run verify
```

- 빌드 전에도 `public/mobile-preview.html`을 브라우저에서 바로 열면 4개 탭과 카드 스와이프, 지역 전환, 바텀시트 동작을 즉시 확인할 수 있습니다.

## 2. 문서 안내 (`docs/`)
- `docs/WEATHER_API_MAPPING.md`: 기존 Weather API 17개 엔드포인트 실제 응답 구조 및 매핑 명세
- `docs/ARCHITECTURE.md`: 프런트엔드 3계층 데이터 구조, 프록시 보안, 모바일 UX 설계
- `docs/FEATURE_STATUS.md`: 4대 화면(오늘·예보·비교·이야기) 구현 현황 및 후속 과제
- `docs/DEPLOY.md`: `https://inal.nuni.co.kr` 독립 배포 및 Nginx 리버스 프록시 설정 가이드
- `docs/WEATHER_BACKEND_PROPOSALS.md`: 기존 Weather 백엔드 개선 제안서

## Android (Capacitor / Play)

Play 업로드용 AAB 패키징은 Capacitor Android 셸을 사용하며, 앱은 운영 사이트 `https://inal.nuni.co.kr`를 로드합니다.
자세한 내용·재빌드·Play Console 절차는 [docs/android-play.md](docs/android-play.md)를 보세요.
