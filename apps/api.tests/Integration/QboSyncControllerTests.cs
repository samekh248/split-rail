using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SplitRail.Api.Data;
using SplitRail.Api.Services;
using SplitRail.Api.Tests.Integration;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class QboSyncControllerTests : IntegrationTestBase
{
    [Fact]
    public async Task Sync_WithoutPermission_Returns403()
    {
        var (adminClient, venueId, adminToken) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(adminClient, venueId);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var orgId = ParseTokenClaims(adminToken).OrganizationId!.Value;
        var role = await db.OrganizationRoles.FirstAsync(r =>
            r.OrganizationId == orgId && r.RoleName == RoleNames.Promoter);

        var email = $"promoter-{Guid.NewGuid():N}@example.com";
        var rawToken = await SendInvitationViaServiceAsync(adminToken, email, role.Id, [venueId]);
        var acceptResponse = await Client.PostAsJsonAsync("/api/invitations/accept",
            new SplitRail.Api.DTOs.Invitations.AcceptInvitationRequest(rawToken, "SecurePass1"));
        acceptResponse.EnsureSuccessStatusCode();
        var auth = await acceptResponse.Content.ReadFromJsonAsync<SplitRail.Api.DTOs.Invitations.AcceptInvitationResponse>();

        var promoterClient = CreateAuthenticatedClient(auth!.AccessToken);
        var response = await promoterClient.PostAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/sync",
            null);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Sync_WithAdminPermission_SucceedsWhenQboConnected()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);
        await SeedQboCredentialDirectAsync(token, venueId);

        var handler = new RecordingQboHandler("""{ "QueryResponse": { "Purchase": [] } }""");
        await using var customFactory = CreateFactoryWithQboHandler(handler);
        var customClient = customFactory.CreateClient();
        customClient.DefaultRequestHeaders.Authorization = client.DefaultRequestHeaders.Authorization;

        var response = await customClient.PostAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/sync",
            null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetSyncStatus_ReturnsStatusForEvent()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);
        await SeedQboCredentialDirectAsync(token, venueId);

        var response = await client.GetAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/sync-status");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var status = await response.Content.ReadFromJsonAsync<SplitRail.Api.DTOs.Qbo.SyncStatusDto>();
        status!.QboConnected.Should().BeTrue();
        status.EventId.Should().Be(evt.EventId);
    }
}
