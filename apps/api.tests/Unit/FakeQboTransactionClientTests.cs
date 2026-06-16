using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class FakeQboTransactionClientTests
{
    private readonly FakeQboTransactionClient _client = new();

    [Fact]
    public async Task FetchTransactionsByTagAsync_ReturnsDeterministicActuals_ForLifecycleTag()
    {
        var results = await _client.FetchTransactionsByTagAsync("token", "realm", FakeQboTransactionClient.LifecycleTagName);

        Assert.Single(results);
        Assert.Equal("E2E-TXN-001", results[0].TransactionId);
        Assert.Equal(FakeQboTransactionClient.LifecycleAccountId, results[0].AccountId);
        Assert.Equal(5100.00m, results[0].Amount);
    }

    [Fact]
    public async Task FetchTransactionsByTagAsync_ReturnsEmpty_ForUnknownTag()
    {
        var results = await _client.FetchTransactionsByTagAsync("token", "realm", "UNKNOWN-TAG");
        Assert.Empty(results);
    }
}
