using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Settlement;
using SplitRail.Api.DTOs.Venues;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class SettlementTenantIsolationTests : IntegrationTestBase
{
    [Fact]
    public async Task CrossOrgSettlementAccess_Returns404()
    {
        var (clientA, venueA, tokenA) = await SetupFinancialAdminAsync("org-a@test.com");
        var evtA = await SeedSettlementReadyEventAsync(clientA, venueA, tokenA);

        var (clientB, _, _) = await SetupFinancialAdminAsync("org-b@test.com");

        var finalizeResponse = await clientB.PostAsJsonAsync(
            $"/api/venues/{venueA}/events/{evtA.EventId}/settle",
            new FinalizeSettlementRequest(ValidSignatureBase64(), true));
        finalizeResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);

        if (IsQuestPdfSupported())
        {
            await clientA.PostAsJsonAsync(
                $"/api/venues/{venueA}/events/{evtA.EventId}/settle",
                new FinalizeSettlementRequest(ValidSignatureBase64(), true));

            var pdfResponse = await clientB.GetAsync(
                $"/api/venues/{venueA}/events/{evtA.EventId}/settlement-pdf");
            pdfResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);

            var reverseResponse = await clientB.PostAsJsonAsync(
                $"/api/venues/{venueA}/events/{evtA.EventId}/reverse-settlement",
                new ReverseSettlementRequest("Should fail"));
            reverseResponse.StatusCode.Should().Be(HttpStatusCode.NotFound);
        }
    }
}
