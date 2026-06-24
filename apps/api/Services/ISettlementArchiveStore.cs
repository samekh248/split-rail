namespace SplitRail.Api.Services;

public interface ISettlementArchiveStore
{
    Task UploadAsync(string objectPath, byte[] pdfBytes, CancellationToken cancellationToken = default);

    Task StageAsync(string stagingPath, byte[] pdfBytes, CancellationToken cancellationToken = default);

    Task PromoteAsync(string stagingPath, string finalPath, CancellationToken cancellationToken = default);

    Task DeleteStagedAsync(string stagingPath, CancellationToken cancellationToken = default);

    Task<(string Url, DateTimeOffset ExpiresAt)> CreateSignedUrlAsync(
        string objectPath,
        TimeSpan ttl,
        CancellationToken cancellationToken = default);

    Task<DateTimeOffset?> GetRetentionUntilAsync(
        string objectPath,
        CancellationToken cancellationToken = default);

    byte[]? TryGetStoredPdf(string objectPath) => null;
}
