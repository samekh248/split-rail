using Microsoft.EntityFrameworkCore;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Qbo;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;

namespace SplitRail.Api.Services;

public class QboTrackingMappingService
{
    private readonly ApplicationDbContext _db;
    private readonly VenueService _venueService;
    private readonly ITenantContext _tenantContext;

    public QboTrackingMappingService(
        ApplicationDbContext db,
        VenueService venueService,
        ITenantContext tenantContext)
    {
        _db = db;
        _venueService = venueService;
        _tenantContext = tenantContext;
    }

    public async Task<QboTrackingMappingsResponse> GetMappingsAsync(
        Guid venueId,
        CancellationToken cancellationToken = default)
    {
        await EnsureVenueAccessibleAsync(venueId, cancellationToken);

        var mappings = await _db.QboTrackingMappings
            .AsNoTracking()
            .Where(m => m.VenueId == venueId)
            .OrderBy(m => m.QboTrackingName)
            .ToListAsync(cancellationToken);

        var dtos = new List<QboTrackingMappingDto>();
        foreach (var mapping in mappings)
        {
            dtos.Add(await ToDtoAsync(mapping, cancellationToken));
        }

        return new QboTrackingMappingsResponse(venueId, dtos);
    }

    public async Task<QboTrackingMappingDto> CreateMappingAsync(
        Guid venueId,
        CreateTrackingMappingRequest request,
        CancellationToken cancellationToken = default)
    {
        await EnsureVenueAccessibleAsync(venueId, cancellationToken);
        var orgId = await GetVenueOrganizationIdAsync(venueId, cancellationToken);
        await ValidateTargetAsync(venueId, orgId, request.TargetTier, request.TargetEntityId, cancellationToken);

        var mapping = new QboTrackingMapping
        {
            OrganizationId = orgId,
            VenueId = venueId,
            QboTrackingType = request.QboTrackingType,
            QboTrackingId = request.QboTrackingId,
            QboTrackingName = request.QboTrackingName,
            TargetTier = request.TargetTier,
            TargetEntityId = request.TargetEntityId,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _db.QboTrackingMappings.Add(mapping);
        await _db.SaveChangesAsync(cancellationToken);
        return await ToDtoAsync(mapping, cancellationToken);
    }

    public async Task<QboTrackingMappingDto> UpdateMappingAsync(
        Guid venueId,
        Guid mappingId,
        UpdateTrackingMappingRequest request,
        CancellationToken cancellationToken = default)
    {
        await EnsureVenueAccessibleAsync(venueId, cancellationToken);

        var mapping = await _db.QboTrackingMappings
            .FirstOrDefaultAsync(m => m.Id == mappingId && m.VenueId == venueId, cancellationToken)
            ?? throw new NotFoundException("Tracking mapping not found.");

        await ValidateTargetAsync(
            venueId,
            mapping.OrganizationId,
            request.TargetTier,
            request.TargetEntityId,
            cancellationToken);

        mapping.TargetTier = request.TargetTier;
        mapping.TargetEntityId = request.TargetEntityId;
        await _db.SaveChangesAsync(cancellationToken);
        return await ToDtoAsync(mapping, cancellationToken);
    }

    public async Task DeleteMappingAsync(
        Guid venueId,
        Guid mappingId,
        CancellationToken cancellationToken = default)
    {
        await EnsureVenueAccessibleAsync(venueId, cancellationToken);

        var mapping = await _db.QboTrackingMappings
            .FirstOrDefaultAsync(m => m.Id == mappingId && m.VenueId == venueId, cancellationToken)
            ?? throw new NotFoundException("Tracking mapping not found.");

        _db.QboTrackingMappings.Remove(mapping);
        await _db.SaveChangesAsync(cancellationToken);
    }

    public async Task<string?> ResolveTrackingNameForEventAsync(
        Guid eventId,
        CancellationToken cancellationToken = default)
    {
        var evt = await _db.Events
            .AsNoTracking()
            .Include(e => e.Venue)
            .FirstOrDefaultAsync(e => e.Id == eventId, cancellationToken);

        if (evt is null)
            return null;

        var eventMapping = await _db.QboTrackingMappings
            .AsNoTracking()
            .FirstOrDefaultAsync(m =>
                m.VenueId == evt.VenueId &&
                m.TargetTier == "Event" &&
                m.TargetEntityId == evt.Id,
                cancellationToken);
        if (eventMapping is not null)
            return eventMapping.QboTrackingName;

        var venueMapping = await _db.QboTrackingMappings
            .AsNoTracking()
            .FirstOrDefaultAsync(m =>
                m.VenueId == evt.VenueId &&
                m.TargetTier == "Venue" &&
                m.TargetEntityId == evt.VenueId,
                cancellationToken);
        if (venueMapping is not null)
            return venueMapping.QboTrackingName;

        if (evt.Venue.RegionId is Guid regionId)
        {
            var regionMapping = await _db.QboTrackingMappings
                .AsNoTracking()
                .FirstOrDefaultAsync(m =>
                    m.VenueId == evt.VenueId &&
                    m.TargetTier == "Region" &&
                    m.TargetEntityId == regionId,
                    cancellationToken);
            if (regionMapping is not null)
                return regionMapping.QboTrackingName;
        }

        return string.IsNullOrWhiteSpace(evt.QboTagName) ? null : evt.QboTagName;
    }

    private async Task<QboTrackingMappingDto> ToDtoAsync(
        QboTrackingMapping mapping,
        CancellationToken cancellationToken)
    {
        var displayName = await ResolveTargetDisplayNameAsync(
            mapping.TargetTier,
            mapping.TargetEntityId,
            cancellationToken);

        return new QboTrackingMappingDto(
            mapping.Id,
            mapping.QboTrackingType,
            mapping.QboTrackingId,
            mapping.QboTrackingName,
            mapping.TargetTier,
            mapping.TargetEntityId,
            displayName,
            mapping.CreatedAt);
    }

    private async Task<string?> ResolveTargetDisplayNameAsync(
        string targetTier,
        Guid targetEntityId,
        CancellationToken cancellationToken) =>
        targetTier switch
        {
            "Event" => await _db.Events
                .AsNoTracking()
                .Where(e => e.Id == targetEntityId)
                .Select(e => e.Title)
                .FirstOrDefaultAsync(cancellationToken),
            "Venue" => await _db.Venues
                .AsNoTracking()
                .Where(v => v.Id == targetEntityId)
                .Select(v => v.Name)
                .FirstOrDefaultAsync(cancellationToken),
            "Region" => await _db.Regions
                .AsNoTracking()
                .Where(r => r.Id == targetEntityId)
                .Select(r => r.Name)
                .FirstOrDefaultAsync(cancellationToken),
            _ => null
        };

    private async Task ValidateTargetAsync(
        Guid venueId,
        Guid organizationId,
        string targetTier,
        Guid targetEntityId,
        CancellationToken cancellationToken)
    {
        switch (targetTier)
        {
            case "Event":
                if (!await _db.Events.AnyAsync(
                        e => e.Id == targetEntityId && e.VenueId == venueId,
                        cancellationToken))
                    throw new ValidationException("Event target is not valid for this venue.");
                break;
            case "Venue":
                if (targetEntityId != venueId)
                    throw new ValidationException("Venue target must match the selected venue.");
                break;
            case "Region":
                if (!await _db.Regions.AnyAsync(
                        r => r.Id == targetEntityId && r.OrganizationId == organizationId,
                        cancellationToken))
                    throw new ValidationException("Region target is not valid for this organization.");
                break;
            default:
                throw new ValidationException("Target tier must be Region, Venue, or Event.");
        }
    }

    private async Task<Guid> GetVenueOrganizationIdAsync(Guid venueId, CancellationToken cancellationToken) =>
        await _db.Venues
            .AsNoTracking()
            .Where(v => v.Id == venueId)
            .Select(v => v.OrganizationId)
            .FirstAsync(cancellationToken);

    private async Task EnsureVenueAccessibleAsync(Guid venueId, CancellationToken cancellationToken)
    {
        if (_tenantContext.UserId is not Guid userId)
            throw new AuthenticationException();

        if (!await _venueService.IsVenueAccessibleAsync(userId, venueId, cancellationToken))
            throw new NotFoundException("Venue not found.");
    }
}
