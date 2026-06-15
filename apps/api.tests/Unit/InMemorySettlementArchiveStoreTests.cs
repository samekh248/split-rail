using FluentAssertions;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class InMemorySettlementArchiveStoreTests
{
    [Fact]
    public async Task UploadAndRetrieve_RoundTripsPdfBytes()
    {
        var store = new InMemorySettlementArchiveStore();
        var pdf = new byte[] { 0x25, 0x50, 0x44, 0x46 };

        await store.UploadAsync("org/event/settlement.pdf", pdf);

        store.GetStoredPdf("org/event/settlement.pdf").Should().Equal(pdf);
    }

    [Fact]
    public async Task CreateSignedUrl_ReturnsTestSeedPath()
    {
        var store = new InMemorySettlementArchiveStore();
        await store.UploadAsync("settlements/test.pdf", [0x01]);

        var (url, expiresAt) = await store.CreateSignedUrlAsync("settlements/test.pdf", TimeSpan.FromMinutes(5));

        url.Should().Contain("/api/test-seed/settlement-pdf/");
        expiresAt.Should().BeAfter(DateTimeOffset.UtcNow);
    }

    [Fact]
    public async Task CreateSignedUrl_MissingObject_Throws()
    {
        var store = new InMemorySettlementArchiveStore();

        await Assert.ThrowsAsync<SplitRail.Api.Exceptions.SettlementArchiveException>(() =>
            store.CreateSignedUrlAsync("missing.pdf", TimeSpan.FromMinutes(5)));
    }
}
