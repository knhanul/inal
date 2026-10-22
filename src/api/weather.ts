import { apiGet } from "./client";
import type { BasisId, BattleResponse, DateWeatherResponse, ForecastResponse, LifeResponse, RecordsResponse, RegionsResponse, Station, StoriesResponse, TodayResponse, YtdResponse } from "./types";

const q = (station: string) => `station=${encodeURIComponent(station)}`;

export const getStations = () => apiGet<{ data?: Station[] }>("/api/stations", 12000);
export const getNow = (station: string) => apiGet<TodayResponse>(`/api/rt/now?${q(station)}`, 15000);
export const getToday = (station: string) => apiGet<TodayResponse>(`/api/rt/today?${q(station)}`, 20000);
export const getForecast = (station: string) => apiGet<ForecastResponse>(`/api/rt/forecast?${q(station)}`, 22000);
export const getYtd = (station: string) => apiGet<YtdResponse>(`/api/rt/ytd?${q(station)}`);
export const getLife = (station: string) => apiGet<LifeResponse>(`/api/rt/life?${q(station)}`, 25000);
export const getRecords = (station: string) => apiGet<RecordsResponse>(`/api/rt/records?${q(station)}`, 25000);
export const getRegions = () => apiGet<RegionsResponse>("/api/rt/regions", 25000);
export const getStories = (station: string, basis: BasisId) => apiGet<StoriesResponse>(`/api/rt/stories?${q(station)}&basis=${basis}`, 25000);

export function getDateWeather(station: string, month: number, day: number) {
  const p = new URLSearchParams({ station, cal: "solar", m: String(month), d: String(day), period: "recent10", part: "daily" });
  return apiGet<DateWeatherResponse>(`/api/stats/date-weather?${p}`, 25000);
}

export function getBattle(station: string) {
  const cases = `A.${station}.S.5.5.0,B.${station}.S.10.3.0`;
  const p = new URLSearchParams({ cases, period: "recent10", part: "summary" });
  return apiGet<BattleResponse>(`/api/stats/date-battle?${p}`, 25000);
}
