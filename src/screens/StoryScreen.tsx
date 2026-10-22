import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getBattle, getDateWeather, getStories } from "../api/weather";
import type { BasisId } from "../api/types";
import { CardCarousel } from "../components/CardCarousel";
import { DataSourceLabel, EmptyState, ErrorState, LoadingSkeleton } from "../components/States";

export function StoryScreen({ station, basis }: { station: string; basis: BasisId }) {
  const stories = useQuery({ queryKey: ["stories", station, basis], queryFn: () => getStories(station, basis) });
  const [month, setMonth] = useState(5);
  const [day, setDay] = useState(5);
  const [askDate, setAskDate] = useState(false);
  const [askBattle, setAskBattle] = useState(false);
  const dateQ = useQuery({ queryKey: ["date", station, month, day], queryFn: () => getDateWeather(station, month, day), enabled: askDate });
  const battleQ = useQuery({ queryKey: ["battle", station], queryFn: () => getBattle(station), enabled: askBattle });
  const cards = stories.data?.stories || [];

  return (
    <CardCarousel label="이야기">
      {stories.isLoading ? <LoadingSkeleton label="이야기를 고르는 중" /> : null}
      {stories.isError ? <ErrorState message={(stories.error as Error).message} onRetry={() => void stories.refetch()} /> : null}
      {!stories.isLoading && !stories.isError && !cards.length ? <EmptyState title="오늘 고른 이야기가 없습니다" text={stories.data?.emptyText || stories.data?.staleNote || "조건에 맞는 이야기가 없습니다."} /> : null}
      {cards.map((s, i) => (
        <article className="card" key={`${s.ruleId || s.title}-${i}`}>
          <p className="text-xs text-[var(--muted)]">{s.kind || "이야기"} · {stories.data?.basisName}</p>
          <h3 className="mt-4 text-2xl font-bold leading-snug">{s.title}</h3>
          <p className="mt-3 text-[15px] leading-relaxed">{s.text}</p>
          <DataSourceLabel>{s.basis || "서버가 고른 이야기"}</DataSourceLabel>
        </article>
      ))}

      <article className="card">
        <p className="text-sm font-semibold">날짜로 보는 날씨</p>
        <p className="mt-2 text-sm text-[var(--muted)]">해마다 같은 달·날, 최근 10년</p>
        <div className="mt-4 flex gap-2">
          <label className="text-sm">월 <input className="ml-1 w-16 rounded-xl border border-[var(--line)] px-2 py-2" inputMode="numeric" value={month} onChange={(e) => setMonth(Number(e.target.value) || 1)} /></label>
          <label className="text-sm">일 <input className="ml-1 w-16 rounded-xl border border-[var(--line)] px-2 py-2" inputMode="numeric" value={day} onChange={(e) => setDay(Number(e.target.value) || 1)} /></label>
        </div>
        <button type="button" className="icon-btn mt-4 bg-[var(--coral-soft)] px-4 text-sm font-semibold" onClick={() => setAskDate(true)}>이 날짜 보기</button>
        {dateQ.isLoading ? <p className="mt-3 text-sm">계산 중</p> : null}
        {dateQ.isError ? <p className="mt-3 text-sm">{(dateQ.error as Error).message}</p> : null}
        {(dateQ.data?.stories || []).slice(0, 3).map((s) => <p key={s.id || s.text} className="mt-3 text-sm leading-relaxed">{s.text}</p>)}
        <DataSourceLabel>{dateQ.data?.window?.label || "공식 일자료. 이야기가 없으면 그 날짜의 통계 문장이 없는 것입니다."}</DataSourceLabel>
      </article>

      <article className="card">
        <p className="text-sm font-semibold">날씨 배틀</p>
        <p className="mt-2 text-[15px] leading-relaxed">어린이날(5월 5일)과 개천절(10월 3일), 최근 10년. 이 지점의 공식 일자료입니다.</p>
        <button type="button" className="icon-btn mt-4 bg-[var(--coral-soft)] px-4 text-sm font-semibold" onClick={() => setAskBattle(true)}>비교 보기</button>
        {battleQ.isLoading ? <p className="mt-3 text-sm">계산 중</p> : null}
        {battleQ.isError ? <p className="mt-3 text-sm">{(battleQ.error as Error).message}</p> : null}
        {(battleQ.data?.tallies || []).slice(0, 3).map((t) => (
          <p key={t.word} className="mt-3 text-sm leading-relaxed">{t.word}{t.def ? ` (${t.def})` : ""} — {(t.results || []).map((r) => `${r.case} ${r.k}번`).join(" · ")}</p>
        ))}
        <DataSourceLabel>{battleQ.data?.window?.label || "서로 자료가 있는 해만 셉니다."}</DataSourceLabel>
      </article>
    </CardCarousel>
  );
}
