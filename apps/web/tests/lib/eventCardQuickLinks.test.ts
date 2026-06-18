import { describe, expect, it } from 'vitest';
import { resolveQuickLinks } from '@/lib/eventCardQuickLinks';
import type { PermissionsDto } from '@/types/generated-api';

const FULL_PERMISSIONS: PermissionsDto = {
  canViewFinancials: true,
  canLockBudget: true,
  canEditSettlement: true,
  canSignSettlement: true,
  canTriggerQboSync: true,
};

describe('resolveQuickLinks', () => {
  it('returns Pre-Show links when phase is PreShow', () => {
    const links = resolveQuickLinks('PreShow', FULL_PERMISSIONS);
    expect(links.map((l) => l.label)).toEqual(['Edit Deal Builder', 'Lock Budget']);
    expect(links[0]?.focus).toBe('deal');
  });

  it('returns Night Of links when phase is NightOf', () => {
    const links = resolveQuickLinks('NightOf', FULL_PERMISSIONS);
    expect(links.map((l) => l.label)).toEqual(['Settlement Wizard', 'Capture Signature']);
    expect(links[0]?.focus).toBe('settlement');
    expect(links[1]?.focus).toBe('signature');
  });

  it('returns Post-Show links when phase is PostShow', () => {
    const links = resolveQuickLinks('PostShow', FULL_PERMISSIONS);
    expect(links.map((l) => l.label)).toEqual(['View QBO Variance', 'One-Click QBO Sync']);
    expect(links[1]?.focus).toBe('sync');
  });

  it('returns Open workspace fallback for Unknown phase', () => {
    const links = resolveQuickLinks('Unknown', FULL_PERMISSIONS);
    expect(links).toHaveLength(1);
    expect(links[0]?.label).toBe('Open workspace');
    expect(links[0]?.focus).toBeUndefined();
  });

  it('hides unauthorized links', () => {
    const links = resolveQuickLinks('PreShow', {
      canViewFinancials: true,
      canLockBudget: false,
    });
    expect(links.map((l) => l.label)).toEqual(['Edit Deal Builder']);
  });

  it('shows Open workspace when no phase links remain permitted', () => {
    const links = resolveQuickLinks('PreShow', {
      canViewFinancials: true,
      canLockBudget: false,
      canEditSettlement: false,
    });
    expect(links.map((l) => l.label)).toEqual(['Edit Deal Builder']);
  });

  it('shows Open workspace fallback when all phase links denied', () => {
    const links = resolveQuickLinks('NightOf', {
      canViewFinancials: true,
      canEditSettlement: false,
      canSignSettlement: false,
    });
    expect(links).toHaveLength(1);
    expect(links[0]?.label).toBe('Open workspace');
  });

  it('returns empty when no permissions including fallback', () => {
    const links = resolveQuickLinks('Unknown', {});
    expect(links).toHaveLength(0);
  });
});
