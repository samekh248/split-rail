namespace SplitRail.Api.Models.Enums;

public enum BlockScheduleStatus
{
    Scheduled,
    Delayed,
    PartiallyCompleted,
    Canceled
}

public static class BlockScheduleStatusExtensions
{
    /// <summary>
    /// Active blocks participate in same-stage overlap validation and remain settlement-eligible.
    /// </summary>
    public static bool IsActive(this BlockScheduleStatus status) =>
        status is BlockScheduleStatus.Scheduled or BlockScheduleStatus.Delayed;
}
