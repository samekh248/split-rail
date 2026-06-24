import { useEffect, useState } from 'react';
import { FormField } from '@/components/auth/FormField';
import { useCreateInvitation } from '@/api/invitations';
import { useRoles } from '@/api/roles';
import { useVenues } from '@/api/venues';
import { validateEmail } from '@/auth/validation';
import type { CreateInvitationRequest } from '@/types/generated-api';

export function InviteMemberForm() {
  const { data: roles = [], isLoading: rolesLoading } = useRoles();
  const { data: venues = [], isLoading: venuesLoading } = useVenues();
  const createInvitation = useCreateInvitation();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [roleId, setRoleId] = useState('');
  const [allVenues, setAllVenues] = useState(true);
  const [selectedVenueIds, setSelectedVenueIds] = useState<string[]>([]);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!roleId && roles.length > 0 && roles[0].id) {
      setRoleId(roles[0].id);
    }
  }, [roles, roleId]);

  const toggleVenue = (venueId: string) => {
    setSelectedVenueIds((current) =>
      current.includes(venueId)
        ? current.filter((id) => id !== venueId)
        : [...current, venueId],
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (createInvitation.isPending) {
      return;
    }

    const validationError = validateEmail(email);
    setEmailError(validationError);
    setBannerError(null);
    setSuccessMessage(null);

    if (validationError || !roleId) {
      return;
    }

    const body: CreateInvitationRequest = {
      email: email.trim(),
      roleId,
      venueIds: allVenues ? [] : selectedVenueIds,
    };

    try {
      await createInvitation.mutateAsync(body);
      setEmail('');
      setAllVenues(true);
      setSelectedVenueIds([]);
      setSuccessMessage('Invitation sent.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to send invitation.';
      if (message.includes('409')) {
        setBannerError('An invitation for this email is already pending.');
      } else if (message.startsWith('400:')) {
        setBannerError(message.replace(/^400:\s*/, ''));
      } else {
        setBannerError('Unable to send invitation. Please try again.');
      }
    }
  };

  return (
    <section className="team-section" aria-labelledby="invite-member-heading">
      <h2 id="invite-member-heading" className="team-section__title">
        Invite member
      </h2>
      {bannerError ? (
        <p className="team-section__banner team-section__banner--error" role="alert">
          {bannerError}
        </p>
      ) : null}
      {successMessage ? (
        <p className="team-section__banner team-section__banner--success" role="status">
          {successMessage}
        </p>
      ) : null}
      <form className="invite-form" onSubmit={(event) => void handleSubmit(event)}>
        <FormField
          id="invite-email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          onBlur={() => setEmailError(validateEmail(email))}
          error={emailError}
          required
          autoComplete="email"
          disabled={createInvitation.isPending}
        />
        <div className="form-field">
          <label htmlFor="invite-role" className="form-field__label">
            Role
          </label>
          <select
            id="invite-role"
            className="form-field__input"
            value={roleId}
            onChange={(event) => setRoleId(event.target.value)}
            disabled={createInvitation.isPending || rolesLoading}
            required
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id ?? ''}>
                {role.roleName}
              </option>
            ))}
          </select>
        </div>
        <fieldset className="invite-form__venues">
          <legend className="form-field__label">Venue access</legend>
          <label className="invite-form__venue-option">
            <input
              type="checkbox"
              checked={allVenues}
              onChange={(event) => setAllVenues(event.target.checked)}
              disabled={createInvitation.isPending}
            />
            All venues
          </label>
          {!allVenues ? (
            venuesLoading ? (
              <p className="invite-form__venues-hint">Loading venues…</p>
            ) : venues.length === 0 ? (
              <p className="invite-form__venues-hint">
                No venues yet. The invitee will have organization-wide access once venues are
                added.
              </p>
            ) : (
              venues.map((venue) => (
                <label key={venue.id} className="invite-form__venue-option">
                  <input
                    type="checkbox"
                    checked={venue.id ? selectedVenueIds.includes(venue.id) : false}
                    onChange={() => venue.id && toggleVenue(venue.id)}
                    disabled={createInvitation.isPending}
                  />
                  {venue.name}
                </label>
              ))
            )
          ) : null}
        </fieldset>
        <button
          type="submit"
          className="invite-form__submit"
          data-testid="invite-member-submit"
          disabled={createInvitation.isPending}
        >
          {createInvitation.isPending ? 'Sending…' : 'Send invitation'}
        </button>
      </form>
    </section>
  );
}
