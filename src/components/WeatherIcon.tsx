import { Cloud, CloudRain, CloudSnow, CloudSun, Sun } from "lucide-react";

export function weatherTone(pty?: string | null, sky?: string | null) {
  const p = pty || "";
  const s = sky || "";
  if (/눈/.test(p)) return { wash: "var(--snow)", label: p };
  if (/비|빗/.test(p) && p !== "없음") return { wash: "var(--rain)", label: p };
  if (/맑/.test(s) || p === "없음") return { wash: "var(--sun)", label: s || p || "관측" };
  if (/구름/.test(s)) return { wash: "var(--sky)", label: s };
  if (/흐/.test(s)) return { wash: "var(--cloud)", label: s };
  return { wash: "var(--card)", label: p || s || "" };
}

export function WeatherIcon({ pty, sky, size = 28 }: { pty?: string | null; sky?: string | null; size?: number }) {
  const p = `${pty || ""} ${sky || ""}`;
  const props = { size, strokeWidth: 1.7, "aria-hidden": true as const };
  if (/눈/.test(p)) return <CloudSnow {...props} />;
  if (/비|빗/.test(p) && !/없음/.test(pty || "")) return <CloudRain {...props} />;
  if (/맑/.test(p)) return <Sun {...props} />;
  if (/구름/.test(p)) return <CloudSun {...props} />;
  if (/흐/.test(p)) return <Cloud {...props} />;
  return <CloudSun {...props} />;
}
