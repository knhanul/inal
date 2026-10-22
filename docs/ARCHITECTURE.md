# 구조

```text
브라우저 (이날)
  → 같은 출처 /weather/api/...
  → Inal 프록시 (읽기 GET 만)
  → https://weather.nuni.co.kr 조회 API
  → 기존 Weather DB
```

- 화면, 캐시(TanStack Query), 이 기기 설정(localStorage)은 이 저장소에만 있습니다.
- 평균, 이야기 문장, 기록 순위는 다시 계산하지 않고 응답 필드를 그대로 보여 줍니다.
- 수집, 키 등록, 내보내기, 원자료(`/api/rt/raw`)는 프록시 목록에 없습니다.
- 개발은 Vite 프록시, 운영은 `server/index.mjs` 가 같은 목록을 사용합니다.
