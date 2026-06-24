import { useRef, useState, type ReactNode } from 'react';
import { useSidebarState } from '@/hooks/useSidebarState';
import { MobileNavDrawer } from './MobileNavDrawer';
import {
  ShellWorkspaceBarContext,
  useShellWorkspaceBarContextValue,
} from './ShellWorkspaceBarContext';
import { SidebarRail } from './SidebarRail';
import { TopBar } from './TopBar';
import { WorkspaceBar } from './WorkspaceBar';

export interface AppShellProps {
  organizationName: string;
  children: ReactNode;
}

export function AppShell({ organizationName, children }: AppShellProps) {
  const sidebar = useSidebarState();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [workspaceBarContent, setWorkspaceBarContent] = useState<ReactNode>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const workspaceBarContextValue = useShellWorkspaceBarContextValue(setWorkspaceBarContent);
  const shellClassName = `app-shell app-shell--${sidebar.effectiveMode}`;
  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <ShellWorkspaceBarContext.Provider value={workspaceBarContextValue}>
      <div className={shellClassName} data-testid="app-shell">
        <div className="app-shell__sidebar-slot">
          <SidebarRail sidebar={sidebar} onNavigate={closeMobileNav} />
        </div>
        <div className="app-shell__main">
          <div className="app-shell__header">
            <WorkspaceBar content={workspaceBarContent} />
            <TopBar
              organizationName={organizationName}
              showMobileMenu
              mobileTriggerRef={mobileTriggerRef}
              onOpenMobileNav={() => setMobileNavOpen(true)}
            />
          </div>
          <main className="app-shell__content">{children}</main>
        </div>
        <MobileNavDrawer
          open={mobileNavOpen}
          onClose={closeMobileNav}
          triggerRef={mobileTriggerRef}
        />
      </div>
    </ShellWorkspaceBarContext.Provider>
  );
}
