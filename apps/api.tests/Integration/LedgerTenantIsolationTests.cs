using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Auth;
using SplitRail.Api.DTOs.Invitations;
using SplitRail.Api.DTOs.Ledger;
using SplitRail.Api.DTOs.Roles;
using SplitRail.Api.DTOs.Venues;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class LedgerTenantIsolationTests : IntegrationTestBase
{
    [Fact]
    public async Task CrossOrg_LedgerAccess_Returns404()
    {
        var (clientA, venueAId, _) = await SetupFinancialAdminAsync();
        var evtA = await CreateEventViaApiAsync(clientA, venueAId);

        var emailB = $"orgb-{Guid.NewGuid():N}@example.com";
        var (tokenB, _, _) = await RegisterAndLoginAsync(emailB);
        tokenB = await CreateOrgAndGetTokenAsync(tokenB, emailB, "SecurePass1");
        using var clientB = CreateAuthenticatedClient(tokenB);

        var response = await clientB.GetAsync(
            $"/api/venues/{venueAId}/events/{evtA.EventId}/ledger");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ScopedUser_OtherVenueInSameOrg_Returns404()
    {
        var (adminClient, venueAId, adminToken) = await SetupFinancialAdminAsync();
        var evtA = await CreateEventViaApiAsync(adminClient, venueAId);

        var venueBResponse = await adminClient.PostAsJsonAsync("/api/venues",
            new CreateVenueRequest("Venue B"));
        var venueB = await venueBResponse.Content.ReadFromJsonAsync<VenueResponse>();

        var scopedEmail = $"scoped-{Guid.NewGuid():N}@example.com";
        var (scopedClient, _) = await CreateScopedVenueUserAsync(
            adminToken, venueB!.Id, scopedEmail);

        var response = await scopedClient.GetAsync(
            $"/api/venues/{venueAId}/events/{evtA.EventId}/ledger");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PromoterRole_HiddenRowsFilteredFromLedger()
    {
        var (adminClient, venueId, adminToken) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(adminClient, venueId);

        await SeedLineItemDirectAsync(adminToken, evt.EventId, "REVENUE", 5000m, isHiddenFromPromoter: false);
        await SeedLineItemDirectAsync(adminToken, evt.EventId, "REVENUE", 3000m, isHiddenFromPromoter: true);

        var roles = await adminClient.GetFromJsonAsync<List<RoleResponse>>("/api/roles");
        var promoterRoleId = roles!.Single(r => r.RoleName == RoleNames.Promoter).Id;

        var promoterEmail = $"promoter-{Guid.NewGuid():N}@example.com";
        var rawToken = await SendInvitationViaServiceAsync(
            adminToken, promoterEmail, promoterRoleId, [venueId]);
        await Client.PostAsJsonAsync("/api/invitations/accept",
            new AcceptInvitationRequest(rawToken, "SecurePass1"));
        var loginResponse = await Client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(promoterEmail, "SecurePass1"));
        var auth = await loginResponse.Content.ReadFromJsonAsync<AuthResponse>();
        using var promoterClient = CreateAuthenticatedClient(auth!.AccessToken);

        var ledger = await promoterClient.GetFromJsonAsync<LedgerGridResponse>(
            $"/api/venues/{venueId}/events/{evt.EventId}/ledger");

        var revenueRows = ledger!.Blocks.Single(b => b.BlockType == "REVENUE").Rows;
        revenueRows.Should().HaveCount(1);
        revenueRows[0].ProformaValue.Should().Be(5000m);
    }
}
