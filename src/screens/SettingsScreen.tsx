import type { BasisId } from "../api/types";

const BASIS: { id: BasisId; label: string }[] = [
  { id: "all", label: "1990년 이후" },
  { id: "r10", label: "최근 10년" },
  { id: "r5", label: "최근 5년" },
];

export function SettingsScreen({ basis, stationName, onBasis, onClose }: { basis: BasisId; stationName: string; onBasis: (id: BasisId) => void; onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-[var(--bg)]">
      <header className="flex items-center px-2 pt-[max(8px,env(safe-area-inset-top))]">
        <button type="button" className="icon-btn text-sm font-semibold" onClick={onClose}>닫기</button>
        <h1 className="ml-1 text-lg font-bold">설정</h1>
      </header>
      <div className="flex-1 overflow-auto px-4 pb-8">
        <section className="card mt-2 h-auto">
          <p className="text-sm font-semibold">기본 지역</p>
          <p className="mt-2 text-[15px]">{stationName}</p>
          <p className="mt-1 text-xs text-[var(--muted)]">위 막대의 지역 이름으로 바꿉니다. 이 기기에만 기억합니다.</p>
        </section>
        <section className="mt-3 rounded-[26px] bg-[var(--card)] p-5 shadow-[var(--shadow)]">
          <p className="text-sm font-semibold">비교 기간</p>
          <div className="mt-3 grid gap-2">
            {BASIS.map((b) => (
              <button key={b.id} type="button" className="min-h-11 rounded-2xl px-3 text-left text-sm font-semibold" style={{ background: basis === b.id ? "var(--coral-soft)" : "#f6f1ea" }} onClick={() => onBasis(b.id)}>{b.label}</button>
            ))}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">평균을 여기서 다시 계산하지 않습니다. 서버가 이미 나눠 둔 세 기준 중 무엇을 먼저 보여줄지만 고릅니다.</p>
        </section>
        <section className="mt-3 rounded-[26px] bg-[var(--card)] p-5">
          <p className="text-sm font-semibold">앱</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">이날은 휴대폰에서 카드를 넘기며 보는 날씨입니다. 수집과 통계는 weather.nuni.co.kr 이 합니다.</p>
          <a className="mt-3 inline-flex min-h-11 items-center font-semibold text-[var(--coral)]" href="https://weather.nuni.co.kr">PC 상세 서비스로</a>
        </section>
      </div>
    </div>
  );
}
