import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildBookingPath,
  buildEventWorkspacePath,
  getAppPath,
  getBookingMonthFromUrl,
  getDashboardPath,
  getInviteTokenFromUrl,
  isEventWorkspacePath,
  navigateReturnToApp,
  navigateToAcceptInvite,
  navigateToBooking,
  navigateToBookingMonth,
  navigateToDashboard,
  navigateToSignIn,
  navigateToVenues,
  navigateToIntegrationsSettings,
  navigateToOrganizationSettings,
  navigateToSettings,
  navigateToTeamSettings,
  parseBookingMonth,
  parseEventWorkspacePath,
  useAppRoute,
  useBookingCalendarMonth,
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

  it('getAppPath returns /booking', () => {
    window.history.pushState({}, '', '/booking');
    expect(getAppPath()).toBe('/booking');
  });

  it('getAppPath returns /booking when a month query is present', () => {
    window.history.pushState({}, '', '/booking?month=2026-08');
    expect(getAppPath()).toBe('/booking');
    expect(getBookingMonthFromUrl()).toBe('2026-08');
  });

  it('parseBookingMonth accepts YYYY-MM and rejects invalid values', () => {
    expect(parseBookingMonth('2026-08')).toBe('2026-08');
    expect(parseBookingMonth('2026-13')).toBeNull();
    expect(parseBookingMonth('08')).toBeNull();
    expect(parseBookingMonth('nope')).toBeNull();
  });

  it('buildBookingPath writes a month query and falls back to the current month', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15));
    expect(buildBookingPath('2026-08')).toBe('/booking?month=2026-08');
    expect(buildBookingPath('nope')).toBe('/booking?month=2026-06');
    expect(buildBookingPath()).toBe('/booking?month=2026-06');
    vi.useRealTimers();
  });

  it('navigateToBooking pushes the current month query', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15));
    navigateToBooking();
    expect(getAppPath()).toBe('/booking');
    expect(window.location.search).toBe('?month=2026-06');
    vi.useRealTimers();
  });

  it('navigateToBooking accepts an explicit month', () => {
    navigateToBooking('2026-08');
    expect(window.location.pathname).toBe('/booking');
    expect(window.location.search).toBe('?month=2026-08');
  });

  it('navigateToBookingMonth is a no-op when the URL already matches', () => {
    window.history.pushState({}, '', '/booking?month=2026-08');
    const pushState = vi.spyOn(window.history, 'pushState');
    navigateToBookingMonth('2026-08');
    expect(pushState).not.toHaveBeenCalled();
    pushState.mockRestore();
  });

  it('useBookingCalendarMonth reads the URL and canonicalizes a missing month', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15));
    window.history.pushState({}, '', '/booking');
    const { result } = renderHook(() => useBookingCalendarMonth());
    expect(result.current).toBe('2026-06');
    expect(window.location.search).toBe('?month=2026-06');
    vi.useRealTimers();
  });

  it('useBookingCalendarMonth updates when the month query changes', () => {
    window.history.pushState({}, '', '/booking?month=2026-08');
    const { result } = renderHook(() => useBookingCalendarMonth());
    expect(result.current).toBe('2026-08');

    act(() => {
      navigateToBookingMonth('2026-09');
    });

    expect(result.current).toBe('2026-09');
    expect(window.location.search).toBe('?month=2026-09');
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

  it('getAppPath returns /venues', () => {
    window.history.pushState({}, '', '/venues');
    expect(getAppPath()).toBe('/venues');
    expect(getDashboardPath()).toBe('/venues');
  });

  it('getAppPath normalizes /venues/ trailing slash', () => {
    window.history.pushState({}, '', '/venues/');
    expect(getAppPath()).toBe('/venues');
    expect(getDashboardPath()).toBe('/venues');
  });

  it('navigateToVenues updates path and hook state', () => {
    const { result } = renderHook(() => useAppRoute());
    act(() => navigateToVenues());
    expect(window.location.pathname).toBe('/venues');
    expect(result.current).toBe('/venues');
  });

  it('navigateToSettings captures return path and navigateReturnToApp restores it', () => {
    window.history.pushState({}, '', '/venues');
    const { result } = renderHook(() => useAppRoute());
    act(() => navigateToSettings());
    expect(result.current).toBe('/settings');
    expect(readSettingsReturnPath()).toBe('/venues');
    act(() => navigateReturnToApp());
    expect(result.current).toBe('/venues');
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

  it('navigateToSignIn replaces a deep route and clears query and fragment state', () => {
    window.history.pushState({}, '', `${WORKSPACE_PATH}?focus=deal#artist`);
    const replaceState = vi.spyOn(window.history, 'replaceState');
    const { result } = renderHook(() => useAppRoute());

    act(() => navigateToSignIn());

    expect(replaceState).toHaveBeenCalledWith(null, '', '/');
    expect(window.location.pathname).toBe('/');
    expect(window.location.search).toBe('');
    expect(window.location.hash).toBe('');
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
