import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { createInalProxyMiddleware } from './server/proxy.mjs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const upstreamUrl = env.WEATHER_API_BASE_URL || 'https://weather.nuni.co.kr';
  const timeoutMs = Number(env.PROXY_TIMEOUT_MS || 8000);
  const cacheEnabled = env.PROXY_CACHE_ENABLED !== 'false';

  return {
    plugins: [
      react(),
      {
        name: 'inal-readonly-weather-proxy',
        configureServer(server) {
          server.middlewares.use(
            createInalProxyMiddleware({
              upstreamBaseUrl: upstreamUrl,
              timeoutMs,
              cacheEnabled,
            })
          );
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      host: true,
    },
    preview: {
      port: 4173,
      host: true,
    },
    build: {
      target: 'es2020',
      outDir: 'dist',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            query: ['@tanstack/react-query'],
            icons: ['lucide-react'],
          },
        },
      },
    },
  };
});
