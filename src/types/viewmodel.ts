import type { BasisId } from './api';
import type { DataProvenance, DistributionBand, WeatherConditionTheme } from './domain';

export type MainTabId = 'today' | 'forecast' | 'compare' | 'story';

export interface MetricDisplayItem {
  label: string;
  valueText: string;
  subText?: string;
  isMissing: boolean;
  highlight?: 'warm' | 'cool' | 'neutral';
}

export interface BottomSheetDetailPayload {
  id: string;
  categoryBadge: string;
  title: string;
  subtitle: string;
  provenance: DataProvenance;
  distribution?: DistributionBand;
  allDistributions?: Record<BasisId, DistributionBand>;
  metrics?: MetricDisplayItem[];
  chartSeries?: {
    type: 'hourly-obs-fcst' | 'yearly-bars' | 'daily-range' | 'battle-bars';
    unit: string;
    points: Array<{
      label: string;
      primaryValue: number | null;
      secondaryValue?: number | null;
      baselineValue?: number | null;
      kind?: 'obs' | 'fcst' | 'stats';
      note?: string;
    }>;
  };
  tableRows?: Array<{
    label: string;
    col1: string;
    col2: string;
    col3?: string;
    highlight?: boolean;
  }>;
  explanationTitle?: string;
  explanationBody: string[];
  cautionNote?: string;
}

export interface HeroCardViewModel {
  stationId: string;
  stationName: string;
  theme: WeatherConditionTheme;
  temperatureText: string;
  isTempMissing: boolean;
  conditionLabel: string;
  anomalyHeadline: string;
  anomalySubline: string;
  todayHighText: string;
  todayLowText: string;
  metrics: MetricDisplayItem[];
  distribution: DistributionBand;
  provenance: DataProvenance;
  detail: BottomSheetDetailPayload;
}

export interface StoryCardViewModel {
  id: string;
  badgeText: string;
  kind: 'obs' | 'fcst' | 'mix' | 'stats';
  title: string;
  summary: string;
  highlightValue?: string;
  tags: string[];
  provenance: DataProvenance;
  detail: BottomSheetDetailPayload;
}

export interface HourlyTimelineSlotViewModel {
  timeLabel: string;
  hour: number;
  tempText: string;
  tempValue: number | null;
  popText: string;
  popValue: number | null;
  windText: string;
  windDirText?: string;
  conditionIcon: WeatherConditionTheme;
  conditionText: string;
  kind: 'obs' | 'fcst';
}

export interface DailyForecastItemViewModel {
  date: string;
  dateLabel: string;
  dayOfWeek: string;
  isToday: boolean;
  minTempText: string;
  maxTempText: string;
  minVal: number | null;
  maxVal: number | null;
  normalMinVal: number | null;
  normalMaxVal: number | null;
  popText: string;
  conditionIcon: WeatherConditionTheme;
  conditionText: string;
  sourceLabel: string;
}
