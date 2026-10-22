# 기존 Weather 서비스 연동 및 개선 제안서 (`WEATHER_BACKEND_PROPOSALS.md`)

> **준수 원칙**: 절대 준수 사항 1번 및 8번에 따라 기존 `knhanul/weather` 저장소의 코드는 일절 수정하지 않았습니다. 현재 Inal은 자체 경량 API 프록시(`server/proxy.mjs`)와 프런트엔드 매퍼(`src/api/mappers.ts`)를 통해 기존 API를 100% 그대로 호환 호출합니다.

## 1. 지점 쿼리 파라미터 명칭 표준화 제안 (`station` vs `stn` vs `stnId`)
- 현재 `/api/rt/*`는 주로 `station`을, `/api/stats/date-*`는 `stn`을 사용합니다.
- Inal 프록시(`server/proxy-config.mjs`)에서 엔드포인트별로 `station`과 `stn`을 자동 정규화하여 전달하고 있으므로 현재 즉시 호환됩니다.
- 추후 기존 Weather 백엔드에서도 공통 파라미터 파서를 통일하면 유지보수성이 향상됩니다.

## 2. 응답 `Cache-Control` 헤더 추가 제안
- 초단기실황(매시), 단기예보(일 8회), ASOS 일자료(매일 11:30) 갱신 주기에 맞춰 `Cache-Control` 헤더를 부여하면 CDN 및 프록시 효율이 높아집니다.
