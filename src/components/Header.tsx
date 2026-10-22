import { Settings } from "lucide-react";

export function Header({ region, onRegion, onSettings }: { region: string; onRegion: () => void; onSettings: () => void }) {
  return (
    <header className="topbar flex items-center gap-2 px-3 pt-[max(8px,env(safe-area-inset-top))]">
      <img src="/brand/inal-logo.svg" alt="" width={36} height={26} className="h-7 w-auto" />
      <div className="min-w-0 leading-tight">
        <p className="text-[15px] font-bold">이날</p>
        <p className="truncate text-[11px] text-[var(--muted)]">이야기가 있는 날씨</p>
      </div>
      <button type="button" className="icon-btn ml-auto max-w-[46%] truncate bg-white/70 px-3 text-sm font-semibold" onClick={onRegion}>
        {region}
      </button>
      <button type="button" className="icon-btn" aria-label="설정" onClick={onSettings}>
        <Settings size={20} />
      </button>
    </header>
  );
}
