import type { VenueScopeDto } from '@/types/generated-api';

export function formatVenueScopeSummary(venueScopes?: VenueScopeDto[] | null): string {
  if (!venueScopes || venueScopes.length === 0) {
    return 'All venues';
  }
  return venueScopes.map((scope) => scope.venueName ?? 'Unknown venue').join(', ');
}
