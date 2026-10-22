import React from 'react';
import { CloudOff } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  subNote?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ title, description, subNote }) => {
  return (
    <div className="flex min-h-[280px] w-full flex-col items-center justify-center rounded-card border border-inal-border bg-inal-surface p-6 text-center shadow-card">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-inal-surfaceSubtle text-inal-textMuted">
        <CloudOff className="h-5 w-5" />
      </div>
      <h3 className="text-base font-bold text-inal-text">{title}</h3>
      <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-inal-textMuted">{description}</p>
      {subNote && (
        <p className="mt-3 rounded-lg bg-inal-surfaceSubtle px-3 py-1.5 text-[11px] text-inal-textSoft">
          {subNote}
        </p>
      )}
    </div>
  );
};
