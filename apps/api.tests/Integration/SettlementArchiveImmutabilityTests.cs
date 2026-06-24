using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using FluentAssertions;
using SplitRail.Api.DTOs.Settlement;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class SettlementArchiveImmutabilityTests : IntegrationTestBase
{
    [Fact]
    public async Task Finalize_AppliesRetentionLockOnFinalArchiveObject()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await SeedSettlementReadyEventAsync(client, venueId, token);

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/settle",
            new FinalizeSettlementRequest(ValidSignatureBase64(), true));

        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var finalPath = ArchiveStore.StoredObjectPaths.Single();
        var retainUntil = await ArchiveStore.GetRetentionUntilAsync(finalPath);
        retainUntil.Should().NotBeNull();
        retainUntil!.Value.Should().BeOnOrAfter(DateTimeOffset.UtcNow.AddYears(7).AddDays(-1));
        ArchiveStore.IsRetentionLocked(finalPath).Should().BeTrue();
    }

    [Fact]
    public async Task RetentionLockedObject_RejectOverwrite()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await SeedSettlementReadyEventAsync(client, venueId, token);

        await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/settle",
            new FinalizeSettlementRequest(ValidSignatureBase64(), true));

        var finalPath = ArchiveStore.StoredObjectPaths.Single();
        var originalBytes = ArchiveStore.GetStoredPdf(finalPath)!;
        var originalHash = SHA256.HashData(originalBytes);

        var overwritten = ArchiveStore.TryOverwrite(finalPath, [0xDE, 0xAD]);
        overwritten.Should().BeFalse();

        SHA256.HashData(ArchiveStore.GetStoredPdf(finalPath)!).Should().Equal(originalHash);
    }

    [Fact]
    public async Task ReverseAndRefinalize_TwoDistinctRetentionLockedObjects_OriginalPreserved()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await SeedSettlementReadyEventAsync(client, venueId, token);

        await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/settle",
            new FinalizeSettlementRequest(ValidSignatureBase64(), true));

        var firstPath = ArchiveStore.StoredObjectPaths.Single();
        var firstBytes = ArchiveStore.GetStoredPdf(firstPath)!;
        var firstRetainUntil = await ArchiveStore.GetRetentionUntilAsync(firstPath);

        await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/reverse-settlement",
            new ReverseSettlementRequest("Retention immutability test"));

        await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/settle",
            new FinalizeSettlementRequest(ValidSignatureBase64(), true));

        ArchiveStore.StoredObjectCount.Should().Be(2);
        ArchiveStore.GetStoredPdf(firstPath).Should().Equal(firstBytes);
        ArchiveStore.IsRetentionLocked(firstPath).Should().BeTrue();
        firstRetainUntil.Should().Be(await ArchiveStore.GetRetentionUntilAsync(firstPath));

        var secondPath = ArchiveStore.StoredObjectPaths.Single(p => p != firstPath);
        (await ArchiveStore.GetRetentionUntilAsync(secondPath)).Should().NotBeNull();
    }
}
