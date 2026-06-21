using System.Net;
using Google.Cloud.Storage.V1;
using Google.Apis.Storage.v1.Data;

namespace SplitRail.Api.Services;

public sealed class GcsSettlementObjectStorageClient : IGcsSettlementObjectStorage
{
    private readonly StorageClient _client;

    public GcsSettlementObjectStorageClient(StorageClient client) => _client = client;

    public GcsSettlementObjectStorageClient() : this(StorageClient.Create()) { }

    public async Task<bool> ObjectExistsAsync(
        string bucket,
        string objectName,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await _client.GetObjectAsync(bucket, objectName, cancellationToken: cancellationToken);
            return true;
        }
        catch (Google.GoogleApiException ex) when (ex.HttpStatusCode == HttpStatusCode.NotFound)
        {
            return false;
        }
    }

    public Task CopyObjectAsync(
        string sourceBucket,
        string sourceName,
        string destBucket,
        string destName,
        CancellationToken cancellationToken = default) =>
        _client.CopyObjectAsync(sourceBucket, sourceName, destBucket, destName, cancellationToken: cancellationToken);

    public async Task SetObjectRetentionAsync(
        string bucket,
        string objectName,
        DateTimeOffset retainUntil,
        CancellationToken cancellationToken = default)
    {
        var obj = await _client.GetObjectAsync(bucket, objectName, cancellationToken: cancellationToken);
        obj.RetentionExpirationTimeDateTimeOffset = retainUntil;
        await _client.UpdateObjectAsync(obj, cancellationToken: cancellationToken);
    }

    public async Task UploadObjectAsync(
        string bucket,
        string objectName,
        byte[] content,
        CancellationToken cancellationToken = default)
    {
        await using var stream = new MemoryStream(content);
        await _client.UploadObjectAsync(bucket, objectName, "application/pdf", stream, cancellationToken: cancellationToken);
    }

    public Task DeleteObjectAsync(string bucket, string objectName, CancellationToken cancellationToken = default) =>
        _client.DeleteObjectAsync(bucket, objectName, cancellationToken: cancellationToken);

    public async Task<DateTimeOffset?> GetObjectRetentionUntilAsync(
        string bucket,
        string objectName,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var obj = await _client.GetObjectAsync(bucket, objectName, cancellationToken: cancellationToken);
            return obj.RetentionExpirationTimeDateTimeOffset;
        }
        catch (Google.GoogleApiException ex) when (ex.HttpStatusCode == HttpStatusCode.NotFound)
        {
            return null;
        }
    }
}
