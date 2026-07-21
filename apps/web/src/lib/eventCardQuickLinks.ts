import type { PermissionsDto } from '@/types/generated-api';
import type { BottleneckAlert, DashboardLifecyclePhase } from '@/lib/eventLifecycle';

export type WorkspaceFocus = 'deal' | 'settlement' | 'signature' | 'variance' | 'sync';

export interface QuickLinkDefinition {
  label: string;
  focus?: WorkspaceFocus;
  permission: keyof PermissionsDto;
  testId: string;
}

const OPEN_WORKSPACE: QuickLinkDefinition = {
  label: 'Open workspace',
  permission: 'canViewFinancials',
  testId: 'workspace',
};

const PHASE_LINKS: Record<Exclude<DashboardLifecyclePhase, 'Unknown'>, QuickLinkDefinition[]> = {
  PreShow: [
    { label: 'Edit Deal Builder', focus: 'deal', permission: 'canViewFinancials', testId: 'deal' },
    { label: 'Lock Budget', focus: 'deal', permission: 'canLockBudget', testId: 'lock-budget' },
  ],
  NightOf: [
    { label: 'Settlement Wizard', focus: 'settlement', permission: 'canEditSettlement', testId: 'settlement' },
    { label: 'Capture Signature', focus: 'signature', permission: 'canSignSettlement', testId: 'signature' },
  ],
  PostShow: [
    { label: 'View QBO Variance', focus: 'variance', permission: 'canViewFinancials', testId: 'variance' },
    { label: 'One-Click QBO Sync', focus: 'sync', permission: 'canTriggerQboSync', testId: 'sync' },
  ],
};

function hasPermission(permissions: PermissionsDto, key: keyof PermissionsDto): boolean {
  return permissions[key] === true;
}

function filterByPermissions(
  links: QuickLinkDefinition[],
  permissions: PermissionsDto,
): QuickLinkDefinition[] {
  return links.filter((link) => hasPermission(permissions, link.permission));
}

/** Resolve visible quick links for a dashboard lifecycle phase with permission gating. */
export function resolveQuickLinks(
  phase: DashboardLifecyclePhase,
  permissions: PermissionsDto,
): QuickLinkDefinition[] {
  if (phase === 'Unknown') {
    return hasPermission(permissions, OPEN_WORKSPACE.permission) ? [OPEN_WORKSPACE] : [];
  }

  const baseLinks = PHASE_LINKS[phase];
  const permitted = filterByPermissions(baseLinks, permissions);

  if (permitted.length === 0 && hasPermission(permissions, OPEN_WORKSPACE.permission)) {
    return [OPEN_WORKSPACE];
  }

  return permitted;
}

const BOTTLENECK_ACTION_LINK_TEST_IDS: Partial<Record<BottleneckAlert['kind'], string>> = {
  MISSING_SIGNATURE: 'signature',
  SETTLED_NOT_SYNCED: 'sync',
  VARIANCE_REVIEW: 'variance',
};

/**
 * When bottleneck alerts are present, show only the quick links for required actions
 * instead of every link for the lifecycle phase.
 */
export function resolveEventCardQuickLinks(
  phase: DashboardLifecyclePhase,
  permissions: PermissionsDto,
  bottleneckAlerts: BottleneckAlert[],
): QuickLinkDefinition[] {
  const phaseLinks = resolveQuickLinks(phase, permissions);

  if (bottleneckAlerts.length === 0) {
    return phaseLinks;
  }

  const requiredTestIds = new Set(
    bottleneckAlerts
      .map((alert) => BOTTLENECK_ACTION_LINK_TEST_IDS[alert.kind])
      .filter((testId): testId is string => Boolean(testId)),
  );

  if (requiredTestIds.size === 0) {
    return phaseLinks;
  }

  const actionLinks = phaseLinks.filter((link) => requiredTestIds.has(link.testId));
  return actionLinks.length > 0 ? actionLinks : phaseLinks;
}
