import { describe, expect, it } from 'vitest';
import { resolveEventCardQuickLinks, resolveQuickLinks } from '@/lib/eventCardQuickLinks';
import type { BottleneckAlert } from '@/lib/eventLifecycle';
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

describe('resolveEventCardQuickLinks', () => {
  it('returns only the signature link when missing signature is the bottleneck', () => {
    const alerts: BottleneckAlert[] = [{ kind: 'MISSING_SIGNATURE', label: 'Missing signature' }];
    const links = resolveEventCardQuickLinks('NightOf', FULL_PERMISSIONS, alerts);
    expect(links.map((l) => l.label)).toEqual(['Capture Signature']);
  });

  it('returns phase links when no bottleneck alerts are present', () => {
    const links = resolveEventCardQuickLinks('NightOf', FULL_PERMISSIONS, []);
    expect(links.map((l) => l.label)).toEqual(['Settlement Wizard', 'Capture Signature']);
  });

  it('returns phase links when bottlenecks have no mapped action link', () => {
    const alerts: BottleneckAlert[] = [{ kind: 'UNMAPPED_QBO', label: '2 unmapped accounts' }];
    const links = resolveEventCardQuickLinks('PreShow', FULL_PERMISSIONS, alerts);
    expect(links.map((l) => l.label)).toEqual(['Edit Deal Builder', 'Lock Budget']);
  });

  it('returns multiple action links when multiple bottlenecks map to links', () => {
    const alerts: BottleneckAlert[] = [
      { kind: 'VARIANCE_REVIEW', label: 'Variance review needed' },
      { kind: 'SETTLED_NOT_SYNCED', label: 'Not synced to QBO' },
    ];
    const links = resolveEventCardQuickLinks('PostShow', FULL_PERMISSIONS, alerts);
    expect(links.map((l) => l.label)).toEqual(['View QBO Variance', 'One-Click QBO Sync']);
  });
});
