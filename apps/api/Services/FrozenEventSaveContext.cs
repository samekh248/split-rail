namespace SplitRail.Api.Services;

public interface IFrozenEventSaveContext
{
    FrozenEventSaveReason? CurrentReason { get; }

    IDisposable Authorize(FrozenEventSaveReason reason);
}

public sealed class FrozenEventSaveContext : IFrozenEventSaveContext
{
    private static readonly AsyncLocal<FrozenEventSaveReason?> Current = new();

    public FrozenEventSaveReason? CurrentReason => Current.Value;

    public IDisposable Authorize(FrozenEventSaveReason reason) => new Scope(reason);

    private sealed class Scope : IDisposable
    {
        private readonly FrozenEventSaveReason? _previous;

        public Scope(FrozenEventSaveReason reason)
        {
            _previous = Current.Value;
            Current.Value = reason;
        }

        public void Dispose() => Current.Value = _previous;
    }
}
