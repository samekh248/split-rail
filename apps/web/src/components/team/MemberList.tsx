import { formatVenueScopeSummary } from '@/lib/teamScopeSummary';
import type { UserListResponse } from '@/types/generated-api';

export interface MemberListProps {
  members: UserListResponse[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  onEdit: (member: UserListResponse) => void;
  onRemove: (member: UserListResponse) => void;
}

export function MemberList({
  members,
  isLoading = false,
  isError = false,
  onRetry,
  onEdit,
  onRemove,
}: MemberListProps) {
  if (isLoading) {
    return (
      <section className="team-section" aria-labelledby="member-list-heading">
        <h2 id="member-list-heading" className="team-section__title">
          Members
        </h2>
        <p role="status">Loading members…</p>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="team-section" aria-labelledby="member-list-heading">
        <h2 id="member-list-heading" className="team-section__title">
          Members
        </h2>
        <div role="alert">
          <p>Unable to load members.</p>
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
    <section className="team-section" aria-labelledby="member-list-heading">
      <h2 id="member-list-heading" className="team-section__title">
        Members
      </h2>
      {members.length === 0 ? (
        <p className="team-section__empty">No members found.</p>
      ) : (
        <table className="team-table">
          <thead>
            <tr>
              <th scope="col">Email</th>
              <th scope="col">Role</th>
              <th scope="col">Scope</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id}>
                <td>{member.email}</td>
                <td>{member.role?.roleName}</td>
                <td>{formatVenueScopeSummary(member.venueScopes)}</td>
                <td>
                  <div className="team-table__actions">
                    <button
                      type="button"
                      data-testid={`edit-member-${member.id}`}
                      onClick={() => onEdit(member)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      data-testid={`remove-member-${member.id}`}
                      onClick={() => onRemove(member)}
                    >
                      Remove
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
