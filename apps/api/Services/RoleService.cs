using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Roles;
using SplitRail.Api.Exceptions;

namespace SplitRail.Api.Services;

public class RoleService
{
    private readonly ApplicationDbContext _db;
    private readonly ILogger<RoleService> _logger;

    public RoleService(ApplicationDbContext db, ILogger<RoleService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<IReadOnlyList<RoleResponse>> ListRolesAsync(CancellationToken cancellationToken = default)
    {
        return await _db.OrganizationRoles
            .AsNoTracking()
            .OrderBy(r => r.RoleName)
            .Select(r => new RoleResponse(
                r.Id,
                r.RoleName,
                r.CanManagePermissions,
                r.CanLockBudget,
                r.CanEditSettlement,
                r.CanSignSettlement,
                r.CanReverseSettlement,
                r.CanTriggerQboSync,
                r.CanMapQboAccounts,
                r.CanViewFinancials))
            .ToListAsync(cancellationToken);
    }

    public async Task<RoleResponse> UpdateRoleAsync(
        Guid roleId,
        UpdateRoleRequest request,
        CancellationToken cancellationToken = default)
    {
        var role = await _db.OrganizationRoles
            .FirstOrDefaultAsync(r => r.Id == roleId, cancellationToken)
            ?? throw new NotFoundException("Role not found.");

        if (request.CanManagePermissions.HasValue) role.CanManagePermissions = request.CanManagePermissions.Value;
        if (request.CanLockBudget.HasValue) role.CanLockBudget = request.CanLockBudget.Value;
        if (request.CanEditSettlement.HasValue) role.CanEditSettlement = request.CanEditSettlement.Value;
        if (request.CanSignSettlement.HasValue) role.CanSignSettlement = request.CanSignSettlement.Value;
        if (request.CanReverseSettlement.HasValue) role.CanReverseSettlement = request.CanReverseSettlement.Value;
        if (request.CanTriggerQboSync.HasValue) role.CanTriggerQboSync = request.CanTriggerQboSync.Value;
        if (request.CanMapQboAccounts.HasValue) role.CanMapQboAccounts = request.CanMapQboAccounts.Value;
        if (request.CanViewFinancials.HasValue) role.CanViewFinancials = request.CanViewFinancials.Value;

        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Role {RoleId} permissions updated in org {OrgId}", role.Id, role.OrganizationId);

        return new RoleResponse(
            role.Id,
            role.RoleName,
            role.CanManagePermissions,
            role.CanLockBudget,
            role.CanEditSettlement,
            role.CanSignSettlement,
            role.CanReverseSettlement,
            role.CanTriggerQboSync,
            role.CanMapQboAccounts,
            role.CanViewFinancials);
    }
}
