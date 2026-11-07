import React from 'react';

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

/** Technical evidence is intentionally not rendered on inal. */
export const InfoTip: React.FC<InfoTipProps> = () => null;

interface InfoTipAutoProps {
  text: unknown;
  max?: number;
  label?: string;
  className?: string;
  forceTag?: string;
}

/** Keep result summaries as plain text; never expose calculation/evidence popovers. */
export const InfoTipAuto: React.FC<InfoTipAutoProps> = ({ text, label, className = '' }) => {
  if (label === '계산 기준') return null;
  const t = safeText(text);
  return t ? <p className={`it-note ${className}`.trim()}>{t}</p> : null;
};

export { safeText };
