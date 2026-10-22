import { BookOpenText, CalendarRange, CloudSun, SunMedium } from "lucide-react";

const TABS = [
  { id: "today", label: "오늘", icon: SunMedium },
  { id: "forecast", label: "예보", icon: CloudSun },
  { id: "compare", label: "비교", icon: CalendarRange },
  { id: "stories", label: "이야기", icon: BookOpenText },
] as const;

export type TabId = (typeof TABS)[number]["id"];

export function BottomNavigation({ tab, onChange }: { tab: TabId; onChange: (id: TabId) => void }) {
  return (
    <nav className="tabbar grid grid-cols-4 border-t border-[var(--line)] bg-[#fffdf9] pb-[env(safe-area-inset-bottom)]" aria-label="주요 메뉴">
      {TABS.map((t) => {
        const on = tab === t.id;
        const Icon = t.icon;
        return (
          <button key={t.id} type="button" className="nav-btn flex-col gap-0.5 text-[11px]" aria-current={on ? "page" : undefined} onClick={() => onChange(t.id)} style={{ color: on ? "var(--coral)" : "var(--muted)", fontWeight: on ? 750 : 500 }}>
            <Icon size={20} />
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
