import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getForecast } from "../api/weather";
import type { BasisId } from "../api/types";
import { DataSourceLabel, ErrorState, LoadingSkeleton } from "../components/States";
import { WeatherIcon } from "../components/WeatherIcon";
import { hm, md, num, signed, weekday } from "../lib/format";

export function ForecastScreen({ station, basis }: { station: string; basis: BasisId }) {
  const [mode, setMode] = useState<"hour" | "day">("hour");
  const q = useQuery({ queryKey: ["forecast", station], queryFn: () => getForecast(station) });
  if (q.isLoading) return <LoadingSkeleton label="예보를 불러오는 중" />;
  if (q.isError || !q.data) return <ErrorState message={(q.error as Error)?.message || "예보가 없습니다"} onRetry={() => void q.refetch()} />;
  const data = q.data;
  const hours = (data.hours || []).slice(0, 72);
  const days = (data.days || []).filter((d) => !d.none).slice(0, 10);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="seg mb-3">
        <button type="button" className={mode === "hour" ? "on" : ""} onClick={() => setMode("hour")}>시간별</button>
        <button type="button" className={mode === "day" ? "on" : ""} onClick={() => setMode("day")}>일별</button>
      </div>
      {mode === "hour" ? (
        <article className="card">
          <p className="text-sm font-semibold">앞으로의 기온</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{data.releases?.ultra?.base ? `초단기 ${hm(data.releases.ultra.base)}` : ""} {data.releases?.vilage?.base ? `· 단기 ${hm(data.releases.vilage.base)}` : ""}</p>
          <div className="hscroll mt-4">
            {hours.map((h) => (
              <div key={h.time} className="hchip min-w-[76px]">
                <p className="text-[11px] text-[var(--muted)]">{md(h.time)} {hm(h.time)}</p>
                <div className="my-1 flex justify-center"><WeatherIcon pty={h.pty} sky={h.sky} size={18} /></div>
                <p className="metric text-lg font-semibold">{num(h.ta) ?? "—"}</p>
                <p className="text-[10px] text-[var(--muted)]">{h.pop != null ? `강수 ${num(h.pop, 0)}%` : h.pty || ""}</p>
                <p className="text-[10px] text-[var(--coral)]">{signed(h.diff?.[basis]) ?? ""}</p>
              </div>
            ))}
          </div>
          {!hours.length ? <p className="mt-4 text-sm">{data.message || "시간별 예보가 없습니다."}</p> : null}
          <DataSourceLabel>강수확률은 단기예보에만 있습니다. 색 숫자는 고른 비교 기간 평균과의 차이(℃)이고, 없으면 비웁니다.</DataSourceLabel>
        </article>
      ) : (
        <article className="card">
          <p className="text-sm font-semibold">날짜별 최고 · 최저</p>
          <div className="mt-3 space-y-2">
            {days.map((d) => (
              <div key={d.date} className="flex items-center gap-3 rounded-2xl bg-[#f6f1ea] px-3 py-2">
                <div className="w-14">
                  <p className="text-sm font-semibold">{md(d.date)}</p>
                  <p className="text-[11px] text-[var(--muted)]">{weekday(d.date)}</p>
                </div>
                <WeatherIcon pty={d.sky} sky={d.wf} size={20} />
                <p className="min-w-0 flex-1 truncate text-xs text-[var(--muted)]">{d.wf || d.sky || d.wxSource || ""}</p>
                <p className="metric text-sm font-semibold">{num(d.min) ?? "—"} / {num(d.max) ?? "—"}</p>
              </div>
            ))}
          </div>
          {data.outlook?.text ? <p className="mt-4 text-sm leading-relaxed">{data.outlook.text}</p> : null}
          <DataSourceLabel>{days[0]?.maxSource || "단기·중기예보"} · 10일까지는 응답에 있는 날짜만 보여 줍니다.</DataSourceLabel>
        </article>
      )}
    </div>
  );
}
