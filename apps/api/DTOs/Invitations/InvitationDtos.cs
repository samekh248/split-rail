namespace SplitRail.Api.DTOs.Invitations;

public record CreateInvitationRequest(string Email, Guid RoleId, IReadOnlyList<Guid>? VenueIds);
public record InvitationResponse(Guid Id, string Email, string RoleName, string Status, DateTimeOffset ExpiresAt, DateTimeOffset CreatedAt);
public record AcceptInvitationRequest(string Token, string? Password);
public record AcceptInvitationResponse(string AccessToken, string RefreshToken, int ExpiresIn, Guid OrganizationId);
