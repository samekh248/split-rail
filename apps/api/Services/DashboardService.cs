using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Booking;
using SplitRail.Api.DTOs.Dashboard;
using SplitRail.Api.DTOs.Festivals;
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
    private readonly QboTokenService _tokenService;
    private readonly IQboPayloadFilter _payloadFilter;
    private readonly ILogger<DashboardService> _logger;

    public DashboardService(
        ApplicationDbContext db,
        ITenantContext tenantContext,
        VenueService venueService,
        QboTokenService tokenService,
        IQboPayloadFilter payloadFilter,
        ILogger<DashboardService> logger)
    {
        _db = db;
        _tenantContext = tenantContext;
        _venueService = venueService;
        _tokenService = tokenService;
        _payloadFilter = payloadFilter;
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
        var allCards = events
            .Select(ToEventCardDto)
            .ToList();
        var visibleEvents = events
            .Where(e => e.BookingPlacementStatus != BookingPlacementStatus.Cancelled)
            .ToList();
        var cards = visibleEvents
            .Select(ToEventCardDto)
            .ToList();

        DateOnly LastDay(EventCardDto card)
        {
            if (!string.IsNullOrWhiteSpace(card.EndDate)
                && DateOnly.TryParse(card.EndDate, out var end)
                && end >= ParseEventDate(card.EventDate))
            {
                return end;
            }

            return ParseEventDate(card.EventDate);
        }

        var tonight = cards.Where(c =>
        {
            var start = ParseEventDate(c.EventDate);
            return start <= today && LastDay(c) >= today;
        }).ToList();
        var pinned = cards.Where(c => c.IsPinned).ToList();
        var recent = cards
            .Where(c =>
            {
                var end = LastDay(c);
                return end >= today.AddDays(-7) && end < today;
            })
            .OrderByDescending(c => c.EndDate ?? c.EventDate)
            .ToList();
        var upcoming = cards
            .Where(c =>
            {
                var start = ParseEventDate(c.EventDate);
                return start > today && start <= today.AddDays(30);
            })
            .OrderBy(c => c.EventDate)
            .ToList();

        _logger.LogInformation(
            "Dashboard loaded for venue {VenueId}: tonight={Tonight}, pinned={Pinned}, recent={Recent}, upcoming={Upcoming}, unmapped={Unmapped}",
            venueId,
            tonight.Count,
            pinned.Count,
            recent.Count,
            upcoming.Count,
            cards.Sum(c => c.UnmappedCount));

        var actionCenter = BuildActionCenter(allCards);
        var financialHealth = DashboardFinancialHealthHelper.BuildFinancialHealthDto(events, today);
        var connected = await _tokenService.IsConnectedAsync(venueId, cancellationToken);
        var pinnedPerformances = await LoadPinnedPerformancesAsync(venueId, userId, cancellationToken);

        return _payloadFilter.Apply(
            new DashboardResponse(
                venueId,
                tonight,
                pinned,
                recent,
                upcoming,
                actionCenter,
                financialHealth,
                pinnedPerformances),
            connected);
    }

    private async Task<IReadOnlyList<PinnedPerformanceDto>> LoadPinnedPerformancesAsync(
        Guid venueId,
        Guid userId,
        CancellationToken cancellationToken) =>
        await _db.UserProgrammingBlockPins
            .AsNoTracking()
            .Where(p => p.UserId == userId && p.ProgrammingBlock.Event.VenueId == venueId)
            .OrderByDescending(p => p.PinnedAt)
            .Select(p => new PinnedPerformanceDto(
                p.ProgrammingBlockId,
                p.ProgrammingBlock.EventId,
                p.ProgrammingBlock.Event.VenueId,
                p.ProgrammingBlock.Event.Title,
                p.ProgrammingBlock.Title,
                p.ProgrammingBlock.DayDate.ToString("yyyy-MM-dd"),
                p.ProgrammingBlock.StartTime.ToString("HH:mm"),
                p.ProgrammingBlock.EndTime.ToString("HH:mm"),
                p.ProgrammingBlock.StageZone.Name,
                p.ProgrammingBlock.FestivalArtist != null ? p.ProgrammingBlock.FestivalArtist.Name : null,
                true))
            .ToListAsync(cancellationToken);

    private static ActionCenterDto BuildActionCenter(IReadOnlyList<EventCardDto> cards)
    {
        var totalUnmapped = cards.Sum(c => c.UnmappedCount);
        var eventsWithUnmapped = cards
            .Where(c => c.UnmappedCount > 0)
            .OrderByDescending(c => c.UnmappedCount)
            .ThenBy(c => c.EventDate)
            .Select(c => new UnmappedEventSummaryDto(
                c.EventId,
                c.VenueId,
                c.Title,
                c.EventDate,
                c.UnmappedCount))
            .ToList();

        return new ActionCenterDto(totalUnmapped, eventsWithUnmapped);
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
            evt.ReconciledAt,
            evt.ReconciledByUserId,
            isPinned,
            LedgerVarianceHelper.HasVarianceConcern(evt.LineItems),
            evt.UnmappedQboTransactions.Count,
            lastSyncedAt,
            BookingPlacementStatusFormat.ToApiString(evt.BookingPlacementStatus),
            EventTypeFormat.ToApiString(evt.EventType),
            evt.EndDate?.ToString("yyyy-MM-dd"));
    }

    private static DateOnly ParseEventDate(string eventDate) =>
        DateOnly.Parse(eventDate);
}
