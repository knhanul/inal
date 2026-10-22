export const num = (v: number | null | undefined, digits = 1) => (typeof v === "number" && Number.isFinite(v) ? String(Math.round(v * 10 ** digits) / 10 ** digits) : null);

export function signed(v: number | null | undefined) {
  const s = num(v, 1);
  if (s == null) return null;
  return Number(s) > 0 ? `+${s}` : s;
}

export function hm(time?: string | null) {
  if (!time || time.length < 16) return "";
  return time.slice(11, 16);
}

export function md(date?: string | null) {
  if (!date || date.length < 10) return "";
  return `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
}

export function weekday(date: string) {
  const d = new Date(`${date}T00:00:00+09:00`);
  if (Number.isNaN(d.getTime())) return "";
  return "일월화수목금토"[d.getUTCDay()] ?? "";
}

export function diffLine(label: string, mean: number | null | undefined, diff: number | null | undefined, unit = "℃") {
  if (mean == null || diff == null) return `${label}: 비교할 자료가 없습니다`;
  if (Math.abs(diff) < 0.05) return `${label} ${num(mean)}${unit}와 비슷합니다`;
  return `${label} ${num(mean)}${unit}보다 ${num(Math.abs(diff))}${unit} ${diff > 0 ? "높습니다" : "낮습니다"}`;
}
