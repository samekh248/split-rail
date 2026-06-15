const API_BASE = process.env.API_BASE_URL ?? process.env.PREVIEW_BASE_URL ?? 'http://localhost:5000';

export interface ResetSeedResult {
  orgA: OrgSeedContext;
  orgB: OrgSeedContext;
  sentinels: { orgAString: string[]; orgBStrings: string[] };
}

export interface OrgSeedContext {
  organizationId: string;
  adminEmail: string;
  adminPassword: string;
  scopedUserEmail: string;
  scopedUserPassword: string;
  inScopeVenueId: string;
  outOfScopeVenueId: string;
}

export interface LifecycleSeedResult {
  eventId: string;
  venueId: string;
  qboTagName: string;
  expectedSettlement: {
    computedNetPayout: string;
    grossRevenue: string;
    netShowRevenue: string;
  };
  expectedVariance: Record<string, string>;
}

export async function resetSeed(): Promise<ResetSeedResult> {
  const response = await fetch(`${API_BASE}/api/test-seed/reset`, { method: 'POST' });
  if (!response.ok) throw new Error(`resetSeed failed: ${response.status}`);
  return (await response.json()) as ResetSeedResult;
}

export async function seedLifecycleEvent(
  organizationId: string,
  venueId: string,
): Promise<LifecycleSeedResult> {
  const response = await fetch(`${API_BASE}/api/test-seed/lifecycle-event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ organizationId, venueId }),
  });
  if (!response.ok) throw new Error(`seedLifecycleEvent failed: ${response.status}`);
  return (await response.json()) as LifecycleSeedResult;
}

export async function getQboEgressRecords(): Promise<Array<{ method: string; host: string }>> {
  const response = await fetch(`${API_BASE}/api/test-seed/qbo-egress`);
  if (!response.ok) throw new Error(`getQboEgressRecords failed: ${response.status}`);
  return (await response.json()) as Array<{ method: string; host: string }>;
}

export async function mutateSettledEvent(
  eventId: string,
  newSettlementValue: number,
): Promise<{ rejected: boolean; message?: string }> {
  const response = await fetch(`${API_BASE}/api/test-seed/mutate-settled-event`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId, newSettlementValue }),
  });
  if (!response.ok) throw new Error(`mutateSettledEvent failed: ${response.status}`);
  return (await response.json()) as { rejected: boolean; message?: string };
}
