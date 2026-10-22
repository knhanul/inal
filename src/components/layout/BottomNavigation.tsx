import React from 'react';
import { Sun, CalendarClock, BarChart3, BookOpen } from 'lucide-react';
import type { MainTabId } from '../../types/viewmodel';

interface BottomNavigationProps {
  activeTab: MainTabId;
  onSelectTab: (tab: MainTabId) => void;
}

const NAV_ITEMS: Array<{
  id: MainTabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'today', label: '오늘', icon: Sun },
  { id: 'forecast', label: '예보', icon: CalendarClock },
  { id: 'compare', label: '비교', icon: BarChart3 },
  { id: 'story', label: '이야기', icon: BookOpen },
];

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ activeTab, onSelectTab }) => {
  return (
    <nav
      aria-label="주요 화면 내비게이션"
      className="fixed bottom-0 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 border-t border-inal-border bg-inal-surface/95 backdrop-blur-md"
      style={{ paddingBottom: 'var(--safe-bottom)' }}
    >
      <div className="grid grid-cols-4 h-16 px-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`touch-target relative flex flex-col items-center justify-center gap-1 rounded-xl transition ${
                isActive
                  ? 'text-inal-accent font-bold'
                  : 'text-inal-textMuted font-medium hover:text-inal-text'
              }`}
            >
              {isActive && (
                <span aria-hidden="true" className="absolute top-1 h-1 w-6 rounded-full bg-inal-accent" />
              )}
              <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.4px]' : 'stroke-[1.8px]'}`} />
              <span className="text-[11px] leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
