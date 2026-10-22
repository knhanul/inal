import { useMemo, useState } from "react";
import type { Station } from "../api/types";
import { DetailBottomSheet } from "./DetailBottomSheet";

export function RegionSelector({ stations, current, onClose, onPick }: { stations: Station[]; current: string; onClose: () => void; onPick: (id: string) => void }) {
  const [q, setQ] = useState("");
  const list = useMemo(() => {
    const s = q.trim();
    return stations.filter((x) => !s || x.station_name.includes(s) || x.station_id.includes(s) || (x.region || "").includes(s));
  }, [q, stations]);
  return (
    <DetailBottomSheet title="지역" onClose={onClose}>
      <input className="mb-3 w-full rounded-2xl border border-[var(--line)] bg-[#f6f1ea] px-3 py-3 text-base" placeholder="이름 또는 지점번호" value={q} onChange={(e) => setQ(e.target.value)} aria-label="지역 검색" />
      <ul className="space-y-1">
        {list.map((s) => (
          <li key={s.station_id}>
            <button type="button" className="flex min-h-11 w-full items-center justify-between rounded-2xl px-3 py-2 text-left" style={{ background: s.station_id === current ? "var(--coral-soft)" : "transparent" }} onClick={() => onPick(s.station_id)}>
              <span className="font-semibold">{s.station_name}</span>
              <span className="text-xs text-[var(--muted)]">{s.region || s.station_id}</span>
            </button>
          </li>
        ))}
      </ul>
      {!list.length ? <p className="py-6 text-sm text-[var(--muted)]">해당하는 지점이 없습니다.</p> : null}
    </DetailBottomSheet>
  );
}
