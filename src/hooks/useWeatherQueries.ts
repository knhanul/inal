import { useQuery, useQueryClient } from '@tanstack/react-query';
import { WEATHER_ENDPOINTS } from '../api/endpoints';
import { fetchWeatherApi } from '../api/client';
import {
  getDevFallbackNow,
  getDevFallbackToday,
  getDevFallbackForecast,
  getDevFallbackForecastWind,
  getDevFallbackRegions,
  getDevFallbackStories,
  getDevFallbackSimilar,
  getDevFallbackRecords,
  getDevFallbackSeasons,
  getDevFallbackLife,
  getDevFallbackYearly,
  getDevFallbackRegionStats,
  getDevFallbackHighlights,
  getDevFallbackDateWeather,
  getDevFallbackDateBattle,
} from '../api/devFallback';
import type {
  ApiRtNowResponse,
  ApiRtTodayResponse,
  ApiRtForecastResponse,
  ApiRtForecastWindResponse,
  ApiRtRegionsResponse,
  ApiRtRecordsResponse,
  ApiRtLifeResponse,
  ApiRtSimilarResponse,
  ApiRtStoriesResponse,
  ApiRtSeasonsResponse,
  ApiStatsYearlyResponse,
  ApiStatsRegionResponse,
  ApiStatsDateWeatherResponse,
  ApiStatsDateBattleResponse,
  ApiStatsHighlightsResponse,
  BasisId,
} from '../types/api';

export const weatherQueryKeys = {
  now: (station: string) => ['weather', 'rt', 'now', station] as const,
  today: (station: string) => ['weather', 'rt', 'today', station] as const,
  forecast: (station: string) => ['weather', 'rt', 'forecast', station] as const,
  forecastWind: (station: string) => ['weather', 'rt', 'forecast-wind', station] as const,
  regions: () => ['weather', 'rt', 'regions'] as const,
  records: (station: string) => ['weather', 'rt', 'records', station] as const,
  life: (station: string) => ['weather', 'rt', 'life', station] as const,
  similar: (station: string) => ['weather', 'rt', 'similar', station] as const,
  stories: (station: string) => ['weather', 'rt', 'stories', station] as const,
  seasons: (station: string, basis: BasisId) => ['weather', 'rt', 'seasons', station, basis] as const,
  yearly: (station: string, metric: string) => ['weather', 'stats', 'yearly', station, metric] as const,
  regionStats: (stations: string) => ['weather', 'stats', 'region', stations] as const,
  dateWeather: (station: string, month: number, day: number) => ['weather', 'stats', 'date-weather', station, month, day] as const,
  dateBattle: (station: string, date1: string, date2: string) => ['weather', 'stats', 'date-battle', station, date1, date2] as const,
  highlights: (station: string) => ['weather', 'stats', 'highlights', station] as const,
};

