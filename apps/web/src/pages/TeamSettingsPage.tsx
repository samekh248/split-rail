import { useEffect, useState } from 'react';
import { SettingsLayout } from '@/components/settings/SettingsLayout';
import { InviteMemberForm } from '@/components/team/InviteMemberForm';
import { InvitationList } from '@/components/team/InvitationList';
import { MemberList } from '@/components/team/MemberList';
import { MemberEditModal } from '@/components/team/MemberEditModal';
import { RemoveMemberConfirm } from '@/components/team/RemoveMemberConfirm';
import { useInvitations } from '@/api/invitations';
import { useOrgMembers, useRemoveMember } from '@/api/users';
import { useUserProfile } from '@/api/user';
import { useCanManageTeam } from '@/hooks/useCanManageTeam';
import { navigateToSettings } from '@/lib/appRoute';
import type { UserListResponse } from '@/types/generated-api';

export function TeamSettingsPage() {
  const canManageTeam = useCanManageTeam();
  const { isLoading: profileLoading, isFetched: profileFetched } = useUserProfile();
  const {
    data: invitations = [],
    isLoading: invitationsLoading,
    isError: invitationsError,
    refetch: refetchInvitations,
  } = useInvitations();
  const {
    data: members = [],
    isLoading: membersLoading,
    isError: membersError,
    refetch: refetchMembers,
  } = useOrgMembers();
  const removeMember = useRemoveMember();

  const [editingMember, setEditingMember] = useState<UserListResponse | null>(null);
  const [removingMember, setRemovingMember] = useState<UserListResponse | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  useEffect(() => {
    if (profileFetched && !profileLoading && !canManageTeam) {
      navigateToSettings();
    }
  }, [profileFetched, profileLoading, canManageTeam]);

  if (!profileFetched || profileLoading || !canManageTeam) {
    return null;
  }

  return (
    <SettingsLayout title="Team">
      <InviteMemberForm />
      <InvitationList
        invitations={invitations}
        isLoading={invitationsLoading}
        isError={invitationsError}
        onRetry={() => void refetchInvitations()}
      />
      <MemberList
        members={members}
        isLoading={membersLoading}
        isError={membersError}
        onRetry={() => void refetchMembers()}
        onEdit={setEditingMember}
        onRemove={(member) => {
          setRemoveError(null);
          setRemovingMember(member);
        }}
      />
      {editingMember ? (
        <MemberEditModal
          member={editingMember}
          open
          onClose={() => setEditingMember(null)}
          onSaved={() => void refetchMembers()}
        />
      ) : null}
      {removingMember ? (
        <RemoveMemberConfirm
          member={removingMember}
          open
          isPending={removeMember.isPending}
          error={removeError}
          onCancel={() => {
            setRemovingMember(null);
            setRemoveError(null);
          }}
          onConfirm={async () => {
            if (!removingMember.id) {
              return;
            }
            setRemoveError(null);
            try {
              await removeMember.mutateAsync(removingMember.id);
              setRemovingMember(null);
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Unable to remove member.';
              if (message.startsWith('400:')) {
                setRemoveError(message.replace(/^400:\s*/, ''));
              } else {
                setRemoveError('Unable to remove member. Please try again.');
              }
            }
          }}
        />
      ) : null}
    </SettingsLayout>
  );
}
