import type { ReactNode } from "react";

export function LoadingSkeleton({ label = "불러오는 중" }: { label?: string }) {
  return (
    <div className="card" role="status" aria-live="polite">
      <div className="skel h-4 w-24" />
      <div className="skel mt-6 h-16 w-40" />
      <div className="skel mt-4 h-4 w-full" />
      <div className="skel mt-2 h-4 w-4/5" />
      <p className="mt-auto text-sm text-[var(--muted)]">{label}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card" role="alert">
      <p className="text-sm font-semibold text-[var(--coral)]">이 카드를 열지 못했습니다</p>
      <p className="mt-3 text-[15px] leading-relaxed">{message}</p>
      {onRetry ? (
        <button type="button" className="icon-btn mt-auto self-start bg-[var(--coral-soft)] px-4 font-semibold" onClick={onRetry}>
          다시 시도
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="card">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-3 text-[15px] leading-relaxed text-[var(--muted)]">{text}</p>
    </div>
  );
}

export function DataSourceLabel({ children }: { children: ReactNode }) {
  return <p className="mt-auto pt-4 text-xs leading-relaxed text-[var(--muted)]">{children}</p>;
}
