using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using SplitRail.Api.Data;
using SplitRail.Api.Services;

namespace SplitRail.Api.Authorization;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public sealed class RequirePermissionAttribute : AuthorizeAttribute
{
    public RequirePermissionAttribute(string permission)
    {
        Policy = $"Permission:{permission}";
    }
}

public sealed class PermissionRequirement : IAuthorizationRequirement
{
    public PermissionRequirement(string permission) => Permission = permission;
    public string Permission { get; }
}

public class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    private readonly ApplicationDbContext _db;
    private readonly ITenantContext _tenantContext;

    public PermissionAuthorizationHandler(ApplicationDbContext db, ITenantContext tenantContext)
    {
        _db = db;
        _tenantContext = tenantContext;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        if (_tenantContext.UserId is not Guid userId || _tenantContext.OrganizationId is not Guid orgId)
            return;

        var role = await _db.UserOrganizationMappings
            .AsNoTracking()
            .Include(m => m.Role)
            .Where(m => m.UserId == userId && m.OrganizationId == orgId)
            .Select(m => m.Role)
            .FirstOrDefaultAsync();

        if (role is null)
            return;

        var hasPermission = requirement.Permission switch
        {
            PermissionNames.ManagePermissions => role.CanManagePermissions,
            PermissionNames.LockBudget => role.CanLockBudget,
            PermissionNames.EditSettlement => role.CanEditSettlement,
            PermissionNames.SignSettlement => role.CanSignSettlement,
            PermissionNames.TriggerQboSync => role.CanTriggerQboSync,
            PermissionNames.MapQboAccounts => role.CanMapQboAccounts,
            PermissionNames.ViewFinancials => role.CanViewFinancials,
            _ => false
        };

        if (hasPermission)
            context.Succeed(requirement);
    }
}
