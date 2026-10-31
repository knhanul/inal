import React, { useMemo, useRef, useState } from 'react';
import type { HourlyTimelineSlotViewModel } from '../../types/viewmodel';
import { WeatherIcon } from '../common/WeatherIcon';

interface Forecast72ChartProps {
  slots: HourlyTimelineSlotViewModel[];
  /** 각 칸의 실제 시각(ms). 차트를 실제 시간 간격대로 그리기 위해 쓴다. */
  slotTimesMs: Array<number | null>;
  stationName: string;
}

interface DayGroup {
  key: string;
  label: string;
  indices: number[];
}

const KOR_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

function dayKeyOf(ms: number | null): string {
  if (ms === null) return 'unknown';
  // KST 기준 날짜
  const kst = new Date(ms + 9 * 3600 * 1000);
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, '0')}-${String(kst.getUTCDate()).padStart(2, '0')}`;
}

function dayLabelOf(ms: number | null, firstKey: string, idx: number): string {
  if (ms === null) return '';
  if (idx === 0) return '오늘';
  if (idx === 1) return '내일';
  if (idx === 2) return '모레';
  const kst = new Date(ms + 9 * 3600 * 1000);
  return `${kst.getUTCMonth() + 1}/${kst.getUTCDate()}`;
}

export const Forecast72Chart: React.FC<Forecast72ChartProps> = ({ slots, slotTimesMs, stationName }) => {
  const [selected, setSelected] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [dragX, setDragX] = useState<number | null>(null);

  const groups = useMemo<DayGroup[]>(() => {
    const out: DayGroup[] = [];
    const seen = new Map<string, DayGroup>();
    slots.forEach((_, i) => {
      const key = dayKeyOf(slotTimesMs[i] ?? null);
      let g = seen.get(key);
      if (!g) {
        g = { key, label: dayLabelOf(slotTimesMs[i] ?? null, '', out.length), indices: [] };
        seen.set(key, g);
        out.push(g);
      }
      g.indices.push(i);
    });
    return out;
  }, [slots, slotTimesMs]);

  const [activeDay, setActiveDay] = useState(0);
  const dayGroup = groups[Math.min(activeDay, groups.length - 1)];
  const dayChips = useMemo(() => {
    if (!dayGroup) return [];
    // 하루 안에서는 3시간 간격으로 (시작 칸은 항상 포함)
    const base = dayGroup.indices[0];
    return dayGroup.indices.filter((i) => {
      if (i === base) return true;
      const t0 = slotTimesMs[base];
      const t = slotTimesMs[i];
      if (t0 === null || t === null || t0 === undefined || t === undefined) return true;
      return Math.abs(((t - t0) / 3600000) % 3) < 0.01;
    });
  }, [dayGroup, slotTimesMs]);

  if (!slots || slots.length === 0) {
    return (
      <div className="rounded-xl bg-inal-surfaceSubtle p-4 text-center text-xs text-inal-textMuted">
        시간별 예보 자료가 아직 수집되지 않았습니다.
      </div>
    );
  }

  const valid = slots
    .map((s, i) => ({ i, t: slotTimesMs[i], v: s.tempValue }))
    .filter((d) => d.t !== null && d.t !== undefined && d.v !== null && Number.isFinite(d.v as number)) as Array<{ i: number; t: number; v: number }>;

  if (valid.length < 2) {
    return (
      <div className="rounded-xl bg-inal-surfaceSubtle p-4 text-center text-xs text-inal-textMuted">
        그래프를 그릴 기온 예보가 아직 없습니다. 시간별 값은 ‘자세히 보기’에서 볼 수 있습니다.
      </div>
    );
  }

  const W = 320;
  const H = 150;
  const padTop = 20;
  const padBottom = 36;
  const padX = 4;

  const tStart = valid.length ? valid[0].t : 0;
  const tEnd = valid.length ? valid[valid.length - 1].t : 1;
  const span = Math.max(1, tEnd - tStart);
  const temps = valid.map((d) => d.v);
  const minV = Math.min(...temps);
  const maxV = Math.max(...temps);
  const lo = minV - 1.5;
  const hi = maxV + 1.5;

  const xOf = (t: number) => padX + ((t - tStart) / span) * (W - padX * 2);
  const yOf = (v: number) => padTop + (1 - (v - lo) / (hi - lo)) * (H - padTop - padBottom);

  const linePoints = valid.map((d) => `${xOf(d.t).toFixed(1)},${yOf(d.v).toFixed(1)}`).join(' ');

  // 날짜 경계 + 날짜 이름
  const dayMarks: Array<{ x: number; label: string }> = [];
  let lastKey = '';
  groups.forEach((g, gi) => {
    const firstIdx = g.indices[0];
    const firstT = slotTimesMs[firstIdx];
    if (firstT === null || firstT === undefined) return;
    const key = dayKeyOf(firstT);
    if (key !== lastKey) {
      lastKey = key;
      dayMarks.push({ x: xOf(firstT), label: g.label });
    }
  });

  // 12시간마다 시각 눈금. 날짜 경계(0시)는 날짜 이름이 대신하므로 겹치는 눈금은 뺀다.
  const boundaryXs = dayMarks.map((m) => m.x);
  const hourTicks = valid.filter((d) => {
    const kst = new Date(d.t + 9 * 3600 * 1000);
    if (kst.getUTCHours() % 12 !== 0) return false;
    const px = xOf(d.t);
    return boundaryXs.every((bx) => Math.abs(px - bx) > 24);
  });
  const tempTicks = valid.filter((d) => {
    const kst = new Date(d.t + 9 * 3600 * 1000);
    return kst.getUTCHours() % 12 === 0;
  });

  const sel = slots[Math.min(selected, slots.length - 1)];
  const selTime = slotTimesMs[Math.min(selected, slots.length - 1)];
  const selKst = selTime !== null && selTime !== undefined ? new Date(selTime + 9 * 3600 * 1000) : null;
  const selDayName = selKst ? dayLabelOf(selTime ?? null, '', groups.findIndex((g) => g.indices.includes(selected))) : '';

  const pickNearest = (clientX: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const targetT = tStart + ratio * span;
    let best = 0;
    let bestDiff = Infinity;
    valid.forEach((d) => {
      const diff = Math.abs(d.t - targetT);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = d.i;
      }
    });
    setSelected(best);
    const gIdx = groups.findIndex((g) => g.indices.includes(best));
    if (gIdx >= 0) setActiveDay(gIdx);
  };

  return (
    <div className="space-y-2.5">
      <div
        ref={wrapRef}
        data-no-carousel-swipe="true"
        role="img"
        aria-label={`${stationName} 앞으로 72시간 기온·강수확률 그래프. 그래프를 누르면 그 시각 값을 보여 줍니다.`}
        className="relative cursor-pointer select-none"
        onPointerDown={(e) => {
          setDragX(e.clientX);
          pickNearest(e.clientX);
        }}
        onPointerMove={(e) => {
          if (dragX !== null) pickNearest(e.clientX);
        }}
        onPointerUp={() => setDragX(null)}
        onPointerLeave={() => setDragX(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" className="block">
          {/* 강수확률 막대 */}
          {slots.map((s, i) => {
            const t = slotTimesMs[i];
            if (t === null || t === undefined) return null;
            const pop = s.popValue ?? 0;
            const h = Math.max(1.5, (pop / 100) * 18);
            return (
              <rect
                key={`bar-${i}`}
                x={xOf(t) - 1.4}
                y={H - padBottom - h}
                width={2.8}
                height={h}
                rx={1.3}
                fill={pop >= 60 ? 'var(--inal-weather-rain)' : '#9DC3E0'}
                opacity={pop >= 60 ? 0.95 : 0.55}
              />
            );
          })}

          {/* 기준선 */}
          <line x1={0} y1={H - padBottom} x2={W} y2={H - padBottom} stroke="var(--inal-border)" strokeWidth={1} />

          {/* 날짜 경계 */}
          {dayMarks.map((m, i) => (
            <line
              key={`div-${i}`}
              x1={m.x}
              y1={8}
              x2={m.x}
              y2={H - padBottom}
              stroke="var(--inal-border)"
              strokeWidth={1}
              strokeDasharray="2 3"
            />
          ))}

          {/* 기온 선 */}
          <polyline
            points={linePoints}
            fill="none"
            stroke="var(--inal-accent)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* 눈금 점 */}
          {tempTicks.map((d) => (
            <circle
              key={`dot-${d.t}`}
              cx={xOf(d.t)}
              cy={yOf(d.v)}
              r={2.2}
              fill="var(--inal-surface)"
              stroke="var(--inal-accent)"
              strokeWidth={1.6}
            />
          ))}

          {/* 기온 숫자 */}
          {tempTicks.map((d) => (
            <text
              key={`tv-${d.t}`}
              x={xOf(d.t)}
              y={yOf(d.v) - 7}
              fontSize={9.5}
              fontWeight={800}
              fill="var(--inal-text)"
              textAnchor="middle"
            >
              {Math.round(d.v)}
            </text>
          ))}

          {/* 시각 눈금 */}
          {hourTicks.map((d) => {
            const kst = new Date(d.t + 9 * 3600 * 1000);
            return (
              <text
                key={`ht-${d.t}`}
                x={xOf(d.t)}
                y={H - 17}
                fontSize={8.5}
                fontWeight={600}
                fill="var(--inal-text-soft)"
                textAnchor="middle"
              >
                {kst.getUTCHours()}시
              </text>
            );
          })}

          {/* 날짜 이름: 경계선 바로 오른쪽 아래 */}
          {dayMarks.map((m, i) => (
            <text
              key={`dl-${i}`}
              x={Math.max(3, Math.min(m.x + 3, W - 32))}
              y={H - 3}
              fontSize={9}
              fontWeight={800}
              fill="var(--inal-text-muted)"
            >
              {m.label}
            </text>
          ))}

          {/* 선택 표시 */}
          {selTime !== null && selTime !== undefined && (
            <g pointerEvents="none">
              <line
                x1={xOf(selTime)}
                y1={6}
                x2={xOf(selTime)}
                y2={H - padBottom}
                stroke="var(--inal-accent)"
                strokeWidth={1.2}
                opacity={0.5}
              />
              {sel && sel.tempValue !== null && (
                <circle cx={xOf(selTime)} cy={yOf(sel.tempValue)} r={3.6} fill="var(--inal-accent)" stroke="var(--inal-surface)" strokeWidth={1.6} />
              )}
            </g>
          )}
        </svg>
      </div>

      <div className="flex items-center justify-between gap-2 rounded-xl border border-inal-border bg-inal-surfaceSubtle/70 px-3 py-2 text-[11px] font-semibold text-inal-text">
        <span className="flex min-w-0 items-center gap-1.5">
          <WeatherIcon condition={sel.conditionIcon} size="sm" label={sel.conditionText} />
          <span className="truncate">
            {selDayName} {sel.timeLabel} · {sel.conditionText}
          </span>
        </span>
        <span className="shrink-0 tabular-nums text-inal-textMuted">
          <b className="text-inal-text">{sel.tempText}</b> · 강수 {sel.popText} · {sel.windText}
        </span>
      </div>

      {groups.length > 1 && (
        <div
          role="tablist"
          aria-label="72시간 예보 날짜 선택"
          data-no-carousel-swipe="true"
          className="grid gap-1 rounded-xl border border-inal-border bg-inal-surfaceSubtle p-1"
          style={{ gridTemplateColumns: `repeat(${groups.length}, minmax(0, 1fr))` }}
        >
          {groups.map((g, i) => (
            <button
              key={g.key}
              type="button"
              role="tab"
              aria-selected={i === activeDay}
              onClick={() => {
                setActiveDay(i);
                setSelected(g.indices[0]);
              }}
              className={`rounded-lg py-1.5 text-[11px] font-bold transition ${
                i === activeDay ? 'bg-inal-accent text-white shadow-sm' : 'text-inal-textMuted'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      )}

      <div data-no-carousel-swipe="true" className="flex gap-1">
        {dayChips.map((i) => {
          const s = slots[i];
          const isHighPop = (s.popValue ?? 0) >= 60;
          const isSel = i === selected;
          return (
            <button
              key={`chip-${i}`}
              type="button"
              onClick={() => {
                setSelected(i);
                const gIdx = groups.findIndex((g) => g.indices.includes(i));
                if (gIdx >= 0) setActiveDay(gIdx);
              }}
              className={`flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl border px-0.5 py-1.5 ${
                isSel
                  ? 'border-inal-accent bg-inal-accentSoft'
                  : isHighPop
                  ? 'border-sky-200 bg-sky-50/70'
                  : 'border-inal-border/80 bg-inal-surfaceSubtle/60'
              }`}
            >
              <span className="text-[9px] font-semibold tabular-nums leading-none text-inal-textMuted">
                {i === 0 ? '지금' : s.timeLabel}
              </span>
              <WeatherIcon condition={s.conditionIcon} size="sm" label={s.conditionText} />
              <span className="text-[11px] font-bold tabular-nums leading-none text-inal-text">{s.tempText}</span>
              <span
                className={`text-[9px] font-semibold tabular-nums leading-none ${
                  isHighPop ? 'text-sky-700' : 'text-inal-textSoft'
                }`}
              >
                {s.popText}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] font-medium leading-relaxed text-inal-textSoft">
        그래프는 72시간 전체를 한 번에 보여 주고, 아래에서 고른 날의 3시간 간격 값만 펼칩니다. 시간별 전체 표는 ‘자세히 보기’에 있습니다.
      </p>
    </div>
  );
};

export default Forecast72Chart;
