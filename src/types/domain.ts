import type { BasisId } from './api';

export type WeatherConditionTheme = 'sunny' | 'cloudy' | 'rain' | 'snow' | 'night';

export type DataKind = 'obs' | 'fcst' | 'stats' | 'mix';

export interface StationInfo {
  id: string;
  name: string;
  regionGroup: string;
  lat: number;
  lon: number;
  gridNx: number;
  gridNy: number;
  isDefaultFavorite?: boolean;
}

export interface DataProvenance {
  kind: DataKind;
  sourceName: string;
  referenceTime: string;
  note?: string;
  isDevFallback?: boolean;
}

export interface DistributionBand {
  basisId: BasisId;
  periodLabel: string;
  mean: number | null;
  diff: number | null;
  p10: number | null;
  p90: number | null;
  min: number | null;
  minYear?: number;
  max: number | null;
  maxYear?: number;
  percentile: number | null;
  rank: number | null;
  sampleCount: number | null;
  summary: string | null;
}

export interface CurrentWeatherDomain {
  stationId: string;
  stationName: string;
  observedAt: string;
  temperature: number | null;
  humidity: number | null;
  rainfall1h: number | null;
  windSpeed: number | null;
  windDirectionText: string | null;
  skyText: string | null;
  precipTypeText: string | null;
  conditionTheme: WeatherConditionTheme;
  todayMaxTemp: number | null;
  todayMaxProvenance: DataProvenance;
  todayMinTemp: number | null;
  todayMinProvenance: DataProvenance;
  provenance: DataProvenance;
  distributions: Record<BasisId, DistributionBand>;
  secondaryComparison: {
    humidityMean: Record<BasisId, number | null>;
    rainfallMean: Record<BasisId, number | null>;
    windSpeedMean: Record<BasisId, number | null>;
  };
}
