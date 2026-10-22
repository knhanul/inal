import React from 'react';
import { MapPin, Settings, ChevronDown } from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';
import { getStationById, BASIS_OPTIONS } from '../../api/endpoints';
import type { BasisId } from '../../types/api';

interface HeaderProps {
  stationId: string;
  basis: BasisId;
  isDevFallbackActive?: boolean;
  onOpenRegionSelector: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  stationId,
  basis,
  isDevFallbackActive = false,
  onOpenRegionSelector,
  onOpenSettings,
}) => {
  const station = getStationById(stationId);
  const basisLabel = BASIS_OPTIONS.find((b) => b.id === basis)?.label || '1990년 이후';

  return (
    <header
      className="sticky top-0 z-30 border-b border-inal-border/80 bg-inal-bg/95 backdrop-blur-md"
      style={{ paddingTop: 'var(--safe-top)' }}
    >
      {isDevFallbackActive && (
        <div className="bg-amber-100 px-3 py-1 text-center text-[11px] font-semibold text-amber-900">
          [개발 전용 오프라인 미리보기 모드] 실서버 연결 시 실시간 관측값으로 표시됩니다.
        </div>
      )}
      <div className="flex h-14 items-center justify-between px-4">
        <BrandLogo />
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenRegionSelector}
            aria-label={`현재 선택 지역 ${station.name}, 지역 변경하기`}
            className="touch-target inline-flex items-center gap-1.5 rounded-full border border-inal-border bg-inal-surface px-3.5 py-1.5 text-xs font-bold text-inal-text shadow-sm transition active:scale-95"
          >
            <MapPin className="h-3.5 w-3.5 text-inal-accent" />
            <span>{station.name}</span>
            <span className="hidden min-[360px]:inline text-[10px] font-normal text-inal-textSoft">
              · {basisLabel}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-inal-textMuted" />
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="사용자 설정 열기"
            className="touch-target inline-flex items-center justify-center rounded-full border border-inal-border bg-inal-surface text-inal-textMuted transition hover:text-inal-text active:scale-95"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
