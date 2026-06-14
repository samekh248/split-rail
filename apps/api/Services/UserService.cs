using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Users;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;
using SplitRail.Api.Services;

namespace SplitRail.Api.Services;

public class UserService
{
    private readonly ApplicationDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<UserService> _logger;

    public UserService(ApplicationDbContext db, ITenantContext tenantContext, ILogger<UserService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    public async Task<UserProfileResponse> GetProfileAsync(CancellationToken cancellationToken = default)
    {
        if (_tenantContext.UserId is not Guid userId)
            throw new AuthenticationException();

        var user = await _db.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken)
            ?? throw new NotFoundException("User not found.");

        if (_tenantContext.OrganizationId is not Guid orgId)
        {
            return new UserProfileResponse(user.Id, user.Email, null, null, []);
        }

        var mapping = await _db.UserOrganizationMappings
            .AsNoTracking()
            .Include(m => m.Organization)
            .Include(m => m.Role)
            .FirstOrDefaultAsync(m => m.UserId == userId && m.OrganizationId == orgId, cancellationToken);

        if (mapping is null)
            throw new AuthorizationException("User is not a member of this organization.");

        var venueScopes = await GetVenueScopesAsync(userId, orgId, cancellationToken);

        return new UserProfileResponse(
            user.Id,
            user.Email,
            new OrganizationSummaryDto(mapping.Organization.Id, mapping.Organization.Name),
            ToRoleDetail(mapping.Role),
            venueScopes);
    }

    public async Task<IReadOnlyList<UserListResponse>> ListOrgUsersAsync(CancellationToken cancellationToken = default)
    {
        if (_tenantContext.OrganizationId is not Guid orgId)
            throw new AuthorizationException("User is not a member of an organization.");

        var mappings = await _db.UserOrganizationMappings
            .AsNoTracking()
            .Include(m => m.User)
            .Include(m => m.Role)
            .Where(m => m.OrganizationId == orgId)
            .ToListAsync(cancellationToken);

        var results = new List<UserListResponse>();
        foreach (var mapping in mappings)
        {
            var scopes = await GetVenueScopesAsync(mapping.UserId, orgId, cancellationToken);
            results.Add(new UserListResponse(
                mapping.User.Id,
                mapping.User.Email,
                new RoleSummaryDto(mapping.Role.Id, mapping.Role.RoleName),
                scopes));
        }

        return results;
    }

    public async Task<ChangeRoleResponse> ChangeUserRoleAsync(
        Guid targetUserId,
        ChangeRoleRequest request,
        CancellationToken cancellationToken = default)
    {
        if (_tenantContext.OrganizationId is not Guid orgId)
            throw new AuthorizationException();

        var mapping = await _db.UserOrganizationMappings
            .Include(m => m.Role)
            .FirstOrDefaultAsync(m => m.UserId == targetUserId && m.OrganizationId == orgId, cancellationToken)
            ?? throw new NotFoundException("User not found in organization.");

        var newRole = await _db.OrganizationRoles
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == request.RoleId && r.OrganizationId == orgId, cancellationToken)
            ?? throw new NotFoundException("Role not found.");

        if (mapping.Role.RoleName == RoleNames.Admin && newRole.RoleName != RoleNames.Admin)
            await EnsureNotLastAdminAsync(orgId, targetUserId, cancellationToken);

        mapping.RoleId = newRole.Id;
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("User {UserId} role changed to {RoleName} in org {OrgId}",
            targetUserId, newRole.RoleName, orgId);

