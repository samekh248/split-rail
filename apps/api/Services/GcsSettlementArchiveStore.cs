using Google.Apis.Auth.OAuth2;
using Google.Cloud.Storage.V1;
using Microsoft.Extensions.Options;
using SplitRail.Api.Configuration;
using SplitRail.Api.Exceptions;

namespace SplitRail.Api.Services;

public class GcsSettlementArchiveStore : ISettlementArchiveStore
{
    private readonly SettlementArchiveOptions _options;
    private readonly IGcsSettlementObjectStorage _storage;
    private UrlSigner? _urlSigner;

    public GcsSettlementArchiveStore(IOptions<SettlementArchiveOptions> options)
        : this(options, new GcsSettlementObjectStorageClient())
    {
    }

    internal GcsSettlementArchiveStore(
        IOptions<SettlementArchiveOptions> options,
        IGcsSettlementObjectStorage storage)
    {
        _options = options.Value;
        _storage = storage;
    }

    public async Task UploadAsync(string objectPath, byte[] pdfBytes, CancellationToken cancellationToken = default)
    {
        EnsureArchiveBucketConfigured();
        await EnsureFinalPathAvailableAsync(_options.BucketName, objectPath, cancellationToken);
        await UploadToBucketAsync(_options.BucketName, objectPath, pdfBytes, cancellationToken);
        await ApplyRetentionAsync(_options.BucketName, objectPath, cancellationToken);
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

        await EnsureFinalPathAvailableAsync(_options.BucketName, finalPath, cancellationToken);

        try
        {
            await _storage.CopyObjectAsync(
                stagingBucket,
                stagingPath,
                _options.BucketName,
                finalPath,
                cancellationToken);

            await ApplyRetentionAsync(_options.BucketName, finalPath, cancellationToken);
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
            await _storage.DeleteObjectAsync(stagingBucket, stagingPath, cancellationToken);
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

    public async Task<DateTimeOffset?> GetRetentionUntilAsync(
        string objectPath,
        CancellationToken cancellationToken = default)
    {
        EnsureArchiveBucketConfigured();

        try
        {
            return await _storage.GetObjectRetentionUntilAsync(
                _options.BucketName,
                objectPath,
                cancellationToken);
        }
        catch (Exception ex) when (ex is not SettlementArchiveException)
        {
            throw new SettlementArchiveException("Failed to read settlement PDF retention metadata.");
        }
    }

    private async Task EnsureFinalPathAvailableAsync(
        string bucketName,
        string objectPath,
        CancellationToken cancellationToken)
    {
        if (await _storage.ObjectExistsAsync(bucketName, objectPath, cancellationToken))
            throw new SettlementArchiveException("Archive object already exists.");
    }

    private Task ApplyRetentionAsync(
        string bucketName,
        string objectPath,
        CancellationToken cancellationToken)
    {
        var retainUntil = DateTimeOffset.UtcNow.AddYears(_options.RetentionYears);
        return _storage.SetObjectRetentionAsync(bucketName, objectPath, retainUntil, cancellationToken);
    }

    private async Task UploadToBucketAsync(
        string bucketName,
        string objectPath,
        byte[] pdfBytes,
        CancellationToken cancellationToken)
    {
        try
        {
            await _storage.UploadObjectAsync(bucketName, objectPath, pdfBytes, cancellationToken);
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

    private UrlSigner GetUrlSigner() =>
        _urlSigner ??= UrlSigner.FromCredential(GoogleCredential.GetApplicationDefault());
}
