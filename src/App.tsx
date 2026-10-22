import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { getStations } from "./api/weather";
import type { BasisId } from "./api/types";
import { BottomNavigation, type TabId } from "./components/BottomNavigation";
import { DetailBottomSheet } from "./components/DetailBottomSheet";
import { Header } from "./components/Header";
import { RegionSelector } from "./components/RegionSelector";
import { loadPrefs, savePrefs } from "./device/prefs";
import { CompareScreen } from "./screens/CompareScreen";
import { ForecastScreen } from "./screens/ForecastScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { StoryScreen } from "./screens/StoryScreen";
import { TodayScreen } from "./screens/TodayScreen";

function tabFromHash(): TabId | "settings" {
  const h = location.hash.replace("#/", "");
  if (h === "forecast" || h === "compare" || h === "stories" || h === "settings") return h;
  return "today";
}

export function App() {
  const prefs0 = loadPrefs();
  const [stationId, setStationId] = useState(prefs0.stationId);
  const [basis, setBasis] = useState<BasisId>(prefs0.basis);
  const [tab, setTab] = useState<TabId | "settings">(tabFromHash);
  const [regionOpen, setRegionOpen] = useState(false);
  const [detail, setDetail] = useState<{ title: string; body: string } | null>(null);
  const stationsQ = useQuery({ queryKey: ["stations"], queryFn: getStations, staleTime: 300_000 });
  const stations = useMemo(() => (stationsQ.data?.data || []).filter((s) => s.enabled !== false), [stationsQ.data]);
  const station = stations.find((s) => s.station_id === stationId) || stations[0];

  useEffect(() => { savePrefs({ stationId, basis }); }, [stationId, basis]);
  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  function go(next: TabId) {
    location.hash = `#/${next}`;
    setTab(next);
    setDetail(null);
  }

  const name = station?.station_name || (stationsQ.isLoading ? "지역" : stationId);

  return (
    <div className="phone">
      <Header region={name} onRegion={() => setRegionOpen(true)} onSettings={() => { location.hash = "#/settings"; setTab("settings"); }} />
      <main className="stage">
        {tab === "today" ? <TodayScreen station={stationId} basis={basis} onOpen={(title, body) => setDetail({ title, body })} /> : null}
        {tab === "forecast" ? <ForecastScreen station={stationId} basis={basis} /> : null}
        {tab === "compare" ? <CompareScreen station={stationId} basis={basis} /> : null}
        {tab === "stories" ? <StoryScreen station={stationId} basis={basis} /> : null}
      </main>
      <BottomNavigation tab={tab === "settings" ? "today" : tab} onChange={go} />
      {regionOpen ? (
        <RegionSelector stations={stations} current={stationId} onClose={() => setRegionOpen(false)} onPick={(id) => { setStationId(id); setRegionOpen(false); }} />
      ) : null}
      {detail ? (
        <DetailBottomSheet title={detail.title} onClose={() => setDetail(null)}>
          {detail.body.split("\n").map((line, i) => <p key={i} className="mb-2 text-sm leading-relaxed">{line}</p>)}
        </DetailBottomSheet>
      ) : null}
      {tab === "settings" ? <SettingsScreen basis={basis} stationName={name} onBasis={setBasis} onClose={() => go("today")} /> : null}
    </div>
  );
}