export function useRtNowQuery(station: string, enabled = true) {
  return useQuery({
    queryKey: weatherQueryKeys.now(station),
    queryFn: () => fetchWeatherApi<ApiRtNowResponse>(WEATHER_ENDPOINTS.now(station), () => getDevFallbackNow(station)),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useRtTodayQuery(station: string, enabled = true) {
  return useQuery({
    queryKey: weatherQueryKeys.today(station),
    queryFn: () => fetchWeatherApi<ApiRtTodayResponse>(WEATHER_ENDPOINTS.today(station), () => getDevFallbackToday(station)),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useRtForecastQuery(station: string, enabled = true) {
  return useQuery({
    queryKey: weatherQueryKeys.forecast(station),
    queryFn: () => fetchWeatherApi<ApiRtForecastResponse>(WEATHER_ENDPOINTS.forecast(station), () => getDevFallbackForecast(station)),
    enabled,
    staleTime: 3 * 60 * 1000,
  });
}

export function useRtForecastWindQuery(station: string, enabled = true) {
  return useQuery({
    queryKey: weatherQueryKeys.forecastWind(station),
    queryFn: () => fetchWeatherApi<ApiRtForecastWindResponse>(WEATHER_ENDPOINTS.forecastWind(station), () => getDevFallbackForecastWind(station)),
    enabled,
    staleTime: 3 * 60 * 1000,
  });
}

export function useRtRegionsQuery(enabled = true) {
  return useQuery({
    queryKey: weatherQueryKeys.regions(),
    queryFn: () => fetchWeatherApi<ApiRtRegionsResponse>(WEATHER_ENDPOINTS.regions(), () => getDevFallbackRegions()),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useRtStoriesQuery(station: string, enabled = true) {
  return useQuery({
    queryKey: weatherQueryKeys.stories(station),
    queryFn: () => fetchWeatherApi<ApiRtStoriesResponse>(WEATHER_ENDPOINTS.stories(station), () => getDevFallbackStories(station)),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

export function useRtSimilarQuery(station: string, enabled = true) {
  return useQuery({
    queryKey: weatherQueryKeys.similar(station),
    queryFn: () => fetchWeatherApi<ApiRtSimilarResponse>(WEATHER_ENDPOINTS.similar(station), () => getDevFallbackSimilar(station)),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRtRecordsQuery(station: string, enabled = true) {
  return useQuery({
    queryKey: weatherQueryKeys.records(station),
    queryFn: () => fetchWeatherApi<ApiRtRecordsResponse>(WEATHER_ENDPOINTS.records(station), () => getDevFallbackRecords(station)),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRtSeasonsQuery(station: string, basis: BasisId, enabled = true) {
  return useQuery({
    queryKey: weatherQueryKeys.seasons(station, basis),
    queryFn: () => fetchWeatherApi<ApiRtSeasonsResponse>(WEATHER_ENDPOINTS.seasons(station, basis), () => getDevFallbackSeasons(station, basis)),
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}

export function useRtLifeQuery(station: string, enabled = true) {
  return useQuery({
    queryKey: weatherQueryKeys.life(station),
    queryFn: () => fetchWeatherApi<ApiRtLifeResponse>(WEATHER_ENDPOINTS.life(station), () => getDevFallbackLife(station)),
    enabled,
    staleTime: 3 * 60 * 1000,
  });
}

export function useStatsYearlyQuery(station: string, metric = 'ta_avg', enabled = true) {
  return useQuery({
    queryKey: weatherQueryKeys.yearly(station, metric),
    queryFn: () => fetchWeatherApi<ApiStatsYearlyResponse>(WEATHER_ENDPOINTS.yearly(station, metric), () => getDevFallbackYearly(station)),
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}

export function useStatsRegionQuery(stations = '108,159,184', enabled = true) {
  return useQuery({
    queryKey: weatherQueryKeys.regionStats(stations),
    queryFn: () => fetchWeatherApi<ApiStatsRegionResponse>(WEATHER_ENDPOINTS.regionStats(stations), () => getDevFallbackRegionStats()),
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}

export function useStatsHighlightsQuery(station: string, enabled = true) {
  return useQuery({
    queryKey: weatherQueryKeys.highlights(station),
    queryFn: () => fetchWeatherApi<ApiStatsHighlightsResponse>(WEATHER_ENDPOINTS.highlights(station), () => getDevFallbackHighlights(station)),
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}

export function useStatsDateWeatherQuery(station: string, month: number, day: number, enabled = true) {
  return useQuery({
    queryKey: weatherQueryKeys.dateWeather(station, month, day),
    queryFn: () => fetchWeatherApi<ApiStatsDateWeatherResponse>(WEATHER_ENDPOINTS.dateWeather(station, month, day), () => getDevFallbackDateWeather(station, month, day)),
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}

export function useStatsDateBattleQuery(station: string, date1: string, date2: string, enabled = true) {
  return useQuery({
    queryKey: weatherQueryKeys.dateBattle(station, date1, date2),
    queryFn: () => fetchWeatherApi<ApiStatsDateBattleResponse>(WEATHER_ENDPOINTS.dateBattle(station, date1, date2), () => getDevFallbackDateBattle(station, date1, date2)),
    enabled,
    staleTime: 10 * 60 * 1000,
  });
}

export function usePrefetchAdjacentCards(station: string) {
  const queryClient = useQueryClient();
  const prefetchTodayAdjacent = (activeIndex: number) => {
    if (activeIndex === 0) {
      queryClient.prefetchQuery({
        queryKey: weatherQueryKeys.stories(station),
        queryFn: () => fetchWeatherApi(WEATHER_ENDPOINTS.stories(station), () => getDevFallbackStories(station)),
        staleTime: 2 * 60 * 1000,
      });
    } else if (activeIndex === 1) {
      queryClient.prefetchQuery({
        queryKey: weatherQueryKeys.forecast(station),
        queryFn: () => fetchWeatherApi(WEATHER_ENDPOINTS.forecast(station), () => getDevFallbackForecast(station)),
        staleTime: 3 * 60 * 1000,
      });
    } else if (activeIndex >= 2) {
      queryClient.prefetchQuery({
        queryKey: weatherQueryKeys.similar(station),
        queryFn: () => fetchWeatherApi(WEATHER_ENDPOINTS.similar(station), () => getDevFallbackSimilar(station)),
        staleTime: 5 * 60 * 1000,
      });
    }
  };
  return { prefetchTodayAdjacent };
}
