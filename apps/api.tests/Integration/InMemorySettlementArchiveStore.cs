using SplitRail.Api.Services;

namespace SplitRail.Api.Tests.Integration;

public class InMemorySettlementArchiveStore : ISettlementArchiveStore
{
    private readonly Dictionary<string, byte[]> _objects = new(StringComparer.Ordinal);
    private readonly List<string> _signedUrlRequests = [];

    public bool ThrowOnUpload { get; set; }

    public IReadOnlyList<string> SignedUrlRequests => _signedUrlRequests;

    public Task UploadAsync(string objectPath, byte[] pdfBytes, CancellationToken cancellationToken = default)
    {
        if (ThrowOnUpload)
            throw new SplitRail.Api.Exceptions.SettlementArchiveException("Simulated upload failure.");

        _objects[objectPath] = pdfBytes.ToArray();
        return Task.CompletedTask;
    }

    public Task<(string Url, DateTimeOffset ExpiresAt)> CreateSignedUrlAsync(
        string objectPath,
        TimeSpan ttl,
        CancellationToken cancellationToken = default)
    {
        _signedUrlRequests.Add(objectPath);
        var expiresAt = DateTimeOffset.UtcNow.Add(ttl);
        var url = $"https://storage.test/{objectPath}?expires={expiresAt.ToUnixTimeSeconds()}";
        return Task.FromResult((url, expiresAt));
    }

    public byte[]? GetStoredPdf(string objectPath) =>
        _objects.TryGetValue(objectPath, out var bytes) ? bytes : null;

    public IReadOnlyCollection<string> StoredObjectPaths => _objects.Keys.ToList();

    public int StoredObjectCount => _objects.Count;
}
