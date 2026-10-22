#!/usr/bin/env bash
set -euo pipefail
echo "[Inal] Running TypeScript typecheck and Vite production build..."
npm run build
echo "[Inal] Build completed in ./dist"
