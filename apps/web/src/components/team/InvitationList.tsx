import { useResendInvitation, useCancelInvitation } from '@/api/invitations';
import { formatVenueScopeSummary } from '@/lib/teamScopeSummary';
import type { InvitationResponse } from '@/types/generated-api';

export interface InvitationListProps {
  invitations: InvitationResponse[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
}

function formatExpiresAt(expiresAt?: string): string {
  if (!expiresAt) {
    return '—';
  }
  return new Date(expiresAt).toLocaleDateString();
}

export function InvitationList({
  invitations,
  isLoading = false,
  isError = false,
  onRetry,
}: InvitationListProps) {
  const resendInvitation = useResendInvitation();
  const cancelInvitation = useCancelInvitation();

  if (isLoading) {
    return (
      <section className="team-section" aria-labelledby="invitation-list-heading">
        <h2 id="invitation-list-heading" className="team-section__title">
          Pending invitations
        </h2>
        <p role="status">Loading invitations…</p>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="team-section" aria-labelledby="invitation-list-heading">
        <h2 id="invitation-list-heading" className="team-section__title">
          Pending invitations
        </h2>
        <div role="alert">
          <p>Unable to load invitations.</p>
          {onRetry ? (
            <button type="button" onClick={onRetry}>
              Retry
            </button>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="team-section" aria-labelledby="invitation-list-heading">
      <h2 id="invitation-list-heading" className="team-section__title">
        Pending invitations
      </h2>
      {invitations.length === 0 ? (
        <p className="team-section__empty">No pending invitations.</p>
      ) : (
        <table className="team-table">
          <thead>
            <tr>
              <th scope="col">Email</th>
              <th scope="col">Role</th>
              <th scope="col">Scope</th>
              <th scope="col">Status</th>
              <th scope="col">Expires</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invitations.map((invitation) => {
              const isAccepted = invitation.status?.toLowerCase() === 'accepted';
              return (
                <tr key={invitation.id}>
                  <td>{invitation.email}</td>
                  <td>{invitation.roleName}</td>
                  <td>{formatVenueScopeSummary(invitation.venueScopes)}</td>
                  <td>{invitation.status}</td>
                  <td>{formatExpiresAt(invitation.expiresAt)}</td>
                  <td>
                    {!isAccepted ? (
                      <div className="team-table__actions">
                        <button
                          type="button"
                          data-testid={`resend-invitation-${invitation.id}`}
                          disabled={resendInvitation.isPending || cancelInvitation.isPending}
                          onClick={() => invitation.id && void resendInvitation.mutateAsync(invitation.id)}
                        >
                          Re-send
                        </button>
                        <button
                          type="button"
                          data-testid={`cancel-invitation-${invitation.id}`}
                          disabled={resendInvitation.isPending || cancelInvitation.isPending}
                          onClick={() => invitation.id && void cancelInvitation.mutateAsync(invitation.id)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
