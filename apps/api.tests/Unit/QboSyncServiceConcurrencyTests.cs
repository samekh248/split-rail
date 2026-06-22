using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class QboSyncServiceConcurrencyTests
{
    [Fact]
    public async Task SyncAllEligibleEventsAsync_overlappingCalls_serialized()
    {
        var gate = new QboSyncConcurrencyGate();

        Assert.True(await gate.TryEnterAsync(CancellationToken.None));
        Assert.False(await gate.TryEnterAsync(CancellationToken.None));

        gate.Release();
        Assert.True(await gate.TryEnterAsync(CancellationToken.None));
        gate.Release();
    }
}
