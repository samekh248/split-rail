using Microsoft.EntityFrameworkCore;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Booking;
using SplitRail.Api.DTOs.Calendar;
using SplitRail.Api.DTOs.Ledger;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models.Enums;

namespace SplitRail.Api.Services;

public class CalendarService
{
    private const int MaxDateSpanDays = 93;

    private readonly ApplicationDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly VenueService _venueService;

    public CalendarService(
        ApplicationDbContext db,
        ITenantContext tenantContext,
        VenueService venueService)
    {
        _db = db;
        _tenantContext = tenantContext;
        _venueService = venueService;
    }

    public async Task<IReadOnlyList<CalendarPlacementDto>> GetPlacementsAsync(
        string from,
        string to,
        Guid? regionId,
        Guid? venueId,
        bool includeCancelled,
        CancellationToken cancellationToken = default)
    {
        if (_tenantContext.UserId is not Guid userId)
            throw new AuthenticationException();

        if (!DateOnly.TryParse(from, out var fromDate) || !DateOnly.TryParse(to, out var toDate))
            throw new ValidationException("Invalid date range.");

        if (fromDate > toDate)
            throw new ValidationException("Invalid date range: from must be before to.");

        if (toDate.DayNumber - fromDate.DayNumber > MaxDateSpanDays)
            throw new ValidationException($"Date range cannot exceed {MaxDateSpanDays} days.");

        var accessibleVenueIds = await _venueService.GetAccessibleVenueQuery(userId)
            .Select(v => v.Id)
            .ToListAsync(cancellationToken);

        if (accessibleVenueIds.Count == 0)
            return [];

        var query = _db.Events
            .AsNoTracking()
            .Include(e => e.Venue)
            .ThenInclude(v => v.Region)
            .Include(e => e.LineItems)
            .Where(e => accessibleVenueIds.Contains(e.VenueId))
            .Where(e => e.EventDate >= fromDate && e.EventDate <= toDate);

        if (venueId is Guid venueFilter)
            query = query.Where(e => e.VenueId == venueFilter);

        if (regionId is Guid regionFilter)
            query = query.Where(e => e.Venue.RegionId == regionFilter);

        if (!includeCancelled)
            query = query.Where(e => e.BookingPlacementStatus != BookingPlacementStatus.Cancelled);

        var events = await query
            .OrderBy(e => e.EventDate)
            .ThenBy(e => e.Venue.Name)
            .ThenBy(e => e.DoorsTime)
            .ToListAsync(cancellationToken);

        return events.Select(ToCalendarPlacementDto).ToList();
    }

    private static CalendarPlacementDto ToCalendarPlacementDto(Models.Event evt)
    {
        var bookingStatus = BookingPlacementStatusFormat.ToApiString(evt.BookingPlacementStatus);
        var workspaceAllowed = evt.BookingPlacementStatus is not (BookingPlacementStatus.Hold1 or BookingPlacementStatus.Hold2);

        return new CalendarPlacementDto(
            evt.Id,
            evt.VenueId,
            evt.Venue.Name,
            evt.Venue.RegionId,
            evt.Venue.Region?.Name,
            evt.Title,
            evt.EventDate.ToString("yyyy-MM-dd"),
            bookingStatus,
            FormatTime(evt.DoorsTime),
            FormatTime(evt.LoadInTime),
            FormatTime(evt.CurfewTime),
            evt.SupportLineup,
            EventStatusFormat.ToApiString(evt.Status),
            evt.IsBudgetLocked,
            evt.QboTagName,
            evt.LineItems.Count > 0,
            workspaceAllowed);
    }

    private static string? FormatTime(TimeOnly? time) =>
        time?.ToString("HH:mm");
}
