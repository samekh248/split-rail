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
        EnsureArchiveBucketConfigured();
        await UploadToBucketAsync(_options.BucketName, objectPath, pdfBytes, cancellationToken);
    }

    public async Task StageAsync(string stagingPath, byte[] pdfBytes, CancellationToken cancellationToken = default)
    {
        EnsureArchiveBucketConfigured();
        var stagingBucket = _options.ResolveStagingBucketName();
        await UploadToBucketAsync(stagingBucket, stagingPath, pdfBytes, cancellationToken);
    }

    public async Task PromoteAsync(string stagingPath, string finalPath, CancellationToken cancellationToken = default)
    {
        EnsureArchiveBucketConfigured();
        var stagingBucket = _options.ResolveStagingBucketName();

        try
        {
            await GetStorageClient().CopyObjectAsync(
                stagingBucket,
                stagingPath,
                _options.BucketName,
                finalPath,
                cancellationToken: cancellationToken);
        }
        catch (Exception ex) when (ex is not SettlementArchiveException)
        {
            throw new SettlementArchiveException("Failed to promote settlement PDF to archive storage.");
        }
    }

    public async Task DeleteStagedAsync(string stagingPath, CancellationToken cancellationToken = default)
    {
        EnsureArchiveBucketConfigured();
        var stagingBucket = _options.ResolveStagingBucketName();

        try
        {
            await GetStorageClient().DeleteObjectAsync(
                stagingBucket,
                stagingPath,
                cancellationToken: cancellationToken);
        }
        catch (Exception ex) when (ex is not SettlementArchiveException)
        {
            throw new SettlementArchiveException("Failed to delete staged settlement PDF.");
        }
    }

    public Task<(string Url, DateTimeOffset ExpiresAt)> CreateSignedUrlAsync(
        string objectPath,
        TimeSpan ttl,
        CancellationToken cancellationToken = default)
    {
        EnsureArchiveBucketConfigured();

        var expiresAt = DateTimeOffset.UtcNow.Add(ttl);
        var url = GetUrlSigner().Sign(
            _options.BucketName,
            objectPath,
            ttl,
            HttpMethod.Get);

        return Task.FromResult((url, expiresAt));
    }

    private async Task UploadToBucketAsync(
        string bucketName,
        string objectPath,
        byte[] pdfBytes,
        CancellationToken cancellationToken)
    {
        try
        {
            await using var stream = new MemoryStream(pdfBytes);
            await GetStorageClient().UploadObjectAsync(
                bucketName,
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

    private void EnsureArchiveBucketConfigured()
    {
        if (string.IsNullOrWhiteSpace(_options.BucketName))
            throw new SettlementArchiveException("Settlement archive bucket is not configured.");
    }

    private StorageClient GetStorageClient() =>
        _storageClient ??= StorageClient.Create();

    private UrlSigner GetUrlSigner() =>
        _urlSigner ??= UrlSigner.FromCredential(GoogleCredential.GetApplicationDefault());
}
