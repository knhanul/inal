import React, { useState, useEffect, useCallback } from 'react';
import type { MainTabId, BottomSheetDetailPayload } from './types/viewmodel';
import { useUserSettings } from './store/settingsStore';
import { isExplicitDevFallbackEnabled } from './api/client';
import { AppShell } from './components/layout/AppShell';
import { Header } from './components/layout/Header';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { RegionSelector } from './components/layout/RegionSelector';
import { SettingsSheet } from './components/layout/SettingsSheet';
import { DetailBottomSheet } from './components/common/DetailBottomSheet';
import { TodayPage } from './pages/TodayPage';
import { ForecastPage } from './pages/ForecastPage';
import { ComparePage } from './pages/ComparePage';
import { StoryPage } from './pages/StoryPage';

const VALID_TABS: MainTabId[] = ['today', 'forecast', 'compare', 'story'];

function resolveInitialTab(): MainTabId {
  if (typeof window === 'undefined') return 'today';
  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get('tab') as MainTabId | null;
  if (tabParam && VALID_TABS.includes(tabParam)) return tabParam;
  return 'today';
}

export const App: React.FC = () => {
  const { settings, selectStation, setDefaultStation, setBasis, setFontScale, resetSettings } = useUserSettings();
  const [activeTab, setActiveTab] = useState<MainTabId>(resolveInitialTab);
  const [isRegionOpen, setIsRegionOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeDetail, setActiveDetail] = useState<BottomSheetDetailPayload | null>(null);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-font-scale', settings.fontScale);
    }
  }, [settings.fontScale]);

  useEffect(() => {
    const onPopState = () => {
      setActiveTab(resolveInitialTab());
      setActiveDetail(null);
      setIsRegionOpen(false);
      setIsSettingsOpen(false);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleSelectTab = useCallback(
    (nextTab: MainTabId) => {
      setActiveTab(nextTab);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('tab', nextTab);
        url.searchParams.set('stn', settings.stationId);
        window.history.pushState({ tab: nextTab }, '', url.toString());
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [settings.stationId]
  );

  const handleSelectStation = useCallback(
    (nextStationId: string) => {
      selectStation(nextStationId);
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href);
        url.searchParams.set('stn', nextStationId);
        window.history.replaceState({}, '', url.toString());
      }
    },
    [selectStation]
  );

  return (
    <AppShell
      header={
        <Header
          stationId={settings.stationId}
          basis={settings.basis}
          isDevFallbackActive={isExplicitDevFallbackEnabled()}
          onOpenRegionSelector={() => setIsRegionOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      }
      bottomNav={<BottomNavigation activeTab={activeTab} onSelectTab={handleSelectTab} />}
    >
      {activeTab === 'today' && <TodayPage stationId={settings.stationId} basis={settings.basis} onOpenDetail={setActiveDetail} />}
      {activeTab === 'forecast' && <ForecastPage stationId={settings.stationId} basis={settings.basis} onOpenDetail={setActiveDetail} />}
      {activeTab === 'compare' && (
        <ComparePage
          stationId={settings.stationId}
          basis={settings.basis}
          onChangeBasis={setBasis}
          onSelectStation={handleSelectStation}
          onOpenDetail={setActiveDetail}
        />
      )}
      {activeTab === 'story' && <StoryPage stationId={settings.stationId} onOpenDetail={setActiveDetail} />}

      <RegionSelector
        isOpen={isRegionOpen}
        currentStationId={settings.stationId}
        recentStationIds={settings.recentStationIds}
        onSelectStation={handleSelectStation}
        onClose={() => setIsRegionOpen(false)}
      />

      <SettingsSheet
        isOpen={isSettingsOpen}
        settings={settings}
        onChangeDefaultStation={setDefaultStation}
        onChangeBasis={setBasis}
        onChangeFontScale={setFontScale}
        onReset={resetSettings}
        onClose={() => setIsSettingsOpen(false)}
      />

      <DetailBottomSheet detail={activeDetail} onClose={() => setActiveDetail(null)} />
    </AppShell>
  );
};

export default App;
