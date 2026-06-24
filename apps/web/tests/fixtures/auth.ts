import type {
  LoginRequest,
  PermissionsDto,
  UserProfileResponse,
} from '@/types/generated-api';
import type { RegisterValues } from '@/auth/AuthContext';
import { VENUE_B } from './venues';

// Shared auth/profile fixtures (feature 010-vitest-tests-auth, T002).
// All shapes import from the generated API contract (Constitution VI).
//
// ---------------------------------------------------------------------------
// T005 — Coverage reconciliation of contracts/test-coverage.md (C1–C16):
//   C1  LoginForm/LoginPage required labeled fields ........ covered (extended T006/T011)
//   C2  RegisterForm/RegisterPage exactly 3 fields ......... covered (extended T007/T012)
//   C3  empty submit blocks + inline validation ........... covered (T006/T007)
//   C4  malformed email / weak password messages .......... covered (T006/T007/T008)
//   C5  form-level error distinct + announced ............. covered (T006/T007 + AuthContext)
//   C6  pending disables submit ........................... partial → extended (T006/T007)
//   C7  venue list rendered verbatim, no client filter .... covered (T014)
//   C8  select updates active venue + active indicated .... covered (T014)
//   C9  single/no venue states ............................ covered (T014/T017)
//   C10 keyboard operability (open + select) .............. partial → extended (T014)
//   C11 permission-gated controls hidden/shown ............ partial → extended (T019/T020)
//   C12 page/container wiring ............................. covered (T011/T012/T017)
//   C13 server-failure vs validation distinction .......... covered (T006/T011)
//   C14 remembered venue fallback ......................... covered (T015/T016)
//   C15 venue list load failure → error + retry .......... covered (T017)
//   C16 suites pass in CI + ≥80% gate ..................... verified (T023)
// ---------------------------------------------------------------------------

export const validLogin: LoginRequest = {
  email: 'user@example.com',
  password: 'Password1',
};

export const validRegister: RegisterValues = {
  email: 'owner@example.com',
  password: 'Password1',
  organizationName: 'Acme Touring',
};

export const emptyInput = { email: '', password: '', organizationName: '' };
export const malformedEmail = 'not-an-email';
export const weakPassword = 'short';

const allPermissions: PermissionsDto = {
  canManagePermissions: true,
  canLockBudget: true,
  canEditSettlement: true,
  canSignSettlement: true,
  canReverseSettlement: true,
  canTriggerQboSync: true,
  canMapQboAccounts: true,
  canViewFinancials: true,
};

const noPermissions: PermissionsDto = {
  canManagePermissions: false,
  canLockBudget: false,
  canEditSettlement: false,
  canSignSettlement: false,
  canReverseSettlement: false,
  canTriggerQboSync: false,
  canMapQboAccounts: false,
  canViewFinancials: false,
};

/** Full-access role: every permission-gated control should render. */
export const fullAccessProfile: UserProfileResponse = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'owner@example.com',
  organization: { id: 'org-1', name: 'Acme Touring' },
  role: {
    id: '22222222-2222-2222-2222-222222222222',
    roleName: 'Owner',
    permissions: allPermissions,
  },
  venueScopes: [],
};

/** Restricted role: permission-gated controls should be hidden. */
export const restrictedProfile: UserProfileResponse = {
  id: '33333333-3333-3333-3333-333333333333',
  email: 'viewer@example.com',
  organization: { id: 'org-1', name: 'Acme Touring' },
  role: {
    id: '44444444-4444-4444-4444-444444444444',
    roleName: 'Viewer',
    permissions: noPermissions,
  },
  venueScopes: [],
};

/** Venue-scoped role: access limited to a single venue. */
export const venueScopedProfile: UserProfileResponse = {
  id: '55555555-5555-5555-5555-555555555555',
  email: 'manager@example.com',
  organization: { id: 'org-1', name: 'Acme Touring' },
  role: {
    id: '66666666-6666-6666-6666-666666666666',
    roleName: 'Venue Manager',
    permissions: { ...noPermissions, canViewFinancials: true },
  },
  venueScopes: [{ venueId: VENUE_B.id, venueName: VENUE_B.name }],
};
