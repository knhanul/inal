#!/usr/bin/env bash
set -euo pipefail
export NODE_ENV="${NODE_ENV:-production}"
export PORT="${PORT:-4173}"
export WEATHER_API_BASE_URL="${WEATHER_API_BASE_URL:-https://weather.nuni.co.kr}"
echo "[Inal] Starting production read-only proxy & static server on port ${PORT}..."
node server/proxy.mjs
