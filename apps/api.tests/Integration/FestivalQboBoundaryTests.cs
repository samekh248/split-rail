using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Festivals;
using Xunit;
using static SplitRail.Api.Tests.Integration.FestivalStructureTests;

namespace SplitRail.Api.Tests.Integration;

/// <summary>
/// Master QBO tag is local-only; festival module never writes to QBO (Constitution IV).
/// </summary>
public class FestivalQboBoundaryTests : IntegrationTestBase
{
    [Fact]
    public async Task FestivalCreation_GeneratesMasterTagLocally()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await CreateFestivalAsync(client, venueId, "Kalispell Summer Fest");

        festival.QboTagName.Should().NotBeNullOrWhiteSpace();
        festival.QboTagName.Should().StartWith("#Fest-2026-");
        festival.QboTagName.Should().Contain("KALISPELL");
    }

    [Fact]
    public async Task FestivalModule_HasNoQboWriteEndpoints()
    {
        var assembly = typeof(SplitRail.Api.Controllers.FestivalFinancialsController).Assembly;
        var festivalTypes = assembly.GetTypes()
            .Where(t => t.Namespace?.Contains("Festivals", StringComparison.Ordinal) == true
                        || t.Name.StartsWith("Festival", StringComparison.Ordinal))
            .ToList();

        festivalTypes.Should().NotBeEmpty();

        foreach (var type in festivalTypes)
        {
            type.Name.Should().NotContain("QboWrite", "festival module must not expose QBO write paths");
        }
    }

    [Fact]
    public async Task QboTransactionListing_IsReadOnlyAgainstImportedRows()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var festival = await CreateFestivalAsync(client, venueId);

        await SeedFestivalQboTransactionAsync(token, festival.EventId, venueId, "TXN-READ-1", 500m);

        var response = await client.GetAsync(QboPath(venueId, festival.EventId));
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var rows = await response.Content.ReadFromJsonAsync<List<FestivalQboTransactionResponse>>();
        rows!.Should().ContainSingle();
        rows[0].QboTransactionId.Should().Be("TXN-READ-1");
        rows[0].MasterTag.Should().Be(festival.QboTagName);
    }

    internal static string QboPath(Guid venueId, Guid eventId) =>
        $"/api/venues/{venueId}/festivals/{eventId}/qbo-transactions";
}
