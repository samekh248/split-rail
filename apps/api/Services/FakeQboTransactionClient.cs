namespace SplitRail.Api.Services;

/// <summary>
/// Hermetic read-only QBO connector for preview/E2E environments.
/// Returns deterministic actuals keyed by tag name; performs no outbound HTTP.
/// </summary>
public class FakeQboTransactionClient : IQboTransactionClient
{
    public const string LifecycleTagName = "EVENT-E2E-LIFECYCLE";
    public const string LifecycleAccountId = "E2E-ACCT-001";
    public const string LifecycleTransactionId = "E2E-TXN-001";

    private static readonly IReadOnlyDictionary<string, IReadOnlyList<QboFetchedTransaction>> SeedData =
        new Dictionary<string, IReadOnlyList<QboFetchedTransaction>>(StringComparer.OrdinalIgnoreCase)
        {
            [LifecycleTagName] =
            [
                new QboFetchedTransaction(
                    LifecycleTransactionId,
                    LifecycleAccountId,
                    "E2E Production Expense",
                    5100.00m,
                    DateOnly.FromDateTime(new DateTime(2026, 7, 4, 0, 0, 0, DateTimeKind.Utc)))
            ]
        };

    public Task<IReadOnlyList<QboFetchedTransaction>> FetchTransactionsByTagAsync(
        string accessToken,
        string realmId,
        string tagName,
        DateTimeOffset? updatedSince = null,
        CancellationToken cancellationToken = default)
    {
        if (!SeedData.TryGetValue(tagName, out var transactions))
            return Task.FromResult<IReadOnlyList<QboFetchedTransaction>>([]);

        if (updatedSince is null)
            return Task.FromResult(transactions);

        var sinceDate = DateOnly.FromDateTime(updatedSince.Value.UtcDateTime);
        var filtered = transactions
            .Where(txn => txn.TransactionDate >= sinceDate)
            .ToList();
        return Task.FromResult<IReadOnlyList<QboFetchedTransaction>>(filtered);
    }
}
