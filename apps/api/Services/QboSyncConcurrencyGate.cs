namespace SplitRail.Api.Services;

public interface IQboSyncConcurrencyGate
{
    Task<bool> TryEnterAsync(CancellationToken cancellationToken);

    void Release();
}

public sealed class QboSyncConcurrencyGate : IQboSyncConcurrencyGate
{
    private readonly SemaphoreSlim _semaphore = new(1, 1);

    public Task<bool> TryEnterAsync(CancellationToken cancellationToken) =>
        _semaphore.WaitAsync(0, cancellationToken);

    public void Release() => _semaphore.Release();
}
