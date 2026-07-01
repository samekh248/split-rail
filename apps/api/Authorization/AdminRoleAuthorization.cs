using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using SplitRail.Api.Data;
using SplitRail.Api.Services;

namespace SplitRail.Api.Authorization;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = false)]
public sealed class RequireAdminRoleAttribute : AuthorizeAttribute
{
    public RequireAdminRoleAttribute() => Policy = AdminRolePolicy.Name;
}

public static class AdminRolePolicy
{
    public const string Name = "AdminRole";
}

public sealed class AdminRoleRequirement : IAuthorizationRequirement;

public class AdminRoleAuthorizationHandler : AuthorizationHandler<AdminRoleRequirement>
{
    private readonly ApplicationDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<AdminRoleAuthorizationHandler> _logger;

    public AdminRoleAuthorizationHandler(
        ApplicationDbContext db,
        ITenantContext tenantContext,
        ILogger<AdminRoleAuthorizationHandler> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        AdminRoleRequirement requirement)
    {
        if (_tenantContext.UserId is not Guid userId || _tenantContext.OrganizationId is not Guid orgId)
            return;

        var roleName = await _db.UserOrganizationMappings
            .AsNoTracking()
            .Include(m => m.Role)
            .Where(m => m.UserId == userId && m.OrganizationId == orgId)
            .Select(m => m.Role.RoleName)
            .FirstOrDefaultAsync();

        if (roleName == RoleNames.Admin)
        {
            context.Succeed(requirement);
            return;
        }

        var httpContext = context.Resource as HttpContext;
        var path = httpContext?.Request.Path.Value ?? "unknown";
        _logger.LogWarning(
            "Rejected admin-only access: userId={UserId} organizationId={OrganizationId} path={Path} outcome=rejected-forbidden reason=admin-required",
            userId,
            orgId,
            path);
    }
}
