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
    bool CanViewFinancials,
    bool CanManageFestivalSchedule,
    bool CanManageAllocations,
    bool CanAdjustSettlements,
    bool CanFinalizeSettlements,
    bool CanOverrideSettlements,
    bool CanPublishPublicItinerary);

public record UpdateRoleRequest(
    bool? CanManagePermissions,
    bool? CanLockBudget,
    bool? CanEditSettlement,
    bool? CanSignSettlement,
    bool? CanReverseSettlement,
    bool? CanTriggerQboSync,
    bool? CanMapQboAccounts,
    bool? CanViewFinancials,
    bool? CanManageFestivalSchedule = null,
    bool? CanManageAllocations = null,
    bool? CanAdjustSettlements = null,
    bool? CanFinalizeSettlements = null,
    bool? CanOverrideSettlements = null,
    bool? CanPublishPublicItinerary = null);
