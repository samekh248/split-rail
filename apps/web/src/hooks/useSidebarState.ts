import { useCallback, useEffect, useRef, useState } from 'react';
import { readSidebarPinnedExpanded, writeSidebarPinnedExpanded } from '@/lib/sidebarStorage';

const HOVER_INTENT_MS = 250;

export type SidebarEffectiveMode = 'pinned-expanded' | 'collapsed' | 'hover-overlay';

export function useSidebarState() {
  const [pinnedExpanded, setPinnedExpanded] = useState(() => readSidebarPinnedExpanded());
  const [hoverExpanded, setHoverExpanded] = useState(false);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHoverTimer = useCallback(() => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearHoverTimer();
  }, [clearHoverTimer]);

  const unpinNavigation = useCallback(() => {
    clearHoverTimer();
    setHoverExpanded(false);
    setPinnedExpanded(false);
    writeSidebarPinnedExpanded(false);
  }, [clearHoverTimer]);

  const pinNavigation = useCallback(() => {
    clearHoverTimer();
    setHoverExpanded(false);
    setPinnedExpanded(true);
    writeSidebarPinnedExpanded(true);
  }, [clearHoverTimer]);

  const onRailPointerEnter = useCallback(() => {
    if (pinnedExpanded) {
      return;
    }
    clearHoverTimer();
    hoverTimerRef.current = setTimeout(() => {
      setHoverExpanded(true);
      hoverTimerRef.current = null;
    }, HOVER_INTENT_MS);
  }, [pinnedExpanded, clearHoverTimer]);

  const onRailPointerLeave = useCallback(() => {
    clearHoverTimer();
    setHoverExpanded(false);
  }, [clearHoverTimer]);

  const effectiveMode: SidebarEffectiveMode = pinnedExpanded
    ? 'pinned-expanded'
    : hoverExpanded
      ? 'hover-overlay'
      : 'collapsed';

  return {
    pinnedExpanded,
    hoverExpanded,
    effectiveMode,
    pinNavigation,
    unpinNavigation,
    onRailPointerEnter,
    onRailPointerLeave,
  };
}
