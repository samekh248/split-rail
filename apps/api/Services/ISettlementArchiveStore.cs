namespace SplitRail.Api.Services;

public interface ISettlementArchiveStore
{
    Task UploadAsync(string objectPath, byte[] pdfBytes, CancellationToken cancellationToken = default);

    Task<(string Url, DateTimeOffset ExpiresAt)> CreateSignedUrlAsync(
        string objectPath,
        TimeSpan ttl,
        CancellationToken cancellationToken = default);

    byte[]? TryGetStoredPdf(string objectPath) => null;
}
