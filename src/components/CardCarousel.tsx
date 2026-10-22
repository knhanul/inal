import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export function CardPagination({ index, count }: { index: number; count: number }) {
  return (
    <div className="flex justify-center gap-1.5 py-2" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="h-1.5 rounded-full" style={{ width: i === index ? 16 : 6, background: i === index ? "var(--coral)" : "#d9cfc3" }} />
      ))}
    </div>
  );
}

export function CardCarousel({ label, children }: { label: string; children: ReactNode[] }) {
  const slides = children.filter(Boolean);
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState(0);
  const start = useRef<number | null>(null);
  const count = slides.length;
  const safe = count ? Math.min(index, count - 1) : 0;

  useEffect(() => { if (index !== safe) setIndex(safe); }, [index, safe]);

  function go(next: number) {
    if (!count) return;
    setIndex(Math.max(0, Math.min(count - 1, next)));
    setDrag(0);
  }

  return (
    <div className="carousel">
      <div className="mb-1 flex items-center justify-between">
        <button type="button" className="icon-btn" aria-label="이전 카드" disabled={safe === 0} onClick={() => go(safe - 1)}>
          <ChevronLeft size={22} />
        </button>
        <p className="text-xs text-[var(--muted)]">{label} {count ? `${safe + 1} / ${count}` : ""}</p>
        <button type="button" className="icon-btn" aria-label="다음 카드" disabled={safe >= count - 1} onClick={() => go(safe + 1)}>
          <ChevronRight size={22} />
        </button>
      </div>
      <div
        className="viewport"
        onPointerDown={(e) => { start.current = e.clientX; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => { if (start.current != null) setDrag(e.clientX - start.current); }}
        onPointerUp={() => {
          if (drag > 48) go(safe - 1);
          else if (drag < -48) go(safe + 1);
          else setDrag(0);
          start.current = null;
        }}
        onPointerCancel={() => { start.current = null; setDrag(0); }}
      >
        <div className="slide-track" style={{ transform: `translateX(calc(${-safe * 100}% + ${drag}px))` }}>
          {slides.map((node, i) => (
            <div className="slide" key={i} aria-hidden={i !== safe}>{node}</div>
          ))}
        </div>
      </div>
      <CardPagination index={safe} count={count} />
    </div>
  );
}
