using FluentAssertions;
using Microsoft.Extensions.Options;
using SplitRail.Api.Configuration;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class GcsSettlementArchiveStoreTests
{
    [Fact]
    public async Task Upload_WithoutBucket_Throws()
    {
        var store = new GcsSettlementArchiveStore(
            Options.Create(new SettlementArchiveOptions { BucketName = "" }));

        await Assert.ThrowsAsync<SettlementArchiveException>(() =>
            store.UploadAsync("settlements/test.pdf", [0x01]));
    }

    [Fact]
    public async Task CreateSignedUrl_WithoutBucket_Throws()
    {
        var store = new GcsSettlementArchiveStore(
            Options.Create(new SettlementArchiveOptions { BucketName = "  " }));

        await Assert.ThrowsAsync<SettlementArchiveException>(() =>
            store.CreateSignedUrlAsync("settlements/test.pdf", TimeSpan.FromMinutes(5)));
    }
}
