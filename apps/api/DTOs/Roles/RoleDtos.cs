namespace SplitRail.Api.DTOs.Roles;

public record RoleResponse(
    Guid Id,
    string RoleName,
    bool CanManagePermissions,
    bool CanLockBudget,
    bool CanEditSettlement,
    bool CanSignSettlement,
    bool CanReverseSettlement,
    bool CanTriggerQboSync,
    bool CanMapQboAccounts,
    bool CanViewFinancials);

public record UpdateRoleRequest(
    bool? CanManagePermissions,
    bool? CanLockBudget,
    bool? CanEditSettlement,
    bool? CanSignSettlement,
    bool? CanReverseSettlement,
    bool? CanTriggerQboSync,
    bool? CanMapQboAccounts,
    bool? CanViewFinancials);
