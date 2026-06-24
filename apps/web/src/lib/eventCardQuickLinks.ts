import type { PermissionsDto } from '@/types/generated-api';
import type { DashboardLifecyclePhase } from '@/lib/eventLifecycle';

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
