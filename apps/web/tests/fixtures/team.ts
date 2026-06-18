import type {
  InvitationResponse,
  RoleResponse,
  UserListResponse,
  VenueResponse,
} from '@/types/generated-api';
import { VENUE_A, VENUE_B } from './venues';

export const roleOptions: RoleResponse[] = [
  { id: 'role-1', roleName: 'Admin' },
  { id: 'role-2', roleName: 'Promoter' },
];

export const venueOptions: VenueResponse[] = [
  { ...VENUE_A, organizationId: 'org-1', createdAt: '2026-01-01T00:00:00Z' },
  { ...VENUE_B, organizationId: 'org-1', createdAt: '2026-01-01T00:00:00Z' },
];

export const pendingInvitation: InvitationResponse = {
  id: 'inv-pending',
  email: 'pending@example.com',
  roleName: 'Promoter',
  status: 'pending',
  expiresAt: '2026-12-01T00:00:00Z',
  venueScopes: [{ venueId: VENUE_A.id, venueName: VENUE_A.name }],
};

export const acceptedInvitation: InvitationResponse = {
  id: 'inv-accepted',
  email: 'accepted@example.com',
  roleName: 'Admin',
  status: 'accepted',
  expiresAt: '2026-12-01T00:00:00Z',
  venueScopes: [],
};

export const orgMember: UserListResponse = {
  id: 'user-admin',
  email: 'admin@example.com',
  role: { id: 'role-1', roleName: 'Admin' },
  venueScopes: [],
};

export const orgMemberScoped: UserListResponse = {
  id: 'user-scoped',
  email: 'manager@example.com',
  role: { id: 'role-2', roleName: 'Promoter' },
  venueScopes: [{ venueId: VENUE_A.id, venueName: VENUE_A.name }],
};
