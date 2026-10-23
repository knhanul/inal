import React from 'react';
import { ChevronRight, Sparkles } from 'lucide-react';
import type { StoryCardViewModel, BottomSheetDetailPayload } from '../../types/viewmodel';
import { DataSourceLabel } from '../common/DataSourceLabel';
import { InfoTipAuto } from '../common/InfoTip';

interface StoryCardProps {
  story: StoryCardViewModel;
  indexLabel?: string;
  children?: React.ReactNode;
  onOpenDetail: (detail: BottomSheetDetailPayload) => void;
}

export const StoryCard: React.FC<StoryCardProps> = ({
  story,
  indexLabel,
  children,
  onOpenDetail,
}) => {
  return (
    <article className="flex flex-col justify-between rounded-card border border-inal-border bg-inal-surface p-5 shadow-card">
      <div>
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-inal-accentSoft px-2.5 py-1 text-[11px] font-bold text-inal-accent">
            <Sparkles className="h-3 w-3" />
            <span>{story.badgeText}</span>
          </div>
          {indexLabel && (
            <span className="text-[11px] font-semibold tabular-nums text-inal-textSoft">{indexLabel}</span>
          )}
        </div>

        <h3 className="mt-3 text-base font-bold leading-snug text-inal-text">{story.title}</h3>

        {story.highlightValue && (
          <div className="mt-2.5 inline-block rounded-xl bg-inal-surfaceSubtle px-3 py-1.5 text-lg font-extrabold tabular-nums text-inal-accent">
            {story.highlightValue}
          </div>
        )}

        <InfoTipAuto text={story.summary} max={52} label="이야기 근거" className="mt-2" />

        {story.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {story.tags.map((tag) => (
              <span key={tag} className="rounded-md bg-inal-surfaceSubtle px-2 py-0.5 text-[10px] font-medium text-inal-textMuted">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {children && <div className="mt-3.5">{children}</div>}

      <div className="mt-4 pt-3 border-t border-inal-border/70 space-y-2.5">
        <DataSourceLabel provenance={story.provenance} compact />
        <button
          type="button"
          onClick={() => onOpenDetail(story.detail)}
          className="touch-target flex w-full items-center justify-between rounded-xl border border-inal-border bg-inal-surfaceSubtle/50 px-3.5 py-2.5 text-xs font-semibold text-inal-text transition hover:bg-inal-surfaceSubtle"
        >
          <span>자세히 보기</span>
          <ChevronRight className="h-4 w-4 text-inal-textMuted" />
        </button>
      </div>
    </article>
  );
};
