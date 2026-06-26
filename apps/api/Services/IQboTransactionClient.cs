namespace SplitRail.Api.Services;

public interface IQboTransactionClient
{
    Task<IReadOnlyList<QboFetchedTransaction>> FetchTransactionsByTagAsync(
        string accessToken,
        string realmId,
        string tagName,
        DateTimeOffset? updatedSince = null,
        CancellationToken cancellationToken = default);
}
