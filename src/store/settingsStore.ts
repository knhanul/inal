import { useState, useEffect, useCallback } from 'react';
import type { BasisId } from '../types/api';
import { ASOS_STATIONS } from '../api/endpoints';

export type FontScaleMode = 'normal' | 'large';

export interface UserSettingsState {
  stationId: string;
  defaultStationId: string;
  recentStationIds: string[];
  basis: BasisId;
  fontScale: FontScaleMode;
  updatedAt: string;
}

export interface SettingsSyncAdapter {
  pullSettings: () => Promise<Partial<UserSettingsState> | null>;
  pushSettings: (state: UserSettingsState) => Promise<void>;
}

const STORAGE_KEY = 'inal:user-settings:v1';

const DEFAULT_SETTINGS: UserSettingsState = {
  stationId: '108',
  defaultStationId: '108',
  recentStationIds: ['108', '159', '184'],
  basis: 'all',
  fontScale: 'normal',
  updatedAt: new Date().toISOString(),
};

function isValidStationId(id: string | null | undefined): id is string {
  if (!id) return false;
  return ASOS_STATIONS.some((s) => s.id === id);
}

function isValidBasis(basis: string | null | undefined): basis is BasisId {
  return basis === 'all' || basis === 'r10' || basis === 'r5';
}

export function loadUserSettings(): UserSettingsState {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const urlStn = urlParams.get('stn') || urlParams.get('station');
    const urlBasis = urlParams.get('basis');
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: Partial<UserSettingsState> = raw ? JSON.parse(raw) : {};

    const stationId = isValidStationId(urlStn)
      ? urlStn
      : isValidStationId(parsed.stationId)
      ? parsed.stationId
      : isValidStationId(parsed.defaultStationId)
      ? parsed.defaultStationId
      : DEFAULT_SETTINGS.stationId;

    const defaultStationId = isValidStationId(parsed.defaultStationId)
      ? parsed.defaultStationId
      : DEFAULT_SETTINGS.defaultStationId;

    const basis = isValidBasis(urlBasis)
      ? urlBasis
      : isValidBasis(parsed.basis)
      ? parsed.basis
      : DEFAULT_SETTINGS.basis;

    const fontScale: FontScaleMode = parsed.fontScale === 'large' ? 'large' : 'normal';
    const recentRaw = Array.isArray(parsed.recentStationIds)
      ? parsed.recentStationIds.filter(isValidStationId)
      : DEFAULT_SETTINGS.recentStationIds;

    return {
      stationId,
      defaultStationId,
      recentStationIds: [stationId, ...recentRaw.filter((id) => id !== stationId)].slice(0, 5),
      basis,
      fontScale,
      updatedAt: parsed.updatedAt || DEFAULT_SETTINGS.updatedAt,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

let currentSettings: UserSettingsState = loadUserSettings();
const listeners = new Set<(state: UserSettingsState) => void>();
let remoteSyncAdapter: SettingsSyncAdapter | null = null;

export function registerSettingsSyncAdapter(adapter: SettingsSyncAdapter) {
  remoteSyncAdapter = adapter;
}

function persistAndNotify(next: UserSettingsState) {
  currentSettings = next;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }
  listeners.forEach((listener) => listener(next));
  if (remoteSyncAdapter) {
    remoteSyncAdapter.pushSettings(next).catch(() => {});
  }
}

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettingsState>(() => currentSettings);

  useEffect(() => {
    const handler = (next: UserSettingsState) => setSettings(next);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  const selectStation = useCallback((stationId: string) => {
    if (!isValidStationId(stationId)) return;
    persistAndNotify({
      ...currentSettings,
      stationId,
      recentStationIds: [stationId, ...currentSettings.recentStationIds.filter((id) => id !== stationId)].slice(0, 5),
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const setDefaultStation = useCallback((defaultStationId: string) => {
    if (!isValidStationId(defaultStationId)) return;
    persistAndNotify({
      ...currentSettings,
      defaultStationId,
      stationId: defaultStationId,
      recentStationIds: [defaultStationId, ...currentSettings.recentStationIds.filter((id) => id !== defaultStationId)].slice(0, 5),
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const setBasis = useCallback((basis: BasisId) => {
    if (!isValidBasis(basis)) return;
    persistAndNotify({ ...currentSettings, basis, updatedAt: new Date().toISOString() });
  }, []);

  const setFontScale = useCallback((fontScale: FontScaleMode) => {
    persistAndNotify({ ...currentSettings, fontScale, updatedAt: new Date().toISOString() });
  }, []);

  const resetSettings = useCallback(() => {
    persistAndNotify({ ...DEFAULT_SETTINGS, updatedAt: new Date().toISOString() });
  }, []);

  return { settings, selectStation, setDefaultStation, setBasis, setFontScale, resetSettings };
}
