# 배포

대상 주소: `https://inal.nuni.co.kr`  
저장소: `https://github.com/knhanul/inal.git`  
Weather(`weather.nuni.co.kr`, `knhanul/weather`) 는 배포하지 않습니다.

## 서버에서

```bash
git clone https://github.com/knhanul/inal.git
cd inal
npm install
npm run build
```

환경변수:

| 이름 | 값 |
|---|---|
| `WEATHER_ORIGIN` | `https://weather.nuni.co.kr` |
| `PORT` | 프로세스 안 포트. Caddy 뒤에서 고릅니다. |

실행: `npm start` (`node server/index.mjs`). 프로세스는 `0.0.0.0:$PORT` 에서 정적 파일과 `/weather` 프록시를 엽니다.

## DNS · HTTPS

1. `inal.nuni.co.kr` A/AAAA 를 이날을 띄울 기계로 연결합니다.
2. 기존 Caddy(또는 같은 역할의 프록시)에 사이트를 추가합니다.
3. 바깥 443 을 이 프로세스 포트로 넘깁니다. 예:

```caddy
inal.nuni.co.kr {
  reverse_proxy 127.0.0.1:8090
}
```

`PORT=8090` 처럼 Weather(8080)와 포트를 겹치지 않게 합니다.

## 확인

- `https://inal.nuni.co.kr/api/health` → `{ "ok": true, "service": "inal" }`
- 오늘 카드에 기온이 나오고, 수집 메뉴는 없습니다.
- Weather 저장소와 서버 설정은 바꾸지 않습니다.
