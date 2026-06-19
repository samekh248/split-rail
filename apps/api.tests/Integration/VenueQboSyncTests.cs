using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Invitations;
using SplitRail.Api.DTOs.Qbo;
using SplitRail.Api.DTOs.Venues;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class VenueQboSyncTests : IntegrationTestBase
{
    [Fact]
    public async Task GetVenueQboStatus_WhenConnected_ReturnsStatus()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        await SeedQboCredentialDirectAsync(token, venueId);

        var response = await client.GetAsync($"/api/venues/{venueId}/qbo/status");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var status = await response.Content.ReadFromJsonAsync<VenueQboStatusDto>();
        status!.VenueId.Should().Be(venueId);
        status.QboConnected.Should().BeTrue();
        status.LastSyncedAt.Should().BeNull();
    }

    [Fact]
    public async Task GetVenueQboStatus_WhenNotConnected_ReturnsDisconnected()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();

        var response = await client.GetAsync($"/api/venues/{venueId}/qbo/status");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var status = await response.Content.ReadFromJsonAsync<VenueQboStatusDto>();
        status!.QboConnected.Should().BeFalse();
    }

    [Fact]
    public async Task SyncVenue_WithAdminPermission_ReturnsPerEventResults()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);
        await SeedQboCredentialDirectAsync(token, venueId);

        var handler = new RecordingQboHandler("""{ "QueryResponse": { "Purchase": [] } }""");
        await using var customFactory = CreateFactoryWithQboHandler(handler);
        var customClient = customFactory.CreateClient();
        customClient.DefaultRequestHeaders.Authorization = client.DefaultRequestHeaders.Authorization;

        var response = await customClient.PostAsync($"/api/venues/{venueId}/sync", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<VenueSyncResultDto>();
        result!.VenueId.Should().Be(venueId);
        result.AttemptedCount.Should().BeGreaterThan(0);
        result.SucceededCount.Should().BeGreaterThan(0);
        result.Results.Should().Contain(r => r.EventId == evt.EventId && r.Success);
    }

    [Fact]
    public async Task SyncVenue_WithoutPermission_Returns403()
    {
        var (adminClient, venueId, adminToken) = await SetupFinancialAdminAsync();
        await CreateEventViaApiAsync(adminClient, venueId);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var orgId = ParseTokenClaims(adminToken).OrganizationId!.Value;
        var role = await db.OrganizationRoles.FirstAsync(r =>
            r.OrganizationId == orgId && r.RoleName == RoleNames.Promoter);

        var email = $"promoter-{Guid.NewGuid():N}@example.com";
        var rawToken = await SendInvitationViaServiceAsync(adminToken, email, role.Id, [venueId]);
        var acceptResponse = await Client.PostAsJsonAsync("/api/invitations/accept",
            new AcceptInvitationRequest(rawToken, "SecurePass1"));
        acceptResponse.EnsureSuccessStatusCode();
        var auth = await acceptResponse.Content.ReadFromJsonAsync<AcceptInvitationResponse>();

        var promoterClient = CreateAuthenticatedClient(auth!.AccessToken);
        var response = await promoterClient.PostAsync($"/api/venues/{venueId}/sync", null);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task SyncVenue_OutOfScopeVenue_Returns404()
    {
        var (adminClient, venueA, adminToken) = await SetupFinancialAdminAsync();
        var venueBResponse = await adminClient.PostAsJsonAsync("/api/venues",
            new CreateVenueRequest("Venue B"));
        venueBResponse.EnsureSuccessStatusCode();
        var venueB = await venueBResponse.Content.ReadFromJsonAsync<VenueResponse>();
        await CreateEventViaApiAsync(adminClient, venueB!.Id);

        var (scopedClient, _) = await CreateScopedVenueUserAsync(adminToken, venueA, $"scoped-{Guid.NewGuid():N}@example.com");
        var response = await scopedClient.PostAsync($"/api/venues/{venueB.Id}/sync", null);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
