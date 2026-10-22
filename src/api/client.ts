export class WeatherApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode = 500, code = 'API_ERROR') {
    super(message);
    this.name = 'WeatherApiError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

export interface ApiFetchResult<T> {
  data: T;
  isDevFallback: boolean;
}

export function isExplicitDevFallbackEnabled(): boolean {
  if (import.meta.env.VITE_ENABLE_DEV_FALLBACK === 'true') {
    return true;
  }
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('devFallback') === '1') return true;
    if (params.get('devFallback') === '0') return false;
  }
  return false;
}

export async function fetchWeatherApi<T>(
  url: string,
  fallbackFactory?: () => T,
  timeoutMs = 8000
): Promise<ApiFetchResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      let errMsg = `기상 서버 응답 오류 (${response.status})`;
      try {
        const errJson = await response.json();
        if (errJson && typeof errJson.message === 'string') {
          errMsg = errJson.message;
        }
      } catch {
        // ignore
      }
      throw new WeatherApiError(errMsg, response.status, `HTTP_${response.status}`);
    }

    const json = (await response.json()) as T & { ok?: boolean; message?: string };
    if (json && typeof json === 'object' && 'ok' in json && json.ok === false) {
      throw new WeatherApiError(
        json.message || '기상 데이터 조회에 실패했습니다.',
        422,
        'PAYLOAD_NOT_OK'
      );
    }

    return { data: json, isDevFallback: false };
  } catch (err) {
    if (fallbackFactory && isExplicitDevFallbackEnabled()) {
      return { data: fallbackFactory(), isDevFallback: true };
    }
    if (err instanceof WeatherApiError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new WeatherApiError(
        '기상 서버 응답이 지연되고 있습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.',
        504,
        'TIMEOUT'
      );
    }
    throw new WeatherApiError(
      '기상 데이터 서버와 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',
      502,
      'NETWORK_ERROR'
    );
  } finally {
    clearTimeout(timer);
  }
}
