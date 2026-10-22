# 이날 (Inal)

휴대폰에서 카드를 넘기며 보는 날씨입니다. 수집과 통계 계산은 [weather.nuni.co.kr](https://weather.nuni.co.kr)이 하고, 이 저장소는 그 조회 결과만 읽습니다.

## 실행

```bash
npm install
npm run dev
```

브라우저에서 오늘 카드가 보이면 됩니다. 개발 서버는 `/weather` 로 기존 조회 API를 프록시합니다.

```bash
npm test
npm run build
WEATHER_ORIGIN=https://weather.nuni.co.kr PORT=8080 npm start
```

`npm start` 는 `dist` 를 열고, 허용된 GET 만 기존 서버로 넘깁니다.

환경변수는 `.env.example` 을 보세요. 비밀키는 없습니다.
