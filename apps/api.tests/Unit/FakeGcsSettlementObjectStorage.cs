using SplitRail.Api.Services;

namespace SplitRail.Api.Tests.Unit;

/// <summary>In-memory GCS simulation for GcsSettlementArchiveStore unit tests (no live GCS).</summary>
internal sealed class FakeGcsSettlementObjectStorage : IGcsSettlementObjectStorage
{
    private readonly Dictionary<(string Bucket, string Name), byte[]> _objects = new();
    private readonly Dictionary<(string Bucket, string Name), DateTimeOffset> _retentionUntil = new();

    public bool ThrowOnCopy { get; set; }

    public bool ThrowOnUpload { get; set; }

    public Task<bool> ObjectExistsAsync(string bucket, string objectName, CancellationToken cancellationToken = default) =>
        Task.FromResult(_objects.ContainsKey((bucket, objectName)));

    public Task CopyObjectAsync(
        string sourceBucket,
        string sourceName,
        string destBucket,
        string destName,
        CancellationToken cancellationToken = default)
    {
        if (ThrowOnCopy)
            throw new InvalidOperationException("Simulated GCS copy failure.");

        if (!_objects.TryGetValue((sourceBucket, sourceName), out var bytes))
            throw new InvalidOperationException("Source object not found.");

        _objects[(destBucket, destName)] = bytes.ToArray();
        return Task.CompletedTask;
    }

    public Task SetObjectRetentionAsync(
        string bucket,
        string objectName,
        DateTimeOffset retainUntil,
        CancellationToken cancellationToken = default)
    {
        _retentionUntil[(bucket, objectName)] = retainUntil;
        return Task.CompletedTask;
    }

    public Task UploadObjectAsync(
        string bucket,
        string objectName,
        byte[] content,
        CancellationToken cancellationToken = default)
    {
        if (ThrowOnUpload)
            throw new IOException("Simulated GCS upload failure.");

        _objects[(bucket, objectName)] = content.ToArray();
        return Task.CompletedTask;
    }

    public Task DeleteObjectAsync(string bucket, string objectName, CancellationToken cancellationToken = default)
    {
        _objects.Remove((bucket, objectName));
        _retentionUntil.Remove((bucket, objectName));
        return Task.CompletedTask;
    }

    public Task<DateTimeOffset?> GetObjectRetentionUntilAsync(
        string bucket,
        string objectName,
        CancellationToken cancellationToken = default) =>
        Task.FromResult(_retentionUntil.TryGetValue((bucket, objectName), out var until) ? until : (DateTimeOffset?)null);

    public byte[]? GetObject(string bucket, string objectName) =>
        _objects.TryGetValue((bucket, objectName), out var bytes) ? bytes : null;
}
