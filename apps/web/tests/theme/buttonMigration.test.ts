import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const srcRoot = resolve(__dirname, '../../src');

const primarySurfaces = [
  { file: 'components/auth/LoginForm.tsx', className: 'btn-primary' },
  { file: 'components/auth/RegisterForm.tsx', className: 'btn-primary' },
  { file: 'components/onboarding/OrganizationCreateStep.tsx', className: 'btn-primary' },
  { file: 'components/onboarding/WelcomeModal.tsx', className: 'btn-primary' },
  { file: 'components/settlement/FinalizeSettlementPanel.tsx', className: 'btn-primary' },
  { file: 'pages/DashboardOverviewPage.tsx', className: 'btn-primary' },
  { file: 'pages/AccountingOverviewPage.tsx', className: 'btn-primary' },
  { file: 'pages/EventWorkspacePage.tsx', className: 'btn-primary' },
];

const compactPrimarySurfaces = [
  { file: 'components/qbo/SyncNowButton.tsx', className: 'btn-primary--compact' },
  { file: 'components/qbo/SyncAllButton.tsx', className: 'btn-primary--compact' },
  { file: 'components/ledger/LedgerGrid.tsx', className: 'btn-primary--compact' },
];

describe('FR-005 button migration', () => {
  it.each(primarySurfaces)('$file declares $className', ({ file, className }) => {
    const src = readFileSync(resolve(srcRoot, file), 'utf-8');
    expect(src).toContain(className);
  });

  it.each(compactPrimarySurfaces)('$file declares $className', ({ file, className }) => {
    const src = readFileSync(resolve(srcRoot, file), 'utf-8');
    expect(src).toContain(className);
  });
});