        return new ChangeRoleResponse(targetUserId, newRole.Id, newRole.RoleName);
    }

    public async Task<UpdateVenueScopesResponse> UpdateVenueScopesAsync(
        Guid targetUserId,
        UpdateVenueScopesRequest request,
        CancellationToken cancellationToken = default)
    {
        if (_tenantContext.OrganizationId is not Guid orgId)
            throw new AuthorizationException();

        var mappingExists = await _db.UserOrganizationMappings
            .AnyAsync(m => m.UserId == targetUserId && m.OrganizationId == orgId, cancellationToken);
        if (!mappingExists)
            throw new NotFoundException("User not found in organization.");

        if (request.VenueIds.Count > 0)
        {
            var validVenueCount = await _db.Venues
                .CountAsync(v => request.VenueIds.Contains(v.Id) && v.OrganizationId == orgId, cancellationToken);
            if (validVenueCount != request.VenueIds.Count)
                throw new ValidationException("One or more venue IDs are invalid.");
        }

        var existing = await _db.UserVenueScopes
            .Where(s => s.UserId == targetUserId)
            .ToListAsync(cancellationToken);

        var orgVenueIds = await _db.Venues
            .Where(v => v.OrganizationId == orgId)
            .Select(v => v.Id)
            .ToListAsync(cancellationToken);

        _db.UserVenueScopes.RemoveRange(existing.Where(s => orgVenueIds.Contains(s.VenueId)));

        foreach (var venueId in request.VenueIds.Distinct())
        {
            _db.UserVenueScopes.Add(new UserVenueScope
            {
                UserId = targetUserId,
                VenueId = venueId
            });
        }

        await _db.SaveChangesAsync(cancellationToken);

        var scopes = await GetVenueScopesAsync(targetUserId, orgId, cancellationToken);
        return new UpdateVenueScopesResponse(targetUserId, scopes);
    }

    public async Task RemoveUserFromOrgAsync(Guid targetUserId, CancellationToken cancellationToken = default)
    {
        if (_tenantContext.OrganizationId is not Guid orgId)
            throw new AuthorizationException();

        var mapping = await _db.UserOrganizationMappings
            .Include(m => m.Role)
            .FirstOrDefaultAsync(m => m.UserId == targetUserId && m.OrganizationId == orgId, cancellationToken)
            ?? throw new NotFoundException("User not found in organization.");

        if (mapping.Role.RoleName == RoleNames.Admin)
            await EnsureNotLastAdminAsync(orgId, targetUserId, cancellationToken);

        var orgVenueIds = await _db.Venues
            .Select(v => v.Id)
            .ToListAsync(cancellationToken);

        var scopes = await _db.UserVenueScopes
            .Where(s => s.UserId == targetUserId && orgVenueIds.Contains(s.VenueId))
            .ToListAsync(cancellationToken);

        _db.UserVenueScopes.RemoveRange(scopes);
        _db.UserOrganizationMappings.Remove(mapping);
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("User {UserId} removed from org {OrgId}", targetUserId, orgId);
    }

    private async Task EnsureNotLastAdminAsync(Guid orgId, Guid targetUserId, CancellationToken cancellationToken)
    {
        var adminCount = await _db.UserOrganizationMappings
            .Include(m => m.Role)
            .CountAsync(m => m.OrganizationId == orgId && m.Role.RoleName == RoleNames.Admin, cancellationToken);

        var targetIsAdmin = await _db.UserOrganizationMappings
            .Include(m => m.Role)
            .AnyAsync(m => m.UserId == targetUserId && m.OrganizationId == orgId && m.Role.RoleName == RoleNames.Admin,
                cancellationToken);

        if (targetIsAdmin && adminCount <= 1)
            throw new LastAdminException();
    }

    private async Task<IReadOnlyList<VenueScopeDto>> GetVenueScopesAsync(
        Guid userId,
        Guid orgId,
        CancellationToken cancellationToken)
    {
        return await _db.UserVenueScopes
            .AsNoTracking()
            .Where(s => s.UserId == userId)
            .Join(_db.Venues.AsNoTracking(),
                s => s.VenueId,
                v => v.Id,
                (s, v) => new { s, v })
            .Where(x => x.v.OrganizationId == orgId)
            .Select(x => new VenueScopeDto(x.v.Id, x.v.Name))
            .ToListAsync(cancellationToken);
    }

    private static RoleDetailDto ToRoleDetail(OrganizationRole role) =>
        new(role.Id, role.RoleName, new PermissionsDto(
            role.CanManagePermissions,
            role.CanLockBudget,
            role.CanEditSettlement,
            role.CanSignSettlement,
            role.CanTriggerQboSync,
            role.CanMapQboAccounts,
            role.CanViewFinancials));
}
