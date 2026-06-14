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

        return venues.Select(v => new VenueResponse(v.Id, v.Name, v.OrganizationId, v.CreatedAt)).ToList();
    }

    public async Task<VenueResponse> CreateVenueAsync(CreateVenueRequest request, CancellationToken cancellationToken = default)
    {
        if (_tenantContext.OrganizationId is not Guid orgId)
            throw new AuthorizationException();

        if (string.IsNullOrWhiteSpace(request.Name))
            throw new ValidationException("Venue name is required.");

        var venue = new Venue
        {
            OrganizationId = orgId,
            Name = request.Name.Trim()
        };

        _db.Venues.Add(venue);
        await _db.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Venue {VenueId} created in org {OrgId}", venue.Id, orgId);

        return new VenueResponse(venue.Id, venue.Name, venue.OrganizationId, venue.CreatedAt);
    }

    public async Task<VenueResponse?> GetVenueByIdAsync(Guid venueId, CancellationToken cancellationToken = default)
    {
        if (_tenantContext.UserId is not Guid userId)
            throw new AuthenticationException();

        var venue = await GetAccessibleVenueQuery(userId)
            .FirstOrDefaultAsync(v => v.Id == venueId, cancellationToken);

        return venue is null
            ? null
            : new VenueResponse(venue.Id, venue.Name, venue.OrganizationId, venue.CreatedAt);
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

    private IQueryable<Venue> GetAccessibleVenueQuery(Guid userId)
    {
        var hasScopes = _db.UserVenueScopes.Any(s => s.UserId == userId);

        return _db.Venues
            .AsNoTracking()
            .Where(v => !hasScopes || _db.UserVenueScopes.Any(s => s.UserId == userId && s.VenueId == v.Id));
    }
}
