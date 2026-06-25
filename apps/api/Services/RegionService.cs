using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Regions;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;

namespace SplitRail.Api.Services;

public class RegionService
{
    private readonly ApplicationDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<RegionService> _logger;

    public RegionService(
        ApplicationDbContext db,
        ITenantContext tenantContext,
        ILogger<RegionService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    public async Task<IReadOnlyList<RegionResponse>> ListRegionsAsync(CancellationToken cancellationToken = default)
    {
        if (_tenantContext.OrganizationId is not Guid orgId)
            throw new AuthorizationException();

        return await _db.Regions
            .AsNoTracking()
            .Where(r => r.OrganizationId == orgId)
            .OrderBy(r => r.Name)
            .Select(r => new RegionResponse(
                r.Id,
                r.Name,
                r.Notes,
                r.OrganizationId,
                r.CreatedAt,
                r.Venues.Count))
            .ToListAsync(cancellationToken);
    }

    public async Task<RegionResponse> CreateRegionAsync(
        CreateRegionRequest request,
        CancellationToken cancellationToken = default)
    {
        if (_tenantContext.OrganizationId is not Guid orgId)
            throw new AuthorizationException();

        var name = NameValidation.Normalize(request.Name, "Region name");

        if (await _db.Regions.AnyAsync(r => r.OrganizationId == orgId && r.Name == name, cancellationToken))
            throw new ConflictException("A region with this name already exists.");

        var region = new Region
        {
            OrganizationId = orgId,
            Name = name,
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
        };

        _db.Regions.Add(region);
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Region {RegionId} created in org {OrgId}", region.Id, orgId);

        return ToRegionResponse(region, 0);
    }

    public async Task<RegionResponse> UpdateRegionAsync(
        Guid regionId,
        UpdateRegionRequest request,
        CancellationToken cancellationToken = default)
    {
        if (_tenantContext.OrganizationId is not Guid orgId)
            throw new AuthorizationException();

        var name = NameValidation.Normalize(request.Name, "Region name");

        var region = await _db.Regions
            .Include(r => r.Venues)
            .FirstOrDefaultAsync(r => r.Id == regionId && r.OrganizationId == orgId, cancellationToken)
            ?? throw new NotFoundException("Region not found.");

        if (await _db.Regions.AnyAsync(
                r => r.OrganizationId == orgId && r.Name == name && r.Id != regionId,
                cancellationToken))
            throw new ConflictException("A region with this name already exists.");

        region.Name = name;
        region.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
        await _db.SaveChangesAsync(cancellationToken);

        return ToRegionResponse(region, region.Venues.Count);
    }

    public async Task DeleteRegionAsync(Guid regionId, CancellationToken cancellationToken = default)
    {
        if (_tenantContext.OrganizationId is not Guid orgId)
            throw new AuthorizationException();

        var region = await _db.Regions
            .Include(r => r.Venues)
            .FirstOrDefaultAsync(r => r.Id == regionId && r.OrganizationId == orgId, cancellationToken)
            ?? throw new NotFoundException("Region not found.");

        if (region.Venues.Count > 0)
            throw new ConflictException("Region has assigned venues. Reassign venues before deleting.");

        _db.Regions.Remove(region);
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Region {RegionId} deleted", regionId);
    }

    private static RegionResponse ToRegionResponse(Region region, int venueCount) =>
        new(region.Id, region.Name, region.Notes, region.OrganizationId, region.CreatedAt, venueCount);
}
