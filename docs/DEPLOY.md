# Inal 운영 배포 가이드 (`DEPLOY.md`)

본 문서는 **이날(Inal) — 이야기가 있는 날씨** 모바일 웹서비스를 기존 Weather(`https://weather.nuni.co.kr`)와 완전히 독립된 환경(`https://inal.nuni.co.kr`)에 배포하고 운영하기 위한 절차를 설명합니다.

---

## 1. 환경변수 설정 (`.env`)

프로젝트 루트에 `.env` 파일을 생성하고 다음 값을 설정합니다 (`.env.example` 참고).

```ini
WEATHER_API_BASE_URL=https://weather.nuni.co.kr
PORT=4173
HOST=0.0.0.0
PROXY_TIMEOUT_MS=8000
PROXY_CACHE_ENABLED=true
ALLOWED_ORIGIN=https://inal.nuni.co.kr

VITE_API_BASE_URL=/api
VITE_PC_WEB_URL=https://weather.nuni.co.kr
VITE_ENABLE_DEV_FALLBACK=false
```

---

## 2. 빌드 및 운영 서버 기동

```bash
# 1. 의존성 설치 및 검증
npm ci
npm run verify

# 2. 타입 검사 및 프로덕션 빌드 (dist/ 생성)
npm run build

# 3. 운영 서버 실행 (정적 파일 서빙 + 읽기 전용 API 프록시 통합 실행)
NODE_ENV=production WEATHER_API_BASE_URL=https://weather.nuni.co.kr PORT=4173 npm run start
```

---

## 3. Nginx HTTPS 리버스 프록시 설정 (`inal.nuni.co.kr`)

```nginx
server {
    listen 80;
    server_name inal.nuni.co.kr;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name inal.nuni.co.kr;

    ssl_certificate     /etc/letsencrypt/live/inal.nuni.co.kr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/inal.nuni.co.kr/privkey.pem;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        proxy_pass http://127.0.0.1:4173;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 15s;
    }
}
```
