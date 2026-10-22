import type { BasisId } from "../api/types";

const KEY = "inal.prefs";

export type Prefs = { stationId: string; basis: BasisId };

const DEFAULTS: Prefs = { stationId: "108", basis: "all" };

export function loadPrefs(): Prefs {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null") as Partial<Prefs> | null;
    const basis = raw?.basis === "r10" || raw?.basis === "r5" || raw?.basis === "all" ? raw.basis : DEFAULTS.basis;
    const stationId = raw?.stationId && /^\d+$/.test(raw.stationId) ? raw.stationId : DEFAULTS.stationId;
    return { stationId, basis };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePrefs(next: Prefs) {
  localStorage.setItem(KEY, JSON.stringify(next));
}
