namespace SplitRail.Api.Exceptions;

public sealed class BookingConflictException : ApiException
{
    public BookingConflictException(
        string message,
        Guid? conflictingPlacementId = null,
        string? suggestedHoldTier = null)
        : base(message)
    {
        ConflictingPlacementId = conflictingPlacementId;
        SuggestedHoldTier = suggestedHoldTier;
    }

    public Guid? ConflictingPlacementId { get; }
    public string? SuggestedHoldTier { get; }
}
