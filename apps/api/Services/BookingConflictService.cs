using SplitRail.Api.DTOs.Booking;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models.Enums;

namespace SplitRail.Api.Services;

public enum BookingConflictAction
{
    CreateHold,
    CreateConfirmed,
    PromoteToConfirmed
}

public readonly record struct ActivePlacement(Guid EventId, BookingPlacementStatus Status);

public class BookingConflictService
{
    public BookingPlacementStatus ResolveHoldTier(IReadOnlyList<ActivePlacement> placements)
    {
        var active = GetActivePlacements(placements);

        if (active.Count == 0)
            return BookingPlacementStatus.Hold1;

        if (active.Count == 1 && active[0].Status == BookingPlacementStatus.Hold1)
            return BookingPlacementStatus.Hold2;

        if (active.Any(p => p.Status == BookingPlacementStatus.Confirmed)
            && !active.Any(p => p.Status == BookingPlacementStatus.Hold2))
            return BookingPlacementStatus.Hold2;

        throw new BookingConflictException("No hold tier is available on this date.");
    }

    public void ValidateAction(
        IReadOnlyList<ActivePlacement> placements,
        BookingConflictAction action,
        Guid? excludeEventId = null)
    {
        var active = GetActivePlacements(placements, excludeEventId);

        switch (action)
        {
            case BookingConflictAction.CreateHold:
                ValidateCreateHold(active);
                break;
            case BookingConflictAction.CreateConfirmed:
                ValidateCreateConfirmed(active);
                break;
            case BookingConflictAction.PromoteToConfirmed:
                ValidatePromoteToConfirmed(active);
                break;
            default:
                throw new ArgumentOutOfRangeException(nameof(action));
        }
    }

    private static void ValidateCreateHold(IReadOnlyList<ActivePlacement> active)
    {
        if (active.Count == 0)
            return;

        if (active.Count == 1 && active[0].Status == BookingPlacementStatus.Hold1)
            return;

        if (active.Any(p => p.Status == BookingPlacementStatus.Confirmed)
            && !active.Any(p => p.Status == BookingPlacementStatus.Hold2))
            return;

        throw new BookingConflictException("A hold cannot be created on this date.");
    }

    private static void ValidateCreateConfirmed(IReadOnlyList<ActivePlacement> active)
    {
        if (active.Any(p => p.Status == BookingPlacementStatus.Confirmed))
            throw new BookingConflictException("A confirmed booking already exists on this date.");

        if (active.Count == 2
            && active.Any(p => p.Status == BookingPlacementStatus.Hold1)
            && active.Any(p => p.Status == BookingPlacementStatus.Hold2))
            return;

        if (active.Count == 1
            && (active[0].Status == BookingPlacementStatus.Hold1
                || active[0].Status == BookingPlacementStatus.Hold2))
            return;

        if (active.Count == 0)
            return;

        throw new BookingConflictException("A confirmed booking cannot be created on this date.");
    }

    private static void ValidatePromoteToConfirmed(IReadOnlyList<ActivePlacement> active)
    {
        if (active.Any(p => p.Status == BookingPlacementStatus.Confirmed))
            throw new BookingConflictException("A confirmed booking already exists on this date.");
    }

    private static List<ActivePlacement> GetActivePlacements(
        IReadOnlyList<ActivePlacement> placements,
        Guid? excludeEventId = null)
    {
        return placements
            .Where(p => p.Status is BookingPlacementStatus.Hold1
                or BookingPlacementStatus.Hold2
                or BookingPlacementStatus.Confirmed)
            .Where(p => excludeEventId is null || p.EventId != excludeEventId)
            .ToList();
    }
}
