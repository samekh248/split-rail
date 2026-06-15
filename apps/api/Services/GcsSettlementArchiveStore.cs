using Google.Cloud.Storage.V1;
using Google.Apis.Auth.OAuth2;
using Microsoft.Extensions.Options;
using SplitRail.Api.Configuration;
using SplitRail.Api.Exceptions;

namespace SplitRail.Api.Services;

public class GcsSettlementArchiveStore : ISettlementArchiveStore
{
    private readonly SettlementArchiveOptions _options;
    private StorageClient? _storageClient;
    private UrlSigner? _urlSigner;

    public GcsSettlementArchiveStore(IOptions<SettlementArchiveOptions> options) =>
        _options = options.Value;

    public async Task UploadAsync(string objectPath, byte[] pdfBytes, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.BucketName))
            throw new SettlementArchiveException("Settlement archive bucket is not configured.");

        try
        {
            await using var stream = new MemoryStream(pdfBytes);
            await GetStorageClient().UploadObjectAsync(
                _options.BucketName,
                objectPath,
                "application/pdf",
                stream,
                cancellationToken: cancellationToken);
        }
        catch (Exception ex) when (ex is not SettlementArchiveException)
        {
            throw new SettlementArchiveException("Failed to upload settlement PDF to archive storage.");
        }
    }

    public Task<(string Url, DateTimeOffset ExpiresAt)> CreateSignedUrlAsync(
        string objectPath,
        TimeSpan ttl,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.BucketName))
            throw new SettlementArchiveException("Settlement archive bucket is not configured.");

        var expiresAt = DateTimeOffset.UtcNow.Add(ttl);
        var url = GetUrlSigner().Sign(
            _options.BucketName,
            objectPath,
            ttl,
            HttpMethod.Get);

        return Task.FromResult((url, expiresAt));
    }

    private StorageClient GetStorageClient() =>
        _storageClient ??= StorageClient.Create();

    private UrlSigner GetUrlSigner() =>
        _urlSigner ??= UrlSigner.FromCredential(GoogleCredential.GetApplicationDefault());
}
