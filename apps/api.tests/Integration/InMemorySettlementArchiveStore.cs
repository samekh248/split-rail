using SplitRail.Api.Services;

namespace SplitRail.Api.Tests.Integration;

public class InMemorySettlementArchiveStore : ISettlementArchiveStore
{
    private readonly object _gate = new();
    private readonly Dictionary<string, byte[]> _objects = new(StringComparer.Ordinal);
    private readonly Dictionary<string, byte[]> _stagedObjects = new(StringComparer.Ordinal);
    private readonly Dictionary<string, DateTimeOffset> _retentionUntil = new(StringComparer.Ordinal);
    private readonly List<string> _signedUrlRequests = [];

    public int RetentionYears { get; set; } = 7;

    public bool ThrowOnUpload { get; set; }

    public bool ThrowOnStage
    {
        get => ThrowOnUpload;
        set => ThrowOnUpload = value;
    }

    public bool ThrowOnPromote { get; set; }

    public IReadOnlyList<string> SignedUrlRequests
    {
        get
        {
            lock (_gate)
            {
                return _signedUrlRequests.ToList();
            }
        }
    }

    public Task UploadAsync(string objectPath, byte[] pdfBytes, CancellationToken cancellationToken = default)
    {
        lock (_gate)
        {
            EnsurePathAvailable(objectPath);
            _objects[objectPath] = pdfBytes.ToArray();
            ApplyRetentionLock(objectPath);
        }

        return Task.CompletedTask;
    }

    public Task StageAsync(string stagingPath, byte[] pdfBytes, CancellationToken cancellationToken = default)
    {
        if (ThrowOnStage)
            throw new SplitRail.Api.Exceptions.SettlementArchiveException("Simulated stage upload failure.");

        lock (_gate)
        {
            _stagedObjects[stagingPath] = pdfBytes.ToArray();
        }

        return Task.CompletedTask;
    }

    public Task PromoteAsync(string stagingPath, string finalPath, CancellationToken cancellationToken = default)
    {
        if (ThrowOnPromote)
            throw new SplitRail.Api.Exceptions.SettlementArchiveException("Simulated promote failure.");

        lock (_gate)
        {
            if (!_stagedObjects.TryGetValue(stagingPath, out var bytes))
                throw new SplitRail.Api.Exceptions.SettlementArchiveException("Staged settlement document not found.");

            EnsurePathAvailable(finalPath);
            _objects[finalPath] = bytes.ToArray();
            _stagedObjects.Remove(stagingPath);
            ApplyRetentionLock(finalPath);
        }

        return Task.CompletedTask;
    }

    public Task DeleteStagedAsync(string stagingPath, CancellationToken cancellationToken = default)
    {
        lock (_gate)
        {
            _stagedObjects.Remove(stagingPath);
        }

        return Task.CompletedTask;
    }

    public Task<(string Url, DateTimeOffset ExpiresAt)> CreateSignedUrlAsync(
        string objectPath,
        TimeSpan ttl,
        CancellationToken cancellationToken = default)
    {
        lock (_gate)
        {
            _signedUrlRequests.Add(objectPath);
        }

        var expiresAt = DateTimeOffset.UtcNow.Add(ttl);
        var url = $"https://storage.test/{objectPath}?expires={expiresAt.ToUnixTimeSeconds()}";
        return Task.FromResult((url, expiresAt));
    }

    public Task<DateTimeOffset?> GetRetentionUntilAsync(
        string objectPath,
        CancellationToken cancellationToken = default)
    {
        lock (_gate)
        {
            return Task.FromResult(_retentionUntil.TryGetValue(objectPath, out var until) ? until : (DateTimeOffset?)null);
        }
    }

    public bool IsRetentionLocked(string objectPath)
    {
        lock (_gate)
        {
            return _retentionUntil.TryGetValue(objectPath, out var until) && until > DateTimeOffset.UtcNow;
        }
    }

    public bool TryDelete(string objectPath)
    {
        lock (_gate)
        {
            if (_retentionUntil.TryGetValue(objectPath, out var until) && until > DateTimeOffset.UtcNow)
                return false;

            _retentionUntil.Remove(objectPath);
            return _objects.Remove(objectPath);
        }
    }

    public bool TryOverwrite(string objectPath, byte[] pdfBytes)
    {
        lock (_gate)
        {
            if (_objects.ContainsKey(objectPath))
                return false;

            _objects[objectPath] = pdfBytes.ToArray();
            ApplyRetentionLock(objectPath);
            return true;
        }
    }

    public byte[]? GetStoredPdf(string objectPath)
    {
        lock (_gate)
        {
            return _objects.TryGetValue(objectPath, out var bytes) ? bytes : null;
        }
    }

    public byte[]? TryGetStoredPdf(string objectPath) => GetStoredPdf(objectPath);

    public IReadOnlyCollection<string> StoredObjectPaths
    {
        get
        {
            lock (_gate)
            {
                return _objects.Keys.ToList();
            }
        }
    }

    public int StoredObjectCount
    {
        get
        {
            lock (_gate)
            {
                return _objects.Count;
            }
        }
    }

    public int StagedObjectCount
    {
        get
        {
            lock (_gate)
            {
                return _stagedObjects.Count;
            }
        }
    }

    public int RetentionLockedCount
    {
        get
        {
            lock (_gate)
            {
                return _retentionUntil.Count;
            }
        }
    }

    private void EnsurePathAvailable(string objectPath)
    {
        if (_objects.ContainsKey(objectPath))
            throw new SplitRail.Api.Exceptions.SettlementArchiveException("Archive object already exists.");
    }

    private void ApplyRetentionLock(string objectPath) =>
        _retentionUntil[objectPath] = DateTimeOffset.UtcNow.AddYears(RetentionYears);
}
