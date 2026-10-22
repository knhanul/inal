import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { isAllowedRead } from "./allowlist.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "dist");
const origin = (process.env.WEATHER_ORIGIN || "https://weather.nuni.co.kr").replace(/\/$/, "");
const port = Number(process.env.PORT || 8080);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
};

function send(res, status, body, type = "application/json; charset=utf-8") {
  const buf = Buffer.from(body);
  res.writeHead(status, { "content-type": type, "content-length": buf.length, "cache-control": "no-store" });
  res.end(buf);
}

async function serveStatic(req, res, pathname) {
  const rel = pathname === "/" ? "/index.html" : pathname;
  const file = normalize(join(dist, rel));
  if (!file.startsWith(dist)) return send(res, 403, JSON.stringify({ ok: false, message: "거부" }));
  try {
    const buf = await readFile(file);
    const type = TYPES[extname(file)] || "application/octet-stream";
    res.writeHead(200, { "content-type": type, "content-length": buf.length, "cache-control": extname(file) === ".html" ? "no-cache" : "public, max-age=3600" });
    res.end(buf);
  } catch {
    if (extname(rel)) return send(res, 404, JSON.stringify({ ok: false, message: "없음" }));
    const html = await readFile(join(dist, "index.html"));
    res.writeHead(200, { "content-type": TYPES[".html"], "content-length": html.length, "cache-control": "no-cache" });
    res.end(html);
  }
}

async function proxy(req, res, url) {
  if (!isAllowedRead(req.method, url.pathname)) {
    return send(res, 403, JSON.stringify({ ok: false, message: "이 주소는 프록시하지 않습니다" }));
  }
  const target = `${origin}${url.pathname}${url.search}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const upstream = await fetch(target, { method: "GET", signal: ctrl.signal, headers: { accept: "application/json" } });
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(upstream.status, {
      "content-type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
      "content-length": buf.length,
      "cache-control": "no-store",
    });
    res.end(buf);
  } catch (e) {
    const aborted = e?.name === "AbortError";
    send(res, 504, JSON.stringify({ ok: false, message: aborted ? "날씨 서버 응답이 늦습니다" : "날씨 서버에 연결하지 못했습니다" }));
  } finally {
    clearTimeout(timer);
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  if (url.pathname === "/api/health" && (req.method === "GET" || req.method === "HEAD")) {
    return send(res, 200, JSON.stringify({ ok: true, service: "inal" }));
  }
  if (url.pathname === "/weather" || url.pathname.startsWith("/weather/")) {
    const next = new URL(url.pathname.slice("/weather".length) || "/", "http://127.0.0.1");
    next.search = url.search;
    return proxy(req, res, next);
  }
  return serveStatic(req, res, url.pathname);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`inal listening on ${port}, weather ${origin}`);
});
