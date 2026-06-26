import { useRef, useState, type ReactNode } from 'react';
import { SettingsNav } from '@/components/settings/SettingsNav';
import { useMobileAppShell } from '@/hooks/useMobileAppShell';
import { useSidebarState } from '@/hooks/useSidebarState';
import { MobileNavDrawer } from './MobileNavDrawer';
import {
  ShellWorkspaceBarContext,
  useShellWorkspaceBarContextValue,
} from './ShellWorkspaceBarContext';
import { ShellTopBarContext, useShellTopBarContextValue } from './ShellTopBarContext';
import { SidebarRail, type SidebarNavigationMode } from './SidebarRail';
import { TopBar } from './TopBar';
import { WorkspaceBar } from './WorkspaceBar';

export interface AppShellProps {
  topBarContent?: ReactNode;
  sidebarNavigation?: SidebarNavigationMode;
  children: ReactNode;
}

export function AppShell({
  topBarContent,
  sidebarNavigation = 'global',
  children,
}: AppShellProps) {
  const sidebar = useSidebarState();
  const isMobileAppShell = useMobileAppShell();
  const [dynamicTopBarContent, setDynamicTopBarContent] = useState<ReactNode>(null);
  const [dynamicWorkspaceBarContent, setDynamicWorkspaceBarContent] = useState<ReactNode>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const topBarContextValue = useShellTopBarContextValue(setDynamicTopBarContent);
  const workspaceBarContextValue = useShellWorkspaceBarContextValue(setDynamicWorkspaceBarContent);

  const contextualContent = topBarContent ?? dynamicTopBarContent;
  const workspaceBarContent = dynamicWorkspaceBarContent;
  const showHeader = Boolean(workspaceBarContent || contextualContent || isMobileAppShell);
  const shellClassName = `app-shell app-shell--${sidebar.effectiveMode}`;
  const showLabels = sidebar.pinnedExpanded || sidebar.hoverExpanded;
  const closeMobileNav = () => setMobileNavOpen(false);

  const settingsNavigation =
    sidebarNavigation === 'settings' ? (
      <SettingsNav variant="sidebar" showLabels={showLabels} onNavigate={closeMobileNav} />
    ) : undefined;

  return (
    <ShellTopBarContext.Provider value={topBarContextValue}>
      <ShellWorkspaceBarContext.Provider value={workspaceBarContextValue}>
        <div className={shellClassName} data-testid="app-shell">
          <div className="app-shell__sidebar-slot">
            <SidebarRail
              sidebar={sidebar}
              navigationMode={sidebarNavigation}
              navigation={settingsNavigation}
              onNavigate={closeMobileNav}
            />
          </div>
          <div className="app-shell__main">
            {showHeader ? (
              <div className="app-shell__header" data-testid="app-shell-header">
                <WorkspaceBar content={workspaceBarContent} />
                <TopBar
                  contextualContent={contextualContent}
                  showMobileMenu
                  mobileTriggerRef={mobileTriggerRef}
                  onOpenMobileNav={() => setMobileNavOpen(true)}
                />
              </div>
            ) : null}
            <main className="app-shell__content">{children}</main>
          </div>
          <MobileNavDrawer
            open={mobileNavOpen}
            onClose={closeMobileNav}
            triggerRef={mobileTriggerRef}
            navigationMode={sidebarNavigation}
            navigation={settingsNavigation}
          />
        </div>
      </ShellWorkspaceBarContext.Provider>
    </ShellTopBarContext.Provider>
  );
}
