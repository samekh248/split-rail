using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Venues;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;

namespace SplitRail.Api.Services;

public class VenueService
{
    private readonly ApplicationDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly ILogger<VenueService> _logger;

    public VenueService(ApplicationDbContext db, ITenantContext tenantContext, ILogger<VenueService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _logger = logger;
    }

    public async Task<IReadOnlyList<VenueResponse>> ListAccessibleVenuesAsync(CancellationToken cancellationToken = default)
    {
        if (_tenantContext.UserId is not Guid userId)
            throw new AuthenticationException();

        var venues = await GetAccessibleVenueQuery(userId).ToListAsync(cancellationToken);

        if (_tenantContext.ActiveVenueId is Guid activeVenueId)
            venues = venues.Where(v => v.Id == activeVenueId).ToList();

        return venues.Select(v => new VenueResponse(v.Id, v.Name, v.OrganizationId, v.CreatedAt, v.RegionId)).ToList();
    }

    public async Task<VenueResponse> CreateVenueAsync(CreateVenueRequest request, CancellationToken cancellationToken = default)
    {
        if (_tenantContext.OrganizationId is not Guid orgId)
            throw new AuthorizationException();

        var name = NameValidation.Normalize(request.Name, "Venue name");

        var venue = new Venue
        {
            OrganizationId = orgId,
            Name = name,
            RegionId = request.RegionId,
        };

        await ValidateRegionAssignmentAsync(orgId, request.RegionId, cancellationToken);

        _db.Venues.Add(venue);
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Venue {VenueId} created in org {OrgId}", venue.Id, orgId);

        return new VenueResponse(venue.Id, venue.Name, venue.OrganizationId, venue.CreatedAt, venue.RegionId);
    }

    public async Task<VenueResponse?> GetVenueByIdAsync(Guid venueId, CancellationToken cancellationToken = default)
    {
        if (_tenantContext.UserId is not Guid userId)
            throw new AuthenticationException();

        var venue = await GetAccessibleVenueQuery(userId)
            .FirstOrDefaultAsync(v => v.Id == venueId, cancellationToken);

        return venue is null
            ? null
            : new VenueResponse(venue.Id, venue.Name, venue.OrganizationId, venue.CreatedAt, venue.RegionId);
    }

    public async Task<VenueResponse> UpdateVenueAsync(
        Guid venueId,
        UpdateVenueRequest request,
        CancellationToken cancellationToken = default)
    {
        if (_tenantContext.UserId is not Guid userId)
            throw new AuthenticationException();

        var name = NameValidation.Normalize(request.Name, "Venue name");

        if (!await IsVenueAccessibleAsync(userId, venueId, cancellationToken))
            throw new NotFoundException("Venue not found.");

        var venue = await _db.Venues.FirstOrDefaultAsync(v => v.Id == venueId, cancellationToken)
            ?? throw new NotFoundException("Venue not found.");

        venue.Name = name;
        await ValidateRegionAssignmentAsync(venue.OrganizationId, request.RegionId, cancellationToken);
        venue.RegionId = request.RegionId;
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Venue {VenueId} updated", venue.Id);

        return new VenueResponse(venue.Id, venue.Name, venue.OrganizationId, venue.CreatedAt, venue.RegionId);
    }

    public async Task DeleteVenueAsync(Guid venueId, CancellationToken cancellationToken = default)
    {
        var venue = await _db.Venues.FirstOrDefaultAsync(v => v.Id == venueId, cancellationToken)
            ?? throw new NotFoundException("Venue not found.");

        _db.Venues.Remove(venue);
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Venue {VenueId} deleted", venueId);
    }

    public async Task<bool> IsVenueAccessibleAsync(Guid userId, Guid venueId, CancellationToken cancellationToken = default)
    {
        return await GetAccessibleVenueQuery(userId)
            .AnyAsync(v => v.Id == venueId, cancellationToken);
    }

    public IQueryable<Venue> GetAccessibleVenueQuery(Guid userId)
    {
        var hasScopes = _db.UserVenueScopes.Any(s => s.UserId == userId);

        return _db.Venues
            .AsNoTracking()
            .Where(v => !hasScopes || _db.UserVenueScopes.Any(s => s.UserId == userId && s.VenueId == v.Id));
    }

    private async Task ValidateRegionAssignmentAsync(
        Guid orgId,
        Guid? regionId,
        CancellationToken cancellationToken)
    {
        var orgHasRegions = await _db.Regions.AnyAsync(r => r.OrganizationId == orgId, cancellationToken);
        if (orgHasRegions && regionId is null)
            throw new ValidationException("Region is required when the organization has regions.");

        if (regionId is Guid region)
        {
            var exists = await _db.Regions.AnyAsync(
                r => r.Id == region && r.OrganizationId == orgId,
                cancellationToken);
            if (!exists)
                throw new ValidationException("Region not found in this organization.");
        }
    }
}
