const PREFIX = import.meta.env.VITE_API_PREFIX || "/weather";

export class ApiError extends Error {
  status: number;
  warming: boolean;
  constructor(message: string, status = 0, warming = false) {
    super(message);
    this.status = status;
    this.warming = warming;
  }
}

export async function apiGet<T>(path: string, timeoutMs = 20000): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${PREFIX}${path}`, { signal: ctrl.signal, headers: { accept: "application/json" } });
    const text = await res.text();
    let body: unknown = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = null; }
    const rec = body && typeof body === "object" ? (body as { ok?: boolean; message?: string; warming?: boolean }) : null;
    if (!res.ok || rec?.ok === false || rec?.warming) {
      throw new ApiError(rec?.message || (res.ok ? "자료를 읽지 못했습니다" : "날씨 서버 오류"), res.status, Boolean(rec?.warming));
    }
    if (body == null) throw new ApiError("응답이 비어 있습니다", res.status);
    return body as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (e instanceof DOMException && e.name === "AbortError") throw new ApiError("응답이 늦습니다. 다시 시도해 주세요");
    throw new ApiError("연결하지 못했습니다");
  } finally {
    clearTimeout(timer);
  }
}
