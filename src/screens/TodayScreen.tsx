import { useQuery } from "@tanstack/react-query";
import { getNow, getToday } from "../api/weather";
import type { BasisId, PeriodBrief } from "../api/types";
import { CardCarousel } from "../components/CardCarousel";
import { DataSourceLabel, EmptyState, ErrorState, LoadingSkeleton } from "../components/States";
import { WeatherIcon, weatherTone } from "../components/WeatherIcon";
import { diffLine, hm, num } from "../lib/format";

function pick(list: PeriodBrief[] | undefined, basis: BasisId) {
  return list?.find((p) => p.id === basis) || list?.[0] || null;
}

export function TodayScreen({ station, basis, onOpen }: { station: string; basis: BasisId; onOpen: (title: string, body: string) => void }) {
  const nowQ = useQuery({ queryKey: ["now", station], queryFn: () => getNow(station) });
  const todayQ = useQuery({ queryKey: ["today", station], queryFn: () => getToday(station) });
  const data = todayQ.data || nowQ.data;
  const cur = data?.current;
  const values = cur?.values;
  const tone = weatherTone(values?.pty, null);
  const cmp = pick(cur?.compare?.ta, basis);

  if (nowQ.isLoading && !data) return <LoadingSkeleton label="지금 날씨를 불러오는 중" />;
  if (nowQ.isError && !data) return <ErrorState message={(nowQ.error as Error).message} onRetry={() => { void nowQ.refetch(); void todayQ.refetch(); }} />;
  if (!values) return <EmptyState title="지금 실황이 없습니다" text={cur?.message || cur?.freshness?.text || "이 시각의 초단기실황이 없습니다. 없는 값을 만들지 않습니다."} />;

  const hours = (todayQ.data?.hours || []).filter((h) => h.obs != null || h.fcst != null);
  const fromHour = cur?.hour ?? 0;
  const next = hours.filter((h) => h.hour >= fromHour).slice(0, 12);
  const story = todayQ.data?.stories?.[0];
  const max = data?.day?.max;
  const min = data?.day?.min;
  const fresh = cur?.freshness?.text || (cur?.freshness?.state === "fresh" ? "최신" : "시각 확인");

  return (
    <CardCarousel label="오늘">
      <article className="card hero-now" style={{ ["--wash" as string]: tone.wash }}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{data?.station?.name} · 지금</p>
          <span className="chip">{fresh} · {hm(cur?.time)}</span>
        </div>
        <div className="mt-6 flex items-end justify-between gap-3">
          <p className="metric text-7xl font-semibold leading-none">{num(values.ta, 1)}<span className="text-3xl">℃</span></p>
          <WeatherIcon pty={values.pty} size={54} />
        </div>
        <p className="mt-3 text-lg">{values.pty && values.pty !== "없음" ? values.pty : "강수 없음"} · {values.windDir || "바람"} {num(values.ws) ? `${num(values.ws)}m/s` : ""}</p>
        <p className="mt-2 text-[15px] leading-relaxed">{cmp ? diffLine(cmp.label, cmp.mean, cmp.diff) : "과거 평균과 비교할 값이 없습니다"}</p>
        <button type="button" className="mt-4 self-start text-sm font-semibold text-[var(--coral)]" onClick={() => onOpen("지금 기온", [cur?.source, cur?.time, cmp ? `${cmp.range} 평균 ${num(cmp.mean)}℃` : "", cmp?.percentile != null ? `백분위 ${cmp.percentile}` : ""].filter(Boolean).join("\n"))}>자세히</button>
        <DataSourceLabel>{cur?.source || "기상청 초단기실황"} · 격자 값이라 관측소와 위치가 다를 수 있습니다</DataSourceLabel>
      </article>

      <article className="card">
        <p className="text-sm font-semibold">오늘 최고 · 최저 예보</p>
        <div className="mt-8 grid grid-cols-2 gap-3">
          <div><p className="text-xs text-[var(--muted)]">최고</p><p className="metric text-5xl font-semibold">{num(max?.value) ?? "—"}</p><p className="text-xs text-[var(--muted)]">{max?.source || "자료 없음"}</p></div>
          <div><p className="text-xs text-[var(--muted)]">최저</p><p className="metric text-5xl font-semibold">{num(min?.value) ?? "—"}</p><p className="text-xs text-[var(--muted)]">{min?.source || "자료 없음"}</p></div>
        </div>
        <p className="mt-4 text-sm leading-relaxed">{max?.compare ? diffLine(pick(max.compare, basis)?.label || "평균", pick(max.compare, basis)?.mean, pick(max.compare, basis)?.diff) : "최고기온 비교 자료가 없습니다"}</p>
        <DataSourceLabel>예보입니다. 기록인지는 관측이 끝난 뒤에만 알 수 있습니다. {hm(max?.base) ? `발표 ${hm(max?.base)}` : ""}</DataSourceLabel>
      </article>

      <article className="card">
        <p className="text-sm font-semibold">이어지는 기온</p>
        {todayQ.isLoading ? <p className="mt-6 text-sm text-[var(--muted)]">시간별 자료를 불러오는 중</p> : null}
        {todayQ.isError ? <button type="button" className="mt-4 text-sm font-semibold text-[var(--coral)]" onClick={() => void todayQ.refetch()}>시간별 다시 시도</button> : null}
        <div className="hscroll mt-5">
          {next.map((h) => {
            const obs = h.obs != null;
            return (
              <div key={h.time} className="hchip">
                <p className="text-xs text-[var(--muted)]">{h.hour}시</p>
                <p className="metric mt-1 text-lg font-semibold">{num(obs ? h.obs : h.fcst) ?? "—"}</p>
                <p className="text-[10px] text-[var(--muted)]">{obs ? "실황" : "예보"}</p>
              </div>
            );
          })}
        </div>
        {!next.length && !todayQ.isLoading ? <p className="mt-4 text-sm text-[var(--muted)]">표시할 시간별 기온이 없습니다.</p> : null}
        <DataSourceLabel>실황은 초단기실황, 이후 시각은 초단기·단기예보입니다. 빈 칸은 자료가 없는 시각입니다.</DataSourceLabel>
      </article>

      <article className="card">
        <p className="text-sm font-semibold">오늘의 이야기</p>
        {story ? (
          <>
            <h3 className="mt-5 text-2xl font-bold leading-snug">{story.title}</h3>
            <p className="mt-3 text-[15px] leading-relaxed">{story.text}</p>
            <button type="button" className="mt-4 self-start text-sm font-semibold text-[var(--coral)]" onClick={() => onOpen(story.title, `${story.text || ""}\n\n${story.basis || ""}`)}>근거</button>
          </>
        ) : (
          <p className="mt-5 text-[15px] leading-relaxed text-[var(--muted)]">{todayQ.isLoading ? "이야기를 고르는 중" : "지금 조건에 해당하는 짧은 이야기가 없습니다."}</p>
        )}
        <DataSourceLabel>문장은 서버가 계산한 값만 보여 줍니다.</DataSourceLabel>
      </article>
    </CardCarousel>
  );
}
