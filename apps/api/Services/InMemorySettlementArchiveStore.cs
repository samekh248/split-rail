namespace SplitRail.Api.Services;

public class InMemorySettlementArchiveStore : ISettlementArchiveStore
{
    private readonly Dictionary<string, byte[]> _objects = new(StringComparer.Ordinal);
    private readonly Dictionary<string, byte[]> _stagedObjects = new(StringComparer.Ordinal);

    public Task UploadAsync(string objectPath, byte[] pdfBytes, CancellationToken cancellationToken = default)
    {
        _objects[objectPath] = pdfBytes.ToArray();
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
            throw new Exceptions.SettlementArchiveException("Staged settlement document not found.");

        _objects[finalPath] = bytes.ToArray();
        _stagedObjects.Remove(stagingPath);
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
            throw new Exceptions.SettlementArchiveException("Settlement document not found.");

        var expiresAt = DateTimeOffset.UtcNow.Add(ttl);
        var url = $"/api/test-seed/settlement-pdf/{Uri.EscapeDataString(objectPath)}";
        return Task.FromResult((url, expiresAt));
    }

    public byte[]? GetStoredPdf(string objectPath) =>
        _objects.TryGetValue(objectPath, out var bytes) ? bytes : null;

    public byte[]? TryGetStoredPdf(string objectPath) => GetStoredPdf(objectPath);
}
