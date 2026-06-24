namespace SplitRail.Api.Services;

public interface IGcsSettlementObjectStorage
{
    Task<bool> ObjectExistsAsync(string bucket, string objectName, CancellationToken cancellationToken = default);

    Task CopyObjectAsync(
        string sourceBucket,
        string sourceName,
        string destBucket,
        string destName,
        CancellationToken cancellationToken = default);

    Task SetObjectRetentionAsync(
        string bucket,
        string objectName,
        DateTimeOffset retainUntil,
        CancellationToken cancellationToken = default);

    Task UploadObjectAsync(
        string bucket,
        string objectName,
        byte[] content,
        CancellationToken cancellationToken = default);

    Task DeleteObjectAsync(string bucket, string objectName, CancellationToken cancellationToken = default);

    Task<DateTimeOffset?> GetObjectRetentionUntilAsync(
        string bucket,
        string objectName,
        CancellationToken cancellationToken = default);
}
