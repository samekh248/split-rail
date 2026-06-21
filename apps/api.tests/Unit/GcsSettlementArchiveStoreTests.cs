using FluentAssertions;
using Microsoft.Extensions.Options;
using SplitRail.Api.Configuration;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class GcsSettlementArchiveStoreTests
{
    private static GcsSettlementArchiveStore CreateStore(
        FakeGcsSettlementObjectStorage storage,
        SettlementArchiveOptions? options = null)
    {
        options ??= new SettlementArchiveOptions
        {
            BucketName = "archive-bucket",
            StagingBucketName = "staging-bucket",
            RetentionYears = 7
        };

        return new GcsSettlementArchiveStore(Options.Create(options), storage);
    }

    [Fact]
    public void RetentionPeriodSeconds_ForSevenYears_MatchesPolicyValidatorExpectation()
    {
        var seconds = SettlementArchiveRetentionPolicyValidator.RetentionPeriodSeconds(7);
        seconds.Should().BeGreaterThan(220_752_000);
    }

    [Fact]
    public void DefaultOptions_RetentionYears_IsSeven()
    {
        var options = new SettlementArchiveOptions();
        options.RetentionYears.Should().Be(7);
        options.EnforceRetentionValidation.Should().BeTrue();
    }

    [Fact]
    public async Task PromoteAsync_AppliesRetentionAndCopiesToArchiveBucket()
    {
        var storage = new FakeGcsSettlementObjectStorage();
        var store = CreateStore(storage);
        var pdf = new byte[] { 0x25, 0x50, 0x44, 0x46 };

        await store.StageAsync("staging/a.pdf", pdf);
        await store.PromoteAsync("staging/a.pdf", "settlements/a.pdf");

        storage.GetObject("archive-bucket", "settlements/a.pdf").Should().Equal(pdf);
        var retainUntil = await store.GetRetentionUntilAsync("settlements/a.pdf");
        retainUntil.Should().NotBeNull();
        retainUntil!.Value.Should().BeOnOrAfter(DateTimeOffset.UtcNow.AddYears(7).AddDays(-1));
    }

    [Fact]
    public async Task PromoteAsync_WhenFinalPathExists_ThrowsWithoutMutation()
    {
        var storage = new FakeGcsSettlementObjectStorage();
        var store = CreateStore(storage);

        await store.StageAsync("staging/first.pdf", [0x01]);
        await store.PromoteAsync("staging/first.pdf", "settlements/same.pdf");

        await store.StageAsync("staging/second.pdf", [0x02]);
        var act = () => store.PromoteAsync("staging/second.pdf", "settlements/same.pdf");

        await act.Should().ThrowAsync<SettlementArchiveException>();
        storage.GetObject("archive-bucket", "settlements/same.pdf").Should().Equal([0x01]);
    }

    [Fact]
    public async Task UploadAsync_WhenFinalPathExists_ThrowsWithoutMutation()
    {
        var storage = new FakeGcsSettlementObjectStorage();
        var store = CreateStore(storage);

        await store.UploadAsync("settlements/existing.pdf", [0x01]);

        var act = () => store.UploadAsync("settlements/existing.pdf", [0x02]);

        await act.Should().ThrowAsync<SettlementArchiveException>();
        storage.GetObject("archive-bucket", "settlements/existing.pdf").Should().Equal([0x01]);
    }

    [Fact]
    public async Task DeleteStagedAsync_RemovesStagingObject()
    {
        var storage = new FakeGcsSettlementObjectStorage();
        var store = CreateStore(storage);

        await store.StageAsync("staging/temp.pdf", [0x01]);
        await store.DeleteStagedAsync("staging/temp.pdf");

        storage.GetObject("staging-bucket", "staging/temp.pdf").Should().BeNull();
    }

    [Fact]
    public async Task GetRetentionUntilAsync_WhenObjectMissing_ReturnsNull()
    {
        var storage = new FakeGcsSettlementObjectStorage();
        var store = CreateStore(storage);

        var retainUntil = await store.GetRetentionUntilAsync("missing.pdf");

        retainUntil.Should().BeNull();
    }

    [Fact]
    public void ResolveStagingBucketName_WhenUnset_UsesArchiveBucketSuffix()
    {
        var options = new SettlementArchiveOptions { BucketName = "archive-prod" };
        options.ResolveStagingBucketName().Should().Be("archive-prod-staging");
    }

    [Fact]
    public async Task PromoteAsync_WhenBucketNotConfigured_Throws()
    {
        var storage = new FakeGcsSettlementObjectStorage();
        var store = CreateStore(storage, new SettlementArchiveOptions { BucketName = "" });

        var act = () => store.PromoteAsync("staging/a.pdf", "settlements/a.pdf");

        await act.Should().ThrowAsync<SettlementArchiveException>()
            .WithMessage("*not configured*");
    }

    [Fact]
    public async Task PromoteAsync_WhenCopyFails_WrapsSettlementArchiveException()
    {
        var storage = new FakeGcsSettlementObjectStorage { ThrowOnCopy = true };
        var store = CreateStore(storage);

        await store.StageAsync("staging/a.pdf", [0x01]);

        var act = () => store.PromoteAsync("staging/a.pdf", "settlements/a.pdf");

        await act.Should().ThrowAsync<SettlementArchiveException>()
            .WithMessage("*Failed to promote*");
    }

    [Fact]
    public async Task StageAsync_WhenUploadFails_WrapsSettlementArchiveException()
    {
        var storage = new FakeGcsSettlementObjectStorage { ThrowOnUpload = true };
        var store = CreateStore(storage);

        var act = () => store.StageAsync("staging/a.pdf", [0x01]);

        await act.Should().ThrowAsync<SettlementArchiveException>()
            .WithMessage("*Failed to upload*");
    }
}
