namespace SplitRail.Api.Models.Enums;

public enum QboReviewState
{
    None,
    Untagged,
    MismatchedTag,
    ChangedAfterImport,
    StaleMapping,
    ReclassificationRequired
}

public static class QboReviewStateExtensions
{
    /// <summary>
    /// Transactions in any review state are held out of settlement-impacting allocation
    /// until a user with financial authority resolves them.
    /// </summary>
    public static bool RequiresReview(this QboReviewState state) => state != QboReviewState.None;
}
