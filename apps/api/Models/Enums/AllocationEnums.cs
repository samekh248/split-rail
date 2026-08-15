namespace SplitRail.Api.Models.Enums;

public enum AllocationMethod
{
    Equal,
    Percentage,
    FixedAmount,
    ManualLine
}

public enum RevenueAllocationType
{
    FixedAmount,
    PercentOfBucket
}

public enum AllocationTargetType
{
    Overhead,
    Day,
    Stage,
    Block
}

public enum PercentBasis
{
    Gross,
    Net
}
