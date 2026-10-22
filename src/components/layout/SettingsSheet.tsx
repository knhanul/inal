import React from 'react';
import { X, ExternalLink, RotateCcw } from 'lucide-react';
import { ASOS_STATIONS, BASIS_OPTIONS } from '../../api/endpoints';
import type { BasisId } from '../../types/api';
import type { FontScaleMode, UserSettingsState } from '../../store/settingsStore';

interface SettingsSheetProps {
  isOpen: boolean;
  settings: UserSettingsState;
  onChangeDefaultStation: (stationId: string) => void;
  onChangeBasis: (basis: BasisId) => void;
  onChangeFontScale: (scale: FontScaleMode) => void;
  onReset: () => void;
  onClose: () => void;
}

export const SettingsSheet: React.FC<SettingsSheetProps> = ({
  isOpen,
  settings,
  onChangeDefaultStation,
  onChangeBasis,
  onChangeFontScale,
  onReset,
  onClose,
}) => {
  if (!isOpen) return null;
  const pcWebUrl = import.meta.env.VITE_PC_WEB_URL || 'https://weather.nuni.co.kr';

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 backdrop-blur-[1px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-sheet-title"
    >
      <div
        className="flex max-h-[86dvh] w-full max-w-[430px] flex-col rounded-t-3xl bg-inal-surface shadow-sheet"
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 1rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-inal-border px-5 pt-4 pb-3">
          <h2 id="settings-sheet-title" className="text-base font-bold text-inal-text">
            날씨 보기 설정 및 서비스 정보
          </h2>
          <button type="button" onClick={onClose} aria-label="설정 닫기" className="touch-target -mr-2 inline-flex items-center justify-center rounded-full text-inal-textMuted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 space-y-5">
          <div>
            <label className="block text-xs font-bold text-inal-text">과거 비교 기간 기본값</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {BASIS_OPTIONS.map((opt) => {
                const active = settings.basis === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeBasis(opt.id)}
                    className={`rounded-xl border p-2.5 text-left transition ${
                      active ? 'border-inal-accent bg-inal-accentSoft/70 font-bold text-inal-text' : 'border-inal-border bg-inal-surface text-inal-textMuted'
                    }`}
                  >
                    <span className="block text-xs">{opt.label}</span>
                    <span className="mt-0.5 block text-[10px] text-inal-textSoft">{opt.subLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-inal-text">기본 시작 지역</label>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {ASOS_STATIONS.map((st) => {
                const active = settings.defaultStationId === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => onChangeDefaultStation(st.id)}
                    className={`touch-target rounded-xl border text-xs font-semibold transition ${
                      active ? 'border-inal-accent bg-inal-accent text-white' : 'border-inal-border bg-inal-surface text-inal-text'
                    }`}
                  >
                    {st.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-inal-text">글자 크기</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChangeFontScale('normal')}
                className={`touch-target rounded-xl border text-xs font-semibold ${
                  settings.fontScale === 'normal' ? 'border-inal-accent bg-inal-accentSoft/70 text-inal-text' : 'border-inal-border bg-inal-surface text-inal-textMuted'
                }`}
              >
                기본 크기
              </button>
              <button
                type="button"
                onClick={() => onChangeFontScale('large')}
                className={`touch-target rounded-xl border text-xs font-semibold ${
                  settings.fontScale === 'large' ? 'border-inal-accent bg-inal-accentSoft/70 text-inal-text' : 'border-inal-border bg-inal-surface text-inal-textMuted'
                }`}
              >
                크게 보기 (가독성 확대)
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-inal-border bg-inal-surfaceSubtle/60 p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-inal-text">이날(Inal) — 이야기가 있는 날씨</span>
              <span className="text-[11px] font-medium text-inal-textSoft">모바일 웹 v0.1.0</span>
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <a
                href={pcWebUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="touch-target inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-inal-text px-3 py-2.5 text-xs font-semibold text-white transition active:scale-95"
              >
                <span>PC 상세 서비스 (원자료·CSV) 이동</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <button
                type="button"
                onClick={onReset}
                className="touch-target inline-flex items-center gap-1 rounded-xl border border-inal-border bg-inal-surface px-3 py-2.5 text-xs font-medium text-inal-textMuted"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>초기화</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
