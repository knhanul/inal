import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { matchAllowedRoute, sanitizeSearchParams } from './proxy-config.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const responseCache = new Map();
const inflightRequests = new Map();

function fetchUpstreamJson(targetUrl, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const client = parsed.protocol === 'https:' ? https : http;

    const req = client.request(
      parsed,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Inal-Mobile-Proxy/1.0 (+https://inal.nuni.co.kr)',
        },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const bodyText = Buffer.concat(chunks).toString('utf-8');
          resolve({
            statusCode: res.statusCode || 502,
            contentType: res.headers['content-type'] || 'application/json; charset=utf-8',
            bodyText,
          });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error(`UPSTREAM_TIMEOUT_${timeoutMs}MS`));
    });
    req.on('error', (err) => {
      reject(err);
    });
    req.end();
  });
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  });
  res.end(body);
}

export function createInalProxyMiddleware(options = {}) {
  const upstreamBaseUrl = (
    options.upstreamBaseUrl ||
    process.env.WEATHER_API_BASE_URL ||
    'https://weather.nuni.co.kr'
  ).replace(/\/+$/, '');
  const timeoutMs = Number(options.timeoutMs || process.env.PROXY_TIMEOUT_MS || 8000);
  const cacheEnabled =
    options.cacheEnabled !== undefined
      ? Boolean(options.cacheEnabled)
      : process.env.PROXY_CACHE_ENABLED !== 'false';
  const allowedOrigin = options.allowedOrigin || process.env.ALLOWED_ORIGIN || '*';

  return async function inalProxyMiddleware(req, res, next) {
    const rawUrl = req.url || '/';
    if (!rawUrl.startsWith('/api')) {
      if (typeof next === 'function') return next();
      return false;
    }

    const parsedReqUrl = new URL(rawUrl, 'http://localhost');
    const pathname = parsedReqUrl.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    };

    if (req.method === 'OPTIONS') {
      res.writeHead(204, corsHeaders);
      res.end();
      return true;
    }

    if (pathname === '/api/health') {
      sendJson(
        res,
        200,
        {
          ok: true,
          service: 'inal-api-proxy',
          upstream: upstreamBaseUrl,
          mode: 'read-only-whitelist',
          cacheSize: responseCache.size,
          timestamp: new Date().toISOString(),
        },
        corsHeaders
      );
      return true;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      sendJson(
        res,
        405,
        {
          ok: false,
          error: 'METHOD_NOT_ALLOWED',
          message: '이날(Inal) API 프록시는 읽기 전용(GET) 요청만 허용합니다.',
        },
        corsHeaders
      );
      return true;
    }

    const check = matchAllowedRoute(pathname);
    if (!check.allowed || !check.route) {
      sendJson(
        res,
        403,
        {
          ok: false,
          error: check.reason,
          message:
            check.reason === 'BLOCKED_ADMIN_OR_INGEST_ROUTE'
              ? '관리자·데이터 수집·DB 변경 API는 모바일 서비스에서 접근할 수 없습니다.'
              : '승인되지 않은 API 엔드포인트입니다.',
        },
        corsHeaders
      );
      return true;
    }

    const sanitizedQuery = sanitizeSearchParams(parsedReqUrl.searchParams, pathname);
    const queryString = sanitizedQuery.toString();
    const targetUrl = `${upstreamBaseUrl}${check.route.path}${queryString ? `?${queryString}` : ''}`;
    const cacheKey = `${check.route.path}?${queryString}`;
    const nowMs = Date.now();

    if (cacheEnabled && responseCache.has(cacheKey)) {
      const cached = responseCache.get(cacheKey);
      if (cached.expiresAt > nowMs) {
        res.writeHead(cached.statusCode, {
          'Content-Type': cached.contentType,
          'Cache-Control': `public, max-age=${Math.max(1, Math.floor((cached.expiresAt - nowMs) / 1000))}`,
          'X-Inal-Proxy-Cache': 'HIT',
          'X-Content-Type-Options': 'nosniff',
          ...corsHeaders,
        });
        res.end(req.method === 'HEAD' ? undefined : cached.bodyText);
        return true;
      }
    }

    try {
      let upstreamPromise = inflightRequests.get(cacheKey);
      if (!upstreamPromise) {
        upstreamPromise = fetchUpstreamJson(targetUrl, timeoutMs).finally(() => {
          inflightRequests.delete(cacheKey);
        });
        inflightRequests.set(cacheKey, upstreamPromise);
      }

      const upstreamRes = await upstreamPromise;

      if (cacheEnabled && upstreamRes.statusCode >= 200 && upstreamRes.statusCode < 300) {
        responseCache.set(cacheKey, {
          statusCode: upstreamRes.statusCode,
          contentType: upstreamRes.contentType,
          bodyText: upstreamRes.bodyText,
          expiresAt: Date.now() + check.route.ttlSeconds * 1000,
        });
      }

      res.writeHead(upstreamRes.statusCode, {
        'Content-Type': upstreamRes.contentType,
        'Cache-Control': `public, max-age=${check.route.ttlSeconds}`,
        'X-Inal-Proxy-Cache': 'MISS',
        'X-Content-Type-Options': 'nosniff',
        ...corsHeaders,
      });
      res.end(req.method === 'HEAD' ? undefined : upstreamRes.bodyText);
      return true;
    } catch (err) {
      if (cacheEnabled && responseCache.has(cacheKey)) {
        const stale = responseCache.get(cacheKey);
        res.writeHead(stale.statusCode, {
          'Content-Type': stale.contentType,
          'Cache-Control': 'no-cache',
          'X-Inal-Proxy-Cache': 'STALE',
          'X-Content-Type-Options': 'nosniff',
          ...corsHeaders,
        });
        res.end(req.method === 'HEAD' ? undefined : stale.bodyText);
        return true;
      }

      const isTimeout = err instanceof Error && err.message.startsWith('UPSTREAM_TIMEOUT');
      sendJson(
        res,
        isTimeout ? 504 : 502,
        {
          ok: false,
          error: isTimeout ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE',
          message: isTimeout
            ? '기상 서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.'
            : '기상 데이터 서버와 일시적으로 연결할 수 없습니다.',
        },
        corsHeaders
      );
      return true;
    }
  };
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectRun) {
  const port = Number(process.env.PORT || 4173);
  const host = process.env.HOST || '0.0.0.0';
  const distDir = path.resolve(__dirname, '../dist');
  const proxyMiddleware = createInalProxyMiddleware();

  const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.ico': 'image/x-icon',
  };

  const server = http.createServer(async (req, res) => {
    const handled = await proxyMiddleware(req, res);
    if (handled) return;

    if (fs.existsSync(distDir)) {
      const parsed = new URL(req.url || '/', 'http://localhost');
      let safePath = path.normalize(decodeURIComponent(parsed.pathname)).replace(/^(\.\.[/\\])+/, '');
      let filePath = path.join(distDir, safePath);

      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      if (!fs.existsSync(filePath)) {
        filePath = path.join(distDir, 'index.html');
      }

      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';
        const isImmutableAsset = parsed.pathname.startsWith('/assets/');
        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': isImmutableAsset
            ? 'public, max-age=31536000, immutable'
            : 'no-cache',
        });
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    }

    sendJson(res, 404, {
      ok: false,
      error: 'NOT_FOUND',
      message: '요청하신 리소스를 찾을 수 없습니다.',
    });
  });

  server.listen(port, host, () => {
    console.log(
      `[Inal Server] Running on http://${host}:${port} (Upstream: ${
        process.env.WEATHER_API_BASE_URL || 'https://weather.nuni.co.kr'
      })`
    );
  });
}
