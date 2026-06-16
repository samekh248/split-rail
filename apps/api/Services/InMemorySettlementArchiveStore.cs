namespace SplitRail.Api.Services;

public class InMemorySettlementArchiveStore : ISettlementArchiveStore
{
    private readonly Dictionary<string, byte[]> _objects = new(StringComparer.Ordinal);

    public Task UploadAsync(string objectPath, byte[] pdfBytes, CancellationToken cancellationToken = default)
    {
        _objects[objectPath] = pdfBytes.ToArray();
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
