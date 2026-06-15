using FluentAssertions;
using SplitRail.Api.Tests.Integration;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class QboReadOnlyTests : IntegrationTestBase
{
    [Fact]
    public async Task FullSyncFlow_IssuesNoWriteVerbsToIntuit()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);
        await SeedQboCredentialDirectAsync(token, venueId);

        var handler = new RecordingQboHandler("""
            { "QueryResponse": { "Purchase": [] } }
            """);

        await using var customFactory = CreateFactoryWithQboHandler(handler);
        var customClient = customFactory.CreateClient();
        customClient.DefaultRequestHeaders.Authorization = client.DefaultRequestHeaders.Authorization;

        var response = await customClient.PostAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/sync",
            null);
        response.EnsureSuccessStatusCode();

        handler.Methods.Should().NotContain(m => m == "POST" || m == "PUT" || m == "DELETE");
        handler.Methods.Should().OnlyContain(m => m == "GET");
    }
}
