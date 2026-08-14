namespace SplitRail.Api.Models.Enums;

/// <summary>
/// Booking commitment for one artist appearance inside a festival. Mirrors the standard-event
/// <see cref="BookingPlacementStatus"/> concept at the block level, and is deliberately
/// independent of <see cref="BlockScheduleStatus"/> (day-of lifecycle) and
/// <see cref="BlockSettlementStatus"/> (money).
/// </summary>
public enum BlockBookingStatus
{
    Hold,
    Confirmed
}
