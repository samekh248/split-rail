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
    public async Task StagePromoteAndDelete_ManagesStagedAndFinalObjects()
    {
        var store = new InMemorySettlementArchiveStore();
        var pdf = new byte[] { 0x25, 0x50, 0x44, 0x46 };
        const string stagingPath = "staging/settlements/test.pdf";
        const string finalPath = "settlements/test.pdf";

        await store.StageAsync(stagingPath, pdf);
        store.GetStoredPdf(finalPath).Should().BeNull();

        await store.PromoteAsync(stagingPath, finalPath);
        store.GetStoredPdf(finalPath).Should().Equal(pdf);

        await store.DeleteStagedAsync(stagingPath);
    }

    [Fact]
    public async Task PromoteAsync_SetsRetentionLockOnFinalObject()
    {
        var store = new InMemorySettlementArchiveStore { RetentionYears = 7 };
        const string stagingPath = "staging/settlements/a.pdf";
        const string finalPath = "settlements/a.pdf";

        await store.StageAsync(stagingPath, [0x01]);
        await store.PromoteAsync(stagingPath, finalPath);

        var retainUntil = await store.GetRetentionUntilAsync(finalPath);
        retainUntil.Should().NotBeNull();
        retainUntil!.Value.Should().BeOnOrAfter(DateTimeOffset.UtcNow.AddYears(7).AddDays(-1));
        store.IsRetentionLocked(finalPath).Should().BeTrue();
    }

    [Fact]
    public async Task RetentionLockedObject_RejectDelete()
    {
        var store = new InMemorySettlementArchiveStore();
        const string stagingPath = "staging/settlements/a.pdf";
        const string finalPath = "settlements/a.pdf";

        await store.StageAsync(stagingPath, [0x01]);
        await store.PromoteAsync(stagingPath, finalPath);

        store.TryDelete(finalPath).Should().BeFalse();
        store.GetStoredPdf(finalPath).Should().NotBeNull();
    }

    [Fact]
    public async Task TryOverwrite_OnExistingPath_ReturnsFalse()
    {
        var store = new InMemorySettlementArchiveStore();
        await store.UploadAsync("settlements/locked.pdf", [0x01]);

        store.TryOverwrite("settlements/locked.pdf", [0x02]).Should().BeFalse();
        store.GetStoredPdf("settlements/locked.pdf").Should().Equal([0x01]);
    }

    [Fact]
    public async Task PromoteAsync_WhenFinalPathExists_ThrowsWithoutMutation()
    {
        var store = new InMemorySettlementArchiveStore();
        const string finalPath = "settlements/existing.pdf";

        await store.StageAsync("staging/settlements/first.pdf", [0x01]);
        await store.PromoteAsync("staging/settlements/first.pdf", finalPath);
        var originalBytes = store.GetStoredPdf(finalPath)!;

        await store.StageAsync("staging/settlements/second.pdf", [0x02]);

        var act = () => store.PromoteAsync("staging/settlements/second.pdf", finalPath);

        await act.Should().ThrowAsync<SplitRail.Api.Exceptions.SettlementArchiveException>();
        store.GetStoredPdf(finalPath).Should().Equal(originalBytes);
    }

    [Fact]
    public async Task UploadAsync_WhenFinalPathExists_ThrowsWithoutMutation()
    {
        var store = new InMemorySettlementArchiveStore();
        const string finalPath = "settlements/existing.pdf";

        await store.UploadAsync(finalPath, [0x01]);
        var originalBytes = store.GetStoredPdf(finalPath)!;

        var act = () => store.UploadAsync(finalPath, [0x02]);

        await act.Should().ThrowAsync<SplitRail.Api.Exceptions.SettlementArchiveException>();
        store.GetStoredPdf(finalPath).Should().Equal(originalBytes);
    }

    [Fact]
    public async Task CreateSignedUrl_MissingObject_Throws()
    {
        var store = new InMemorySettlementArchiveStore();

        await Assert.ThrowsAsync<SplitRail.Api.Exceptions.SettlementArchiveException>(() =>
            store.CreateSignedUrlAsync("missing.pdf", TimeSpan.FromMinutes(5)));
    }
}
