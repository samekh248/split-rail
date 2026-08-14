using SplitRail.Api.Models.Enums;

namespace SplitRail.Api.DTOs.Festivals;

public static class EventTypeFormat
{
    public static string ToApiString(EventType value) => value switch
    {
        EventType.Standard => "STANDARD",
        EventType.Festival => "FESTIVAL",
        _ => throw new ArgumentOutOfRangeException(nameof(value))
    };

    public static EventType FromApiString(string value) => value switch
    {
        "STANDARD" => EventType.Standard,
        "FESTIVAL" => EventType.Festival,
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, "Unknown event type.")
    };
}

public static class BlockCategoryFormat
{
    public static string ToApiString(BlockCategory value) => value switch
    {
        BlockCategory.Music => "MUSIC",
        BlockCategory.Exhibition => "EXHIBITION",
        BlockCategory.Vendor => "VENDOR",
        BlockCategory.Experience => "EXPERIENCE",
        _ => throw new ArgumentOutOfRangeException(nameof(value))
    };

    public static BlockCategory FromApiString(string value) => value switch
    {
        "MUSIC" => BlockCategory.Music,
        "EXHIBITION" => BlockCategory.Exhibition,
        "VENDOR" => BlockCategory.Vendor,
        "EXPERIENCE" => BlockCategory.Experience,
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, "Unknown block category.")
    };

    public static bool TryFromApiString(string? value, out BlockCategory category)
    {
        if (value is null)
        {
            category = default;
            return false;
        }

        try
        {
            category = FromApiString(value);
            return true;
        }
        catch (ArgumentOutOfRangeException)
        {
            category = default;
            return false;
        }
    }
}

public static class BlockScheduleStatusFormat
{
    public static string ToApiString(BlockScheduleStatus value) => value switch
    {
        BlockScheduleStatus.Scheduled => "SCHEDULED",
        BlockScheduleStatus.Delayed => "DELAYED",
        BlockScheduleStatus.PartiallyCompleted => "PARTIALLY_COMPLETED",
        BlockScheduleStatus.Canceled => "CANCELED",
        _ => throw new ArgumentOutOfRangeException(nameof(value))
    };

    public static BlockScheduleStatus FromApiString(string value) => value switch
    {
        "SCHEDULED" => BlockScheduleStatus.Scheduled,
        "DELAYED" => BlockScheduleStatus.Delayed,
        "PARTIALLY_COMPLETED" => BlockScheduleStatus.PartiallyCompleted,
        "CANCELED" => BlockScheduleStatus.Canceled,
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, "Unknown block schedule status.")
    };

    public static bool TryFromApiString(string? value, out BlockScheduleStatus status)
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

public static class BlockBookingStatusFormat
{
    public static string ToApiString(BlockBookingStatus value) => value switch
    {
        BlockBookingStatus.Hold => "HOLD",
        BlockBookingStatus.Confirmed => "CONFIRMED",
        _ => throw new ArgumentOutOfRangeException(nameof(value))
    };

    public static BlockBookingStatus FromApiString(string value) => value switch
    {
        "HOLD" => BlockBookingStatus.Hold,
        "CONFIRMED" => BlockBookingStatus.Confirmed,
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, "Unknown block booking status.")
    };

    public static bool TryFromApiString(string? value, out BlockBookingStatus status)
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

public static class BlockSettlementStatusFormat
{
    public static string ToApiString(BlockSettlementStatus value) => value switch
    {
        BlockSettlementStatus.NotRequired => "NOT_REQUIRED",
        BlockSettlementStatus.Draft => "DRAFT",
        BlockSettlementStatus.Finalized => "FINALIZED",
        _ => throw new ArgumentOutOfRangeException(nameof(value))
    };

    public static BlockSettlementStatus FromApiString(string value) => value switch
    {
        "NOT_REQUIRED" => BlockSettlementStatus.NotRequired,
        "DRAFT" => BlockSettlementStatus.Draft,
        "FINALIZED" => BlockSettlementStatus.Finalized,
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, "Unknown block settlement status.")
    };
}

public static class PercentBasisFormat
{
    public static string ToApiString(PercentBasis value) => value switch
    {
        PercentBasis.Gross => "GROSS",
        PercentBasis.Net => "NET",
        _ => throw new ArgumentOutOfRangeException(nameof(value))
    };

    public static PercentBasis FromApiString(string value) => value switch
    {
        "GROSS" => PercentBasis.Gross,
        "NET" => PercentBasis.Net,
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, "Unknown percent basis.")
    };
}

