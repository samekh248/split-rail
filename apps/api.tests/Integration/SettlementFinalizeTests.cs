using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Ledger;
using SplitRail.Api.DTOs.Settlement;
using SplitRail.Api.Models.Enums;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class SettlementFinalizeTests : IntegrationTestBase
{
    [Fact]
    public async Task Finalize_HappyPath_PopulatesSettledFieldsAndStoresPdf()
    {
        if (!IsQuestPdfSupported()) return;

        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await SeedSettlementReadyEventAsync(client, venueId, token);

        var response = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/settle",
            new FinalizeSettlementRequest(ValidSignatureBase64(), true));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<SettlementResultDto>();
        result!.Status.Should().Be("SETTLED");
        result.SettlementPdfAvailable.Should().BeTrue();
        result.SettledAt.Should().NotBeNull();

        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (userId, orgId) = ParseTokenClaims(token);
        tenantContext.SetContext(userId, orgId);
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var stored = await db.Events.FirstAsync(e => e.Id == evt.EventId);
        stored.Status.Should().Be(EventStatus.Settled);
        stored.ArtistSignatureData.Should().NotBeNullOrWhiteSpace();
        stored.SettlementPdfUrl.Should().NotBeNullOrWhiteSpace();
        stored.SettledByUserId.Should().Be(userId);

        ArchiveStore.StoredObjectCount.Should().Be(1);
    }
}
