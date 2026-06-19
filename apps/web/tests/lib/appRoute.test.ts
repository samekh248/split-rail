import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  buildEventWorkspacePath,
  getAppPath,
  getDashboardPath,
  getInviteTokenFromUrl,
  isEventWorkspacePath,
  navigateReturnToApp,
  navigateToAcceptInvite,
  navigateToCreateVenue,
  navigateToDashboard,
  navigateToIntegrationsSettings,
  navigateToOrganizationSettings,
  navigateToSettings,
  navigateToTeamSettings,
  parseEventWorkspacePath,
  useAppRoute,
  useEventWorkspaceRoute,
} from '@/lib/appRoute';
import { readSettingsReturnPath } from '@/lib/settingsReturnStorage';

const VENUE_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const EVENT_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const WORKSPACE_PATH = `/venues/${VENUE_ID}/events/${EVENT_ID}`;

describe('appRoute', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('getAppPath returns / for root', () => {
    expect(getAppPath()).toBe('/');
    expect(getDashboardPath()).toBe('/');
  });

  it('getAppPath returns settings paths', () => {
    window.history.pushState({}, '', '/settings/team');
    expect(getAppPath()).toBe('/settings/team');
  });

  it('getAppPath returns workspace pathname for event workspace routes', () => {
    window.history.pushState({}, '', WORKSPACE_PATH);
    expect(getAppPath()).toBe(WORKSPACE_PATH);
    expect(isEventWorkspacePath(WORKSPACE_PATH)).toBe(true);
  });

  it('buildEventWorkspacePath and parseEventWorkspacePath round-trip', () => {
    expect(buildEventWorkspacePath(VENUE_ID, EVENT_ID)).toBe(WORKSPACE_PATH);
    expect(parseEventWorkspacePath(WORKSPACE_PATH)).toEqual({
      venueId: VENUE_ID,
      eventId: EVENT_ID,
    });
    expect(parseEventWorkspacePath('/venues/a/events')).toBeNull();
  });

  it('buildEventWorkspacePath appends optional focus query', () => {
    expect(buildEventWorkspacePath(VENUE_ID, EVENT_ID, 'artists')).toBe(
      `${WORKSPACE_PATH}?focus=artists`,
    );
  });

  it('useEventWorkspaceRoute returns params on workspace path', () => {
    window.history.pushState({}, '', WORKSPACE_PATH);
    const { result } = renderHook(() => useEventWorkspaceRoute());
    expect(result.current).toEqual({
      venueId: VENUE_ID,
      eventId: EVENT_ID,
      focus: null,
    });
  });

  it('useEventWorkspaceRoute updates focus when only query string changes', () => {
    window.history.pushState({}, '', WORKSPACE_PATH);
    const { result } = renderHook(() => useEventWorkspaceRoute());
    expect(result.current?.focus).toBeNull();

    act(() => {
      window.history.pushState({}, '', `${WORKSPACE_PATH}?focus=deal`);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    expect(result.current).toEqual({
      venueId: VENUE_ID,
      eventId: EVENT_ID,
      focus: 'deal',
    });
  });

  it('useEventWorkspaceRoute returns null off workspace path', () => {
    const { result } = renderHook(() => useEventWorkspaceRoute());
    expect(result.current).toBeNull();
  });

  it('useAppRoute updates on popstate for workspace paths', () => {
    const { result } = renderHook(() => useAppRoute());
    act(() => {
      window.history.pushState({}, '', WORKSPACE_PATH);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current).toBe(WORKSPACE_PATH);
  });

  it('getInviteTokenFromUrl parses token on accept-invite', () => {
    window.history.pushState({}, '', '/accept-invite?token=abc123');
    expect(getInviteTokenFromUrl()).toBe('abc123');
  });

  it('getInviteTokenFromUrl returns null on other paths', () => {
    window.history.pushState({}, '', '/settings');
    expect(getInviteTokenFromUrl()).toBeNull();
  });

  it('navigateToCreateVenue updates path and hook state', () => {
    const { result } = renderHook(() => useAppRoute());
    act(() => navigateToCreateVenue());
    expect(window.location.pathname).toBe('/venues/new');
    expect(result.current).toBe('/venues/new');
  });

  it('navigateToSettings captures return path and navigateReturnToApp restores it', () => {
    window.history.pushState({}, '', '/venues/new');
    const { result } = renderHook(() => useAppRoute());
    act(() => navigateToSettings());
    expect(result.current).toBe('/settings');
    expect(readSettingsReturnPath()).toBe('/venues/new');
    act(() => navigateReturnToApp());
    expect(result.current).toBe('/venues/new');
  });

  it('navigateToSettings and navigateToTeamSettings update path', () => {
    const { result } = renderHook(() => useAppRoute());
    act(() => navigateToSettings());
    expect(result.current).toBe('/settings');
    act(() => navigateToTeamSettings());
    expect(result.current).toBe('/settings/team');
  });

  it('navigateToDashboard returns to root', () => {
    window.history.pushState({}, '', '/settings');
    const { result } = renderHook(() => useAppRoute());
    act(() => navigateToDashboard());
    expect(window.location.pathname).toBe('/');
    expect(result.current).toBe('/');
  });

  it('getAppPath returns organization and integrations settings paths', () => {
    window.history.pushState({}, '', '/settings/organization');
    expect(getAppPath()).toBe('/settings/organization');
    window.history.pushState({}, '', '/settings/integrations');
    expect(getAppPath()).toBe('/settings/integrations');
    window.history.pushState({}, '', '/accept-invite');
    expect(getAppPath()).toBe('/accept-invite');
  });

  it('navigateToOrganizationSettings, navigateToIntegrationsSettings, and navigateToAcceptInvite update path', () => {
    const { result } = renderHook(() => useAppRoute());
    act(() => navigateToOrganizationSettings());
    expect(result.current).toBe('/settings/organization');
    act(() => navigateToIntegrationsSettings());
    expect(result.current).toBe('/settings/integrations');
    act(() => navigateToAcceptInvite('tok'));
    expect(window.location.pathname).toBe('/accept-invite');
    expect(window.location.search).toBe('?token=tok');
    expect(result.current).toBe('/accept-invite');
  });
});
