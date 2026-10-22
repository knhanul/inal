import React, { useState } from 'react';
import { X, Search, MapPin, Navigation, Check } from 'lucide-react';
import { ASOS_STATIONS, getStationById } from '../../api/endpoints';
import { useRtRegionsQuery } from '../../hooks/useWeatherQueries';
import { formatTemp } from '../../api/mappers';

interface RegionSelectorProps {
  isOpen: boolean;
  currentStationId: string;
  recentStationIds: string[];
  onSelectStation: (stationId: string) => void;
  onClose: () => void;
}

function calcDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;
}

export const RegionSelector: React.FC<RegionSelectorProps> = ({
  isOpen,
  currentStationId,
  recentStationIds,
  onSelectStation,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const regionsQuery = useRtRegionsQuery(isOpen);

  if (!isOpen) return null;

  const liveMap = new Map((regionsQuery.data?.data.rows || []).map((row) => [String(row.id), row]));
  const filteredStations = ASOS_STATIONS.filter((st) => {
    const q = searchQuery.trim();
    if (!q) return true;
    return st.name.includes(q) || st.regionGroup.includes(q) || st.id.includes(q);
  });

  const handleFindNearestGps = () => {
    if (!('geolocation' in navigator)) {
      setGpsStatus('이 브라우저에서는 위치 조회 기능을 지원하지 않습니다.');
      return;
    }
    setGpsStatus('현재 위치와 가장 가까운 기상청 관측지점을 찾는 중…');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        let nearest = ASOS_STATIONS[0];
        let minKm = Infinity;
        for (const st of ASOS_STATIONS) {
          const d = calcDistanceKm(latitude, longitude, st.lat, st.lon);
          if (d < minKm) {
            minKm = d;
            nearest = st;
          }
        }
        setGpsStatus(
          `현재 위치에서 가장 가까운 '${nearest.name}(${nearest.id})' 관측소(약 ${minKm}km 거리)로 설정했습니다.`
        );
        onSelectStation(nearest.id);
      },
      () => {
        setGpsStatus('위치 권한이 거부되었거나 위치를 확인할 수 없습니다. 목록에서 직접 선택해 주세요.');
      },
      { timeout: 6000 }
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-[1px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="region-selector-title"
    >
      <div
        className="flex max-h-[85dvh] w-full max-w-[430px] flex-col rounded-t-3xl bg-inal-surface shadow-sheet"
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 1rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-inal-border px-5 pt-4 pb-3">
          <div>
            <h2 id="region-selector-title" className="text-base font-bold text-inal-text">
              관측지점(지역) 선택
            </h2>
            <p className="text-[11px] text-inal-textMuted">
              기상청 ASOS 장기 관측(1990년~)이 검증된 공식 지점 목록입니다.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="지역 선택 닫기" className="touch-target -mr-2 inline-flex items-center justify-center rounded-full text-inal-textMuted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-inal-textSoft" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="지역명 또는 지점번호 검색 (예: 서울, 부산)"
                className="h-11 w-full rounded-xl border border-inal-border bg-inal-surfaceSubtle/60 pl-9 pr-3 text-xs text-inal-text placeholder:text-inal-textSoft focus:border-inal-accent focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleFindNearestGps}
              className="touch-target inline-flex shrink-0 items-center gap-1 rounded-xl border border-inal-border bg-inal-surface px-3 text-xs font-semibold text-inal-text transition active:scale-95"
            >
              <Navigation className="h-3.5 w-3.5 text-inal-accent" />
              <span>가까운 지점</span>
            </button>
          </div>

          {gpsStatus && (
            <p className="rounded-xl bg-inal-accentSoft px-3 py-2 text-[11px] leading-relaxed text-inal-text">
              {gpsStatus}
            </p>
          )}

          {recentStationIds.length > 0 && !searchQuery && (
            <div>
              <span className="text-[11px] font-semibold text-inal-textMuted">최근 선택 지역</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {recentStationIds.map((id) => {
                  const st = getStationById(id);
                  const active = id === currentStationId;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        onSelectStation(id);
                        onClose();
                      }}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        active ? 'bg-inal-accent text-white' : 'bg-inal-surfaceSubtle text-inal-text hover:bg-inal-border'
                      }`}
                    >
                      {st.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <span className="text-[11px] font-semibold text-inal-textMuted">
              공식 관측지점 ({filteredStations.length}곳)
            </span>
            <div className="grid grid-cols-2 gap-2">
              {filteredStations.map((st) => {
                const isSelected = st.id === currentStationId;
                const live = liveMap.get(st.id);
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      onSelectStation(st.id);
                      onClose();
                    }}
                    className={`flex items-center justify-between rounded-2xl border p-3 text-left transition ${
                      isSelected ? 'border-inal-accent bg-inal-accentSoft/60' : 'border-inal-border bg-inal-surface hover:bg-inal-surfaceSubtle/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1">
                        <MapPin className={`h-3.5 w-3.5 ${isSelected ? 'text-inal-accent' : 'text-inal-textSoft'}`} />
                        <span className="text-sm font-bold text-inal-text">{st.name}</span>
                        <span className="text-[10px] text-inal-textSoft">({st.id})</span>
                      </div>
                      <span className="mt-0.5 block text-[11px] text-inal-textMuted">
                        {st.regionGroup} · 격자({st.gridNx},{st.gridNy})
                      </span>
                    </div>
                    <div className="text-right">
                      {live && live.ta !== null ? (
                        <span className="block text-sm font-bold tabular-nums text-inal-text">
                          {formatTemp(live.ta)}
                        </span>
                      ) : isSelected ? (
                        <Check className="h-4 w-4 text-inal-accent" />
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
