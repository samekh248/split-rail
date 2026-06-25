using SplitRail.Api.Models.Enums;

namespace SplitRail.Api.DTOs.Booking;

public static class BookingPlacementStatusFormat
{
    public static string ToApiString(BookingPlacementStatus status) => status switch
    {
        BookingPlacementStatus.Hold1 => "HOLD_1",
        BookingPlacementStatus.Hold2 => "HOLD_2",
        BookingPlacementStatus.Confirmed => "CONFIRMED",
        BookingPlacementStatus.Cancelled => "CANCELLED",
        _ => throw new ArgumentOutOfRangeException(nameof(status))
    };

    public static BookingPlacementStatus FromApiString(string value) => value switch
    {
        "HOLD_1" => BookingPlacementStatus.Hold1,
        "HOLD_2" => BookingPlacementStatus.Hold2,
        "CONFIRMED" => BookingPlacementStatus.Confirmed,
        "CANCELLED" => BookingPlacementStatus.Cancelled,
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, "Unknown booking placement status.")
    };

    public static bool TryFromApiString(string? value, out BookingPlacementStatus status)
    {
        if (value is null)
        {
            status = default;
            return false;
        }

        try
        {
            status = FromApiString(value);
            return true;
        }
        catch (ArgumentOutOfRangeException)
        {
            status = default;
            return false;
        }
    }
}
