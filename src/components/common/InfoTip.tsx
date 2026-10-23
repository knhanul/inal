import React, { useEffect, useId, useRef, useState } from 'react';

const openSet = new Set<() => void>();

function safeText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(safeText).filter(Boolean).join(' · ');
  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    if (Array.isArray(o.sourceRefs)) return safeText(o.sourceRefs);
    if (typeof o.basis === 'string') return o.basis;
    if (typeof o.source === 'string') return o.source;
    if (typeof o.label === 'string') return o.label;
    if (typeof o.base === 'string') return o.base;
    if (typeof o.note === 'string') return o.note;
    return '';
  }
  return '';
}

/** API 경로·장황한 출처 표기를 화면용 짧은 꼬리표로 다듬음 */
export function cleanSourceLabel(raw: unknown): string {
  let t = safeText(raw);
  if (!t) return '';
  t = t.replace(/\s*\/api\/[^\s)·]+/g, '');
  t = t.replace(/\s{2,}/g, ' ').replace(/\s+·\s+$/g, '').trim();
  return t;
}

export function formatProvenanceDetail(parts: {
  sourceName?: unknown;
  referenceTime?: unknown;
  note?: unknown;
  extra?: unknown;
}): string {
  const lines: string[] = [];
  const source = cleanSourceLabel(parts.sourceName);
  const ref = safeText(parts.referenceTime);
  const note = safeText(parts.note);
  const extra = safeText(parts.extra);
  if (source) lines.push(`출처: ${source}`);
  if (ref) lines.push(`기준·시각: ${ref}`);
  if (note) lines.push(note);
  if (extra) lines.push(extra);
  return lines.join('\n');
}

function cutTag(text: string, max = 48): string {
  for (const sep of [' — ', '. ', '다. ', '; ', ' · ']) {
    const i = text.indexOf(sep);
    if (i > 0 && i <= Math.max(max, 64)) {
      return text.slice(0, i + (sep === '다. ' ? 1 : 0)).trim();
    }
  }
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}

interface InfoTipProps {
  detail?: unknown;
  tag?: unknown;
  label?: string;
  className?: string;
  tagClassName?: string;
}

/** weather-hub info-tip 과 같은 역할: 짧은 꼬리표 + ⓘ, 누르면 바로 아래 설명 */
export const InfoTip: React.FC<InfoTipProps> = ({
  detail,
  tag,
  label = '산출 기준',
  className = '',
  tagClassName = '',
}) => {
  const detailText = safeText(detail);
  const tagText = safeText(tag);
  const popId = useId().replace(/:/g, '');
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<() => void>(() => undefined);

  closeRef.current = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const closer = () => closeRef.current();
    for (const other of [...openSet]) {
      if (other !== closer) other();
    }
    openSet.add(closer);

    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (!t) return;
      if (btnRef.current?.contains(t)) return;
      const pop = document.getElementById(popId);
      if (pop?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener('click', onDoc, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      openSet.delete(closer);
      document.removeEventListener('click', onDoc, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [open, popId]);

  if (!detailText && !tagText) return null;

  if (!detailText) {
    return (
      <span className={`it-inline ${className}`.trim()}>
        <span className={`it-tag ${tagClassName}`.trim()}>{tagText}</span>
      </span>
    );
  }

  return (
    <span className={`it-inline ${className}`.trim()}>
      {tagText ? <span className={`it-tag ${tagClassName}`.trim()}>{tagText}</span> : null}
      <button
        ref={btnRef}
        type="button"
        className="it-btn"
        aria-expanded={open}
        aria-controls={popId}
        aria-label={`${label} 자세히 보기`}
        title={label}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <span aria-hidden="true">ⓘ</span>
      </button>
      <span className="it-pop" id={popId} role="note" hidden={!open} style={{ whiteSpace: 'pre-wrap' }}>
        {detailText}
      </span>
    </span>
  );
};

interface InfoTipAutoProps {
  text: unknown;
  max?: number;
  label?: string;
  className?: string;
  forceTag?: string;
}

/** 짧으면 그대로, 길면 첫 마디만 남기고 전체는 ⓘ 안 */
export const InfoTipAuto: React.FC<InfoTipAutoProps> = ({
  text,
  max = 48,
  label = '산출 기준',
  className = '',
  forceTag,
}) => {
  const t = safeText(text);
  if (!t) return null;
  if (t.length <= max && !forceTag) {
    return <p className={`it-note ${className}`.trim()}>{t}</p>;
  }
  const tag = forceTag ?? cutTag(t, max);
  return (
    <p className={`it-note ${className}`.trim()}>
      <InfoTip tag={tag} detail={t} label={label} />
    </p>
  );
};

export { safeText };
