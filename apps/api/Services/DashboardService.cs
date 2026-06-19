using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Dashboard;
using SplitRail.Api.DTOs.Ledger;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;

namespace SplitRail.Api.Services;

public class DashboardService
{
    private readonly ApplicationDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly VenueService _venueService;
    private readonly ILogger<DashboardService> _logger;

    public DashboardService(
        ApplicationDbContext db,
        ITenantContext tenantContext,
        VenueService venueService,
        ILogger<DashboardService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _venueService = venueService;
        _logger = logger;
    }

    public async Task<DashboardResponse> GetDashboardAsync(
        Guid venueId,
        CancellationToken cancellationToken = default)
    {
        if (_tenantContext.UserId is not Guid userId)
            throw new AuthenticationException();

        if (!await _venueService.IsVenueAccessibleAsync(userId, venueId, cancellationToken))
            throw new NotFoundException("Venue not found.");

        var events = await _db.Events
            .AsNoTracking()
            .Include(e => e.LineItems)
            .Include(e => e.UnmappedQboTransactions)
            .Include(e => e.QboSyncLedgerEntries)
            .Include(e => e.UserEventPins.Where(p => p.UserId == userId))
            .Where(e => e.VenueId == venueId)
            .ToListAsync(cancellationToken);

        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var cards = events
            .Select(e => ToEventCardDto(e))
            .ToList();

        var tonight = cards.Where(c => ParseEventDate(c.EventDate) == today).ToList();
        var pinned = cards.Where(c => c.IsPinned).ToList();
        var recent = cards
            .Where(c =>
            {
                var date = ParseEventDate(c.EventDate);
                return date >= today.AddDays(-7) && date < today;
            })
            .OrderByDescending(c => c.EventDate)
            .ToList();
        var upcoming = cards
            .Where(c =>
            {
                var date = ParseEventDate(c.EventDate);
                return date > today && date <= today.AddDays(30);
            })
            .OrderBy(c => c.EventDate)
            .ToList();

        _logger.LogInformation(
            "Dashboard loaded for venue {VenueId}: tonight={Tonight}, pinned={Pinned}, recent={Recent}, upcoming={Upcoming}",
            venueId,
            tonight.Count,
            pinned.Count,
            recent.Count,
            upcoming.Count);

        return new DashboardResponse(venueId, tonight, pinned, recent, upcoming);
    }

    private static EventCardDto ToEventCardDto(Event evt)
    {
        var isPinned = evt.UserEventPins.Count > 0;
        var lastSyncedAt = evt.QboSyncLedgerEntries.Count > 0
            ? evt.QboSyncLedgerEntries.Max(l => l.SyncedAt)
            : (DateTimeOffset?)null;

        return new EventCardDto(
            evt.Id,
            evt.VenueId,
            evt.Title,
            evt.EventDate.ToString("yyyy-MM-dd"),
            EventStatusFormat.ToApiString(evt.Status),
            evt.IsBudgetLocked,
            evt.QboTagName,
            evt.SettledAt,
            !string.IsNullOrWhiteSpace(evt.SettlementPdfUrl),
            isPinned,
            LedgerVarianceHelper.HasVarianceConcern(evt.LineItems),
            evt.UnmappedQboTransactions.Count,
            lastSyncedAt);
    }

    private static DateOnly ParseEventDate(string eventDate) =>
        DateOnly.Parse(eventDate);
}
