import type { WorkspaceFocus } from '@/lib/eventCardQuickLinks';

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const RECOGNIZED_FOCUS_VALUES: readonly WorkspaceFocus[] = [
  'deal',
  'settlement',
  'signature',
  'variance',
  'sync',
];

export const WORKSPACE_FOCUS_TARGETS: Record<WorkspaceFocus, string> = {
  deal: '[data-testid="artist-deal-panel"]',
  settlement: '[data-testid="ledger-grid"]',
  signature: '[data-testid="finalize-settlement-panel"]',
  variance: '[data-testid="variance-banner"]',
  sync: '[data-testid="workspace-focus-sync"]',
};

export function isRecognizedWorkspaceFocus(
  value: string | null | undefined,
): value is WorkspaceFocus {
  if (!value) {
    return false;
  }
  return (RECOGNIZED_FOCUS_VALUES as readonly string[]).includes(value);
}

export function scrollToWorkspaceFocus(
  focus: WorkspaceFocus,
  scope: ParentNode = document,
): boolean {
  const root = scope.querySelector(WORKSPACE_FOCUS_TARGETS[focus]);
  if (!(root instanceof HTMLElement)) {
    return false;
  }

  root.scrollIntoView({ block: 'start' });

  const focusable = root.querySelector(FOCUSABLE_SELECTOR);
  if (focusable instanceof HTMLElement) {
    focusable.focus();
  }

  return true;
}
