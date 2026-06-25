import { useEffect, useRef, useState } from 'react';
import { SelectField } from '@/components/auth/SelectField';
import { useRoles } from '@/api/roles';
import { useChangeMemberRole, useUpdateMemberVenueScopes } from '@/api/users';
import { useVenues } from '@/api/venues';
import type { UserListResponse } from '@/types/generated-api';

export interface MemberEditModalProps {
  member: UserListResponse;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

function venueIdsFromScopes(member: UserListResponse): string[] {
  return (member.venueScopes ?? [])
    .map((scope) => scope.venueId)
    .filter((id): id is string => Boolean(id));
}

export function MemberEditModal({ member, open, onClose, onSaved }: MemberEditModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const { data: roles = [] } = useRoles();
  const { data: venues = [] } = useVenues();
  const changeRole = useChangeMemberRole();
  const updateScopes = useUpdateMemberVenueScopes();

  const initialRoleId = member.role?.id ?? '';
  const initialVenueIds = venueIdsFromScopes(member);
  const initialAllVenues = initialVenueIds.length === 0;

  const [roleId, setRoleId] = useState(initialRoleId);
  const [allVenues, setAllVenues] = useState(initialAllVenues);
  const [selectedVenueIds, setSelectedVenueIds] = useState(initialVenueIds);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setRoleId(member.role?.id ?? '');
    const venueIds = venueIdsFromScopes(member);
    setAllVenues(venueIds.length === 0);
    setSelectedVenueIds(venueIds);
    setError(null);
  }, [member, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const toggleVenue = (venueId: string) => {
    setSelectedVenueIds((current) =>
      current.includes(venueId)
        ? current.filter((id) => id !== venueId)
        : [...current, venueId],
    );
  };

  const scopesChanged =
    allVenues !== initialAllVenues ||
    (!allVenues &&
      (selectedVenueIds.length !== initialVenueIds.length ||
        selectedVenueIds.some((id) => !initialVenueIds.includes(id))));

  const handleSave = async () => {
    if (!member.id || changeRole.isPending || updateScopes.isPending) {
      return;
    }

    setError(null);
    const roleChanged = roleId !== initialRoleId;

    try {
      if (roleChanged) {
        await changeRole.mutateAsync({ userId: member.id, body: { roleId } });
      }
      if (scopesChanged) {
        await updateScopes.mutateAsync({
          userId: member.id,
          body: { venueIds: allVenues ? [] : selectedVenueIds },
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to save changes.';
      if (message.startsWith('400:')) {
        setError(message.replace(/^400:\s*/, ''));
      } else {
        setError('Unable to save changes. Please try again.');
      }
    }
  };

  const isPending = changeRole.isPending || updateScopes.isPending;

  return (
    <div className="welcome-modal__backdrop" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className="welcome-modal team-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-edit-title"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        data-testid="member-edit-modal"
      >
        <h2 id="member-edit-title" className="welcome-modal__title">
          Edit member
        </h2>
        <p className="team-modal__subtitle">{member.email}</p>
        {error ? (
          <p className="team-modal__error" role="alert">
            {error}
          </p>
        ) : null}
        <SelectField
          id="member-edit-role"
          label="Role"
          value={roleId}
          options={roles.map((role) => ({
            value: role.id ?? '',
            label: role.roleName ?? 'Role',
          }))}
          onChange={setRoleId}
          disabled={isPending}
        />
        <fieldset className="invite-form__venues">
          <legend className="form-field__label">Venue access</legend>
          <label className="invite-form__venue-option">
            <input
              type="checkbox"
              checked={allVenues}
              onChange={(event) => setAllVenues(event.target.checked)}
              disabled={isPending}
            />
            All venues
          </label>
          {!allVenues
            ? venues.map((venue) => (
                <label key={venue.id} className="invite-form__venue-option">
                  <input
                    type="checkbox"
                    checked={venue.id ? selectedVenueIds.includes(venue.id) : false}
                    onChange={() => venue.id && toggleVenue(venue.id)}
                    disabled={isPending}
                  />
                  {venue.name}
                </label>
              ))
            : null}
        </fieldset>
        <div className="team-modal__actions">
          <button type="button" onClick={onClose} disabled={isPending}>
            Cancel
          </button>
          <button
            type="button"
            className="team-modal__save"
            data-testid="member-edit-save"
            onClick={() => void handleSave()}
            disabled={isPending}
          >
            {isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
