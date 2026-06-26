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

public class QboIntegrationAdminRbacTests : IntegrationTestBase
{
    [Fact]
    public async Task ConnectUrl_AsVenueManager_Returns403()
    {
        var (adminClient, venueId, adminToken) = await SetupFinancialAdminAsync();
        var managerClient = await CreateVenueManagerClientAsync(adminClient, adminToken, venueId);

        var response = await managerClient.GetAsync($"/api/venues/{venueId}/qbo/connect-url");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Disconnect_AsExternalBookkeeper_Returns403()
    {
        var (adminClient, venueId, adminToken) = await SetupFinancialAdminAsync();
        await SeedQboCredentialDirectAsync(adminToken, venueId);
        var bookkeeperClient = await CreateExternalBookkeeperClientAsync(adminClient, adminToken, venueId);

        var response = await bookkeeperClient.PostAsync(
            $"/api/venues/{venueId}/qbo/disconnect",
            null);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Sync_AsVenueManager_Returns403()
    {
        var (adminClient, venueId, adminToken) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(adminClient, venueId);
        var managerClient = await CreateVenueManagerClientAsync(adminClient, adminToken, venueId);

        var response = await managerClient.PostAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/sync",
            null);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CreateAccountMapping_AsVenueManager_Returns403()
    {
        var (adminClient, venueId, adminToken) = await SetupFinancialAdminAsync();
        var managerClient = await CreateVenueManagerClientAsync(adminClient, adminToken, venueId);

        var response = await managerClient.PostAsJsonAsync(
            $"/api/venues/{venueId}/mappings",
            new SplitRail.Api.DTOs.Qbo.CreateMappingRequest(
                "ACC-999",
                "Test Account",
                "Production",
                null));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    private async Task<HttpClient> CreateVenueManagerClientAsync(
        HttpClient adminClient,
        string adminToken,
        Guid venueId)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var orgId = ParseTokenClaims(adminToken).OrganizationId!.Value;
        var role = await db.OrganizationRoles.FirstAsync(r =>
            r.OrganizationId == orgId && r.RoleName == RoleNames.VenueManager);

        var email = $"vm-{Guid.NewGuid():N}@example.com";
        var rawToken = await SendInvitationViaServiceAsync(adminToken, email, role.Id, [venueId]);
        var acceptResponse = await Client.PostAsJsonAsync("/api/invitations/accept",
            new SplitRail.Api.DTOs.Invitations.AcceptInvitationRequest(rawToken, "SecurePass1"));
        acceptResponse.EnsureSuccessStatusCode();
        var auth = await acceptResponse.Content.ReadFromJsonAsync<SplitRail.Api.DTOs.Invitations.AcceptInvitationResponse>();
        return CreateAuthenticatedClient(auth!.AccessToken);
    }

    private async Task<HttpClient> CreateExternalBookkeeperClientAsync(
        HttpClient adminClient,
        string adminToken,
        Guid venueId)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var orgId = ParseTokenClaims(adminToken).OrganizationId!.Value;
        var role = await db.OrganizationRoles.FirstAsync(r =>
            r.OrganizationId == orgId && r.RoleName == RoleNames.ExternalBookkeeper);

        var email = $"bk-{Guid.NewGuid():N}@example.com";
        var rawToken = await SendInvitationViaServiceAsync(adminToken, email, role.Id, [venueId]);
        var acceptResponse = await Client.PostAsJsonAsync("/api/invitations/accept",
            new SplitRail.Api.DTOs.Invitations.AcceptInvitationRequest(rawToken, "SecurePass1"));
        acceptResponse.EnsureSuccessStatusCode();
        var auth = await acceptResponse.Content.ReadFromJsonAsync<SplitRail.Api.DTOs.Invitations.AcceptInvitationResponse>();
        return CreateAuthenticatedClient(auth!.AccessToken);
    }
}
