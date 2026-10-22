import type { ReactNode } from "react";

export function DetailBottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="absolute inset-0 z-20">
      <button type="button" className="sheet-back" aria-label="상세 닫기" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#e4dbd1]" />
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" className="icon-btn bg-[#f6f1ea] px-3 text-sm font-semibold" onClick={onClose}>닫기</button>
        </div>
        {children}
      </div>
    </div>
  );
}
