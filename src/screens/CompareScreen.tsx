import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getLife, getRecords, getRegions, getYtd } from "../api/weather";
import type { BasisId } from "../api/types";
import { CardCarousel } from "../components/CardCarousel";
import { DataSourceLabel, ErrorState, LoadingSkeleton } from "../components/States";
import { num, signed } from "../lib/format";

export function CompareScreen({ station, basis }: { station: string; basis: BasisId }) {
  const ytd = useQuery({ queryKey: ["ytd", station], queryFn: () => getYtd(station) });
  const life = useQuery({ queryKey: ["life", station], queryFn: () => getLife(station), enabled: ytd.isSuccess });
  const records = useQuery({ queryKey: ["records", station], queryFn: () => getRecords(station), enabled: ytd.isSuccess });
  const [wantRegions, setWantRegions] = useState(false);
  const regions = useQuery({ queryKey: ["regions"], queryFn: () => getRegions(), enabled: wantRegions, staleTime: 60_000 });

  const yItem = (id: string) => ytd.data?.items?.find((x) => x.id === id);
  const period = (id: string) => yItem(id)?.periods?.find((p) => p.id === basis);
  const dev = regions.data?.rankDeviation?.find((r) => r.id === station);
  const above = regions.data?.rankAboveAvg?.find((r) => r.id === station);
  const row = regions.data?.rows?.find((r) => r.id === station);

  return (
    <CardCarousel label="비교">
      {ytd.isLoading ? <LoadingSkeleton label="올해 누적" /> : ytd.isError ? <ErrorState message={(ytd.error as Error).message} onRetry={() => void ytd.refetch()} /> : (
        <article className="card">
          <p className="text-sm font-semibold">올해 지금까지</p>
          <p className="mt-1 text-xs text-[var(--muted)]">{ytd.data?.asOf ? `${ytd.data.asOf}까지` : ytd.data?.message}</p>
          {(["avg", "rain"] as const).map((id) => {
            const it = yItem(id);
            const p = period(id);
            return (
              <div key={id} className="mt-5">
                <p className="text-xs text-[var(--muted)]">{it?.label || id}</p>
                <p className="metric text-4xl font-semibold">{it?.value != null ? `${num(it.value, id === "rain" ? 1 : 1)}${it.unit}` : "—"}</p>
                <p className="text-sm">{p?.diff != null ? `평균보다 ${signed(p.diff)}${it?.unit || ""}` : p?.statusText || "비교 수치가 없습니다"}</p>
              </div>
            );
          })}
          <DataSourceLabel>{ytd.data?.source || "공식 일자료, 끝난 날까지"}</DataSourceLabel>
        </article>
      )}

      {life.isLoading ? <LoadingSkeleton label="생활 속 날씨" /> : life.isError ? <ErrorState message={(life.error as Error).message} onRetry={() => void life.refetch()} /> : (
        <article className="card">
          <p className="text-sm font-semibold">생활 속 질문</p>
          <ul className="mt-4 space-y-4">
            {(life.data?.items || []).slice(0, 4).map((it) => (
              <li key={it.id}>
                <p className="text-[15px] font-semibold leading-snug">{it.q}</p>
                <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{it.answer || it.note || "답이 없습니다"}</p>
              </li>
            ))}
          </ul>
          <DataSourceLabel>질문과 답은 기존 서비스가 계산한 문장입니다.</DataSourceLabel>
        </article>
      )}

      {records.isLoading ? <LoadingSkeleton label="기록" /> : records.isError ? <ErrorState message={(records.error as Error).message} onRetry={() => void records.refetch()} /> : (
        <article className="card">
          <p className="text-sm font-semibold">같은 시기 기록</p>
          {records.data?.now_rank ? (
            <>
              <p className="metric mt-6 text-5xl font-semibold">{num(records.data.now_rank.value)}℃</p>
              <p className="mt-2 text-sm">{records.data.now_rank.kind} · {records.data.now_rank.time}</p>
              <ul className="mt-4 space-y-2 text-sm">
                {(records.data.now_rank.periods || []).map((p) => (
                  <li key={p.id}>{p.label}: {p.percentile != null ? `백분위 ${p.percentile}` : "백분위 없음"}{p.rankHigh != null ? ` · 높은 쪽 ${p.rankHigh}` : ""}</li>
                ))}
              </ul>
            </>
          ) : <p className="mt-4 text-sm">최신 실황이 없어 순위를 내지 않습니다.</p>}
          <DataSourceLabel>{records.data?.rule || "예보값은 기록으로 확정하지 않습니다."}</DataSourceLabel>
        </article>
      )}

      {wantRegions ? (regions.isLoading ? <LoadingSkeleton label="지역 비교" /> : regions.isError ? <ErrorState message={(regions.error as Error).message} onRetry={() => void regions.refetch()} /> : (
        <article className="card">
          <p className="text-sm font-semibold">다른 지점과</p>
          <p className="metric mt-6 text-5xl font-semibold">{row?.temp != null ? `${num(row.temp)}℃` : "—"}</p>
          <p className="mt-3 text-[15px] leading-relaxed">
            {dev ? `평소에서 벗어난 순 ${dev.rank}위 (${dev.direction === "high" ? "더운 쪽" : dev.direction === "low" ? "추운 쪽" : "가운데"})` : row?.note || "이 시각 비교에서 빠졌습니다"}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">{above ? `평균보다 높은 순 ${above.rank}위` : ""} {regions.data?.comparable != null ? `· 비교 ${regions.data.comparable}곳` : ""}</p>
          <DataSourceLabel>{regions.data?.note || "전국 순위가 아닙니다."}</DataSourceLabel>
        </article>
      )) : (
        <article className="card">
          <p className="text-sm font-semibold">다른 지점과</p>
          <p className="mt-4 text-[15px] leading-relaxed">같은 시각의 다른 관측지점과 비교합니다. 지점이 여럿이라 열 때 불러옵니다.</p>
          <button type="button" className="icon-btn mt-4 self-start bg-[var(--coral-soft)] px-4 text-sm font-semibold" onClick={() => setWantRegions(true)}>지역 비교 보기</button>
        </article>
      )}
    </CardCarousel>
  );
}
