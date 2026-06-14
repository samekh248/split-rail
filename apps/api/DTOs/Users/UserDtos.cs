namespace SplitRail.Api.DTOs.Users;

public record RoleSummaryDto(Guid Id, string RoleName);
public record PermissionsDto(
    bool CanManagePermissions,
    bool CanLockBudget,
    bool CanEditSettlement,
    bool CanSignSettlement,
    bool CanTriggerQboSync,
    bool CanMapQboAccounts,
    bool CanViewFinancials);

public record RoleDetailDto(Guid Id, string RoleName, PermissionsDto Permissions);
public record OrganizationSummaryDto(Guid Id, string Name);
public record VenueScopeDto(Guid VenueId, string VenueName);

public record UserProfileResponse(
    Guid Id,
    string Email,
    OrganizationSummaryDto? Organization,
    RoleDetailDto? Role,
    IReadOnlyList<VenueScopeDto> VenueScopes);

public record UserListResponse(
    Guid Id,
    string Email,
    RoleSummaryDto Role,
    IReadOnlyList<VenueScopeDto> VenueScopes);

public record ChangeRoleRequest(Guid RoleId);
public record ChangeRoleResponse(Guid UserId, Guid RoleId, string RoleName);
public record UpdateVenueScopesRequest(IReadOnlyList<Guid> VenueIds);
public record UpdateVenueScopesResponse(Guid UserId, IReadOnlyList<VenueScopeDto> VenueScopes);
