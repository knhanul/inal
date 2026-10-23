import type { BasisId } from '../types/api';
import type { StationInfo } from '../types/domain';

export const ASOS_STATIONS: StationInfo[] = [
  { id: '108', name: '서울', regionGroup: '수도권', lat: 37.5714, lon: 126.9658, gridNx: 60, gridNy: 127, isDefaultFavorite: true },
  { id: '112', name: '인천', regionGroup: '수도권', lat: 37.4777, lon: 126.6249, gridNx: 55, gridNy: 124, isDefaultFavorite: true },
  { id: '119', name: '수원', regionGroup: '수도권', lat: 37.2723, lon: 126.9853, gridNx: 60, gridNy: 121 },
  { id: '133', name: '대전', regionGroup: '충청', lat: 36.372, lon: 127.3721, gridNx: 67, gridNy: 100 },
  { id: '143', name: '대구', regionGroup: '경상', lat: 35.8779, lon: 128.6529, gridNx: 89, gridNy: 90 },
  { id: '156', name: '광주', regionGroup: '전라', lat: 35.1729, lon: 126.8915, gridNx: 58, gridNy: 74 },
  { id: '159', name: '부산', regionGroup: '경상', lat: 35.1047, lon: 129.032, gridNx: 98, gridNy: 76, isDefaultFavorite: true },
  { id: '184', name: '제주', regionGroup: '제주', lat: 33.5141, lon: 126.5297, gridNx: 52, gridNy: 38 },
];

export const BASIS_OPTIONS: Array<{ id: BasisId; label: string; subLabel: string }> = [
  { id: 'all', label: '1990년 이후', subLabel: '1990~2025 (36년)' },
  { id: 'r10', label: '최근 10년', subLabel: '2016~2025 (10년)' },
  { id: 'r5', label: '최근 5년', subLabel: '2021~2025 (5년)' },
];

export function getStationById(stationId: string): StationInfo {
  return ASOS_STATIONS.find((s) => s.id === stationId) || ASOS_STATIONS[0];
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

export const WEATHER_ENDPOINTS = {
  now: (station: string) => `${API_BASE}/rt/now?station=${encodeURIComponent(station)}`,
  today: (station: string) => `${API_BASE}/rt/today?station=${encodeURIComponent(station)}`,
  forecast: (station: string) => `${API_BASE}/rt/forecast?station=${encodeURIComponent(station)}`,
  forecastWind: (station: string) => `${API_BASE}/rt/forecast-wind?station=${encodeURIComponent(station)}`,
  regions: () => `${API_BASE}/rt/regions`,
  baseline: (station: string, field = 'ta') => `${API_BASE}/rt/baseline?station=${encodeURIComponent(station)}&field=${encodeURIComponent(field)}`,
  records: (station: string) => `${API_BASE}/rt/records?station=${encodeURIComponent(station)}`,
  life: (station: string) => `${API_BASE}/rt/life?station=${encodeURIComponent(station)}`,
  similar: (station: string) => `${API_BASE}/rt/similar?station=${encodeURIComponent(station)}`,
  stories: (station: string) => `${API_BASE}/rt/stories?station=${encodeURIComponent(station)}`,
  seasons: (station: string, basis: BasisId = 'all') => `${API_BASE}/rt/seasons?station=${encodeURIComponent(station)}&basis=${encodeURIComponent(basis)}`,
  yearly: (station: string, metric = 'avg_temp') => `${API_BASE}/stats/yearly?station=${encodeURIComponent(station)}&metric=${encodeURIComponent(metric)}`,
  regionStats: (stations = '108,159,184') => `${API_BASE}/stats/region?stations=${encodeURIComponent(stations)}`,
  dateWeather: (station: string, month: number, day: number) => `${API_BASE}/stats/date-weather?stn=${encodeURIComponent(station)}&cal=solar&m=${month}&d=${day}&period=recent10&part=daily`,
  dateBattle: (station: string, battleCases: Array<{ month: number; day: number }>) => {
    const ids = ['A', 'B', 'C', 'D'] as const;
    const cases = battleCases
      .slice(0, 4)
      .map((c, i) => `${ids[i]}.${station}.S.${Number(c.month)}.${Number(c.day)}.0`)
      .join(',');
    return `${API_BASE}/stats/date-battle?stn=${encodeURIComponent(station)}&cases=${encodeURIComponent(cases)}&period=recent10&part=summary`;
  },
  highlights: (station: string) => `${API_BASE}/stats/highlights?station=${encodeURIComponent(station)}`,
} as const;
