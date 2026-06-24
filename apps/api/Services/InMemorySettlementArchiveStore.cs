using SplitRail.Api.Exceptions;

namespace SplitRail.Api.Services;

public class InMemorySettlementArchiveStore : ISettlementArchiveStore
{
    private readonly Dictionary<string, byte[]> _objects = new(StringComparer.Ordinal);
    private readonly Dictionary<string, byte[]> _stagedObjects = new(StringComparer.Ordinal);
    private readonly Dictionary<string, DateTimeOffset> _retentionUntil = new(StringComparer.Ordinal);

    public int RetentionYears { get; set; } = 7;

    public Task UploadAsync(string objectPath, byte[] pdfBytes, CancellationToken cancellationToken = default)
    {
        EnsurePathAvailable(objectPath);
        _objects[objectPath] = pdfBytes.ToArray();
        ApplyRetentionLock(objectPath);
        return Task.CompletedTask;
    }

    public Task StageAsync(string stagingPath, byte[] pdfBytes, CancellationToken cancellationToken = default)
    {
        _stagedObjects[stagingPath] = pdfBytes.ToArray();
        return Task.CompletedTask;
    }

    public Task PromoteAsync(string stagingPath, string finalPath, CancellationToken cancellationToken = default)
    {
        if (!_stagedObjects.TryGetValue(stagingPath, out var bytes))
            throw new SettlementArchiveException("Staged settlement document not found.");

        EnsurePathAvailable(finalPath);
        _objects[finalPath] = bytes.ToArray();
        _stagedObjects.Remove(stagingPath);
        ApplyRetentionLock(finalPath);
        return Task.CompletedTask;
    }

    public Task DeleteStagedAsync(string stagingPath, CancellationToken cancellationToken = default)
    {
        _stagedObjects.Remove(stagingPath);
        return Task.CompletedTask;
    }

    public Task<(string Url, DateTimeOffset ExpiresAt)> CreateSignedUrlAsync(
        string objectPath,
        TimeSpan ttl,
        CancellationToken cancellationToken = default)
    {
        if (!_objects.ContainsKey(objectPath))
            throw new SettlementArchiveException("Settlement document not found.");

        var expiresAt = DateTimeOffset.UtcNow.Add(ttl);
        var url = $"/api/test-seed/settlement-pdf/{Uri.EscapeDataString(objectPath)}";
        return Task.FromResult((url, expiresAt));
    }

    public Task<DateTimeOffset?> GetRetentionUntilAsync(
        string objectPath,
        CancellationToken cancellationToken = default) =>
        Task.FromResult(_retentionUntil.TryGetValue(objectPath, out var until) ? until : (DateTimeOffset?)null);

    public bool IsRetentionLocked(string objectPath) =>
        _retentionUntil.TryGetValue(objectPath, out var until) && until > DateTimeOffset.UtcNow;

    public bool TryDelete(string objectPath)
    {
        if (IsRetentionLocked(objectPath))
            return false;

        _retentionUntil.Remove(objectPath);
        return _objects.Remove(objectPath);
    }

    public bool TryOverwrite(string objectPath, byte[] pdfBytes)
    {
        if (_objects.ContainsKey(objectPath))
            return false;

        _objects[objectPath] = pdfBytes.ToArray();
        ApplyRetentionLock(objectPath);
        return true;
    }

    public byte[]? GetStoredPdf(string objectPath) =>
        _objects.TryGetValue(objectPath, out var bytes) ? bytes : null;

    public byte[]? TryGetStoredPdf(string objectPath) => GetStoredPdf(objectPath);

    private void EnsurePathAvailable(string objectPath)
    {
        if (_objects.ContainsKey(objectPath))
            throw new SettlementArchiveException("Archive object already exists.");
    }

    private void ApplyRetentionLock(string objectPath) =>
        _retentionUntil[objectPath] = DateTimeOffset.UtcNow.AddYears(RetentionYears);
}