public static class RevenueAllocationTypeFormat
{
    public static string ToApiString(RevenueAllocationType value) => value switch
    {
        RevenueAllocationType.FixedAmount => "FIXED_AMOUNT",
        RevenueAllocationType.PercentOfBucket => "PERCENT_OF_BUCKET",
        _ => throw new ArgumentOutOfRangeException(nameof(value))
    };

    public static RevenueAllocationType FromApiString(string value) => value switch
    {
        "FIXED_AMOUNT" => RevenueAllocationType.FixedAmount,
        "PERCENT_OF_BUCKET" => RevenueAllocationType.PercentOfBucket,
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, "Unknown revenue allocation type.")
    };
}

public static class AllocationMethodFormat
{
    public static string ToApiString(AllocationMethod value) => value switch
    {
        AllocationMethod.Equal => "EQUAL",
        AllocationMethod.Percentage => "PERCENTAGE",
        AllocationMethod.FixedAmount => "FIXED_AMOUNT",
        AllocationMethod.ManualLine => "MANUAL_LINE",
        _ => throw new ArgumentOutOfRangeException(nameof(value))
    };

    public static AllocationMethod FromApiString(string value) => value switch
    {
        "EQUAL" => AllocationMethod.Equal,
        "PERCENTAGE" => AllocationMethod.Percentage,
        "FIXED_AMOUNT" => AllocationMethod.FixedAmount,
        "MANUAL_LINE" => AllocationMethod.ManualLine,
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, "Unknown allocation method.")
    };
}

public static class AllocationTargetTypeFormat
{
    public static string ToApiString(AllocationTargetType value) => value switch
    {
        AllocationTargetType.Overhead => "OVERHEAD",
        AllocationTargetType.Day => "DAY",
        AllocationTargetType.Stage => "STAGE",
        AllocationTargetType.Block => "BLOCK",
        _ => throw new ArgumentOutOfRangeException(nameof(value))
    };

    public static AllocationTargetType FromApiString(string value) => value switch
    {
        "OVERHEAD" => AllocationTargetType.Overhead,
        "DAY" => AllocationTargetType.Day,
        "STAGE" => AllocationTargetType.Stage,
        "BLOCK" => AllocationTargetType.Block,
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, "Unknown allocation target type.")
    };
}

public static class BlockSettlementLineTypeFormat
{
    public static string ToApiString(BlockSettlementLineType value) => value switch
    {
        BlockSettlementLineType.Deduction => "DEDUCTION",
        BlockSettlementLineType.Adjustment => "ADJUSTMENT",
        BlockSettlementLineType.RoundingAdjustment => "ROUNDING_ADJUSTMENT",
        _ => throw new ArgumentOutOfRangeException(nameof(value))
    };

    public static BlockSettlementLineType FromApiString(string value) => value switch
    {
        "DEDUCTION" => BlockSettlementLineType.Deduction,
        "ADJUSTMENT" => BlockSettlementLineType.Adjustment,
        "ROUNDING_ADJUSTMENT" => BlockSettlementLineType.RoundingAdjustment,
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, "Unknown settlement line type.")
    };
}

public static class QboReviewStateFormat
{
    public static string ToApiString(QboReviewState value) => value switch
    {
        QboReviewState.None => "NONE",
        QboReviewState.Untagged => "UNTAGGED",
        QboReviewState.MismatchedTag => "MISMATCHED_TAG",
        QboReviewState.ChangedAfterImport => "CHANGED_AFTER_IMPORT",
        QboReviewState.StaleMapping => "STALE_MAPPING",
        QboReviewState.ReclassificationRequired => "RECLASSIFICATION_REQUIRED",
        _ => throw new ArgumentOutOfRangeException(nameof(value))
    };

    public static QboReviewState FromApiString(string value) => value switch
    {
        "NONE" => QboReviewState.None,
        "UNTAGGED" => QboReviewState.Untagged,
        "MISMATCHED_TAG" => QboReviewState.MismatchedTag,
        "CHANGED_AFTER_IMPORT" => QboReviewState.ChangedAfterImport,
        "STALE_MAPPING" => QboReviewState.StaleMapping,
        "RECLASSIFICATION_REQUIRED" => QboReviewState.ReclassificationRequired,
        _ => throw new ArgumentOutOfRangeException(nameof(value), value, "Unknown QBO review state.")
    };
}
