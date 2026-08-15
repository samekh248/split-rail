using Microsoft.EntityFrameworkCore;
using SplitRail.Api.Data;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;

namespace SplitRail.Api.Services;

/// <summary>
/// Shared scoping and permission gate for every festival service.
///
/// Two rules hold everywhere: a festival is only reachable through its wrapper Event's
/// venue within the caller's organization (Constitution II), and the six festival
/// permission layers never imply one another (spec FR-036). A user holding
/// FinalizeSettlements WITH stage assignments is confined to those stages; with no
/// assignments, org-level financial authority applies (research.md D10).
///
/// Cross-organization access always surfaces as NotFound so existence is never revealed.
/// </summary>
public class FestivalAccessGuard
{
    private readonly ApplicationDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly VenueService _venueService;

    public FestivalAccessGuard(
        ApplicationDbContext db,
        ITenantContext tenantContext,
        VenueService venueService)
    {
        _db = db;
        _tenantContext = tenantContext;
        _venueService = venueService;
    }

    public Guid RequireUserId() =>
        _tenantContext.UserId ?? throw new AuthenticationException();

    /// <summary>
    /// Resolves a festival wrapper scoped to the caller's organization and venue access.
    /// Tracked by default so callers can mutate; pass asNoTracking for read paths
    /// (Constitution VII).
    /// </summary>
    public async Task<Event> RequireFestivalAsync(
        Guid venueId,
        Guid eventId,
        bool asNoTracking = false,
        CancellationToken cancellationToken = default)
    {
        var userId = RequireUserId();

        if (!await _venueService.IsVenueAccessibleAsync(userId, venueId, cancellationToken))
            throw new NotFoundException("Festival not found.");

        var query = _db.Events.Where(e => e.Id == eventId && e.VenueId == venueId);
        if (asNoTracking)
            query = query.AsNoTracking();

        var festival = await query.FirstOrDefaultAsync(cancellationToken)
            ?? throw new NotFoundException("Festival not found.");

        if (festival.EventType != EventType.Festival)
            throw new ValidationException("This event is not a festival. Enable festival mode first.");

        return festival;
    }

    /// <summary>
    /// Same as <see cref="RequireFestivalAsync"/> but does not require festival mode —
    /// used by the standard-event conversion path.
    /// </summary>
    public async Task<Event> RequireEventAsync(
        Guid venueId,
        Guid eventId,
        CancellationToken cancellationToken = default)
    {
        var userId = RequireUserId();

        if (!await _venueService.IsVenueAccessibleAsync(userId, venueId, cancellationToken))
            throw new NotFoundException("Event not found.");

        return await _db.Events.FirstOrDefaultAsync(
                e => e.Id == eventId && e.VenueId == venueId,
                cancellationToken)
            ?? throw new NotFoundException("Event not found.");
    }

    public async Task<bool> HasPermissionAsync(
        Func<OrganizationRole, bool> predicate,
        CancellationToken cancellationToken = default)
    {
        if (_tenantContext.UserId is not Guid userId || _tenantContext.OrganizationId is not Guid orgId)
            return false;

        var role = await _db.UserOrganizationMappings
            .AsNoTracking()
            .Include(m => m.Role)
            .Where(m => m.UserId == userId && m.OrganizationId == orgId)
            .Select(m => m.Role)
            .FirstOrDefaultAsync(cancellationToken);

        return role is not null && predicate(role);
    }

    public async Task RequirePermissionAsync(
        Func<OrganizationRole, bool> predicate,
        string message,
        CancellationToken cancellationToken = default)
    {
        if (!await HasPermissionAsync(predicate, cancellationToken))
            throw new AuthorizationException(message);
    }

    // Named gates — one per permission layer, so call sites read as the rule they enforce.

    public Task RequireScheduleAuthorityAsync(CancellationToken cancellationToken = default) =>
        RequirePermissionAsync(
            r => r.CanManageFestivalSchedule,
            "Missing permission to manage the festival schedule.",
            cancellationToken);

    public Task RequireAllocationAuthorityAsync(CancellationToken cancellationToken = default) =>
        RequirePermissionAsync(
            r => r.CanManageAllocations,
            "Missing permission to manage festival revenue allocations.",
            cancellationToken);

    public Task RequireAdjustAuthorityAsync(CancellationToken cancellationToken = default) =>
        RequirePermissionAsync(
            r => r.CanAdjustSettlements,
            "Missing permission to adjust settlements.",
            cancellationToken);

    public Task RequireFinalizeAuthorityAsync(CancellationToken cancellationToken = default) =>
        RequirePermissionAsync(
            r => r.CanFinalizeSettlements,
            "Missing permission to finalize settlements.",
            cancellationToken);

    public Task RequireOverrideAuthorityAsync(CancellationToken cancellationToken = default) =>
        RequirePermissionAsync(
            r => r.CanOverrideSettlements,
            "Missing permission to override or reopen finalized settlements.",
            cancellationToken);

    public Task RequirePublishAuthorityAsync(CancellationToken cancellationToken = default) =>
        RequirePermissionAsync(
            r => r.CanPublishPublicItinerary,
            "Missing permission to publish the public itinerary.",
            cancellationToken);

    /// <summary>
    /// Full financial visibility gates the Master Festival Ledger and festival-wide reporting.
    /// Finalize authority alone never grants it (spec FR-035).
    /// </summary>
    public Task RequireFullFinancialVisibilityAsync(CancellationToken cancellationToken = default) =>
        RequirePermissionAsync(
            r => r.CanManageAllocations || r.CanOverrideSettlements,
            "Missing permission to view the master festival ledger.",
            cancellationToken);

    /// <summary>
    /// Stage ids the caller is explicitly assigned to within one festival. An empty result
    /// means "no stage restriction" — org-level authority applies.
    /// </summary>
    public async Task<IReadOnlyList<Guid>> GetAssignedStageIdsAsync(
        Guid eventId,
        CancellationToken cancellationToken = default)
    {
        var userId = RequireUserId();

        return await _db.StageZoneAssignments
            .AsNoTracking()
            .Where(a => a.UserId == userId && a.StageZone.EventId == eventId)
            .Select(a => a.StageZoneId)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// True when the caller may act on the given stage: either they hold no stage
    /// assignments for this festival (unrestricted), or the stage is among their assignments.
    /// </summary>
    public async Task<bool> CanAccessStageAsync(
        Guid eventId,
        Guid stageZoneId,
        CancellationToken cancellationToken = default)
    {
        var assigned = await GetAssignedStageIdsAsync(eventId, cancellationToken);
        return assigned.Count == 0 || assigned.Contains(stageZoneId);
    }

    public async Task RequireStageAccessAsync(
        Guid eventId,
        Guid stageZoneId,
        CancellationToken cancellationToken = default)
    {
        if (!await CanAccessStageAsync(eventId, stageZoneId, cancellationToken))
            throw new AuthorizationException("This stage is outside your assigned stages.");
    }
}
