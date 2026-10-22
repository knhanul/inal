import React from 'react';
import type { MetricDisplayItem } from '../../types/viewmodel';

interface WeatherMetricProps {
  metric: MetricDisplayItem;
  compact?: boolean;
}

export const WeatherMetric: React.FC<WeatherMetricProps> = ({ metric, compact = false }) => {
  const highlightColor =
    metric.highlight === 'warm'
      ? 'text-inal-accent'
      : metric.highlight === 'cool'
      ? 'text-inal-rain'
      : 'text-inal-text';

  return (
    <div
      className={`flex flex-col justify-between rounded-xl bg-inal-surfaceSubtle/75 ${
        compact ? 'px-2.5 py-2' : 'px-3 py-2.5'
      }`}
    >
      <span className="text-[11px] font-medium text-inal-textMuted">{metric.label}</span>
      <span
        className={`mt-0.5 font-semibold tabular-nums tracking-tight ${
          metric.isMissing
            ? 'text-xs text-inal-textSoft'
            : compact
            ? `text-xs ${highlightColor}`
            : `text-sm ${highlightColor}`
        }`}
      >
        {metric.valueText}
      </span>
      {metric.subText && (
        <span className="mt-0.5 truncate text-[10px] text-inal-textSoft">{metric.subText}</span>
      )}
    </div>
  );
};
