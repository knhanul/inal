/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_PC_WEB_URL?: string;
  readonly VITE_ENABLE_DEV_FALLBACK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
