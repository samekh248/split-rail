using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Roles;
using SplitRail.Api.DTOs.Venues;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class EventPinControllerTests : IntegrationTestBase
{
    [Fact]
    public async Task PinEvent_Returns204_AndCreatesPinRow()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (userId, _) = ParseTokenClaims(token);
        var evt = await CreateEventViaApiAsync(client, venueId);

        var response = await client.PutAsync($"/api/venues/{venueId}/events/{evt.EventId}/pin", null);
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var pin = await GetPinAsync(token, userId, evt.EventId);
        pin.Should().NotBeNull();
        pin!.PinnedAt.Should().BeAfter(DateTimeOffset.UtcNow.AddMinutes(-1));
    }

    [Fact]
    public async Task PinEvent_Idempotent_DoesNotDuplicate()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (userId, _) = ParseTokenClaims(token);
        var evt = await CreateEventViaApiAsync(client, venueId);

        var first = await client.PutAsync($"/api/venues/{venueId}/events/{evt.EventId}/pin", null);
        var second = await client.PutAsync($"/api/venues/{venueId}/events/{evt.EventId}/pin", null);

        first.StatusCode.Should().Be(HttpStatusCode.NoContent);
        second.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var pinCount = await CountPinsAsync(token, userId, evt.EventId);
        pinCount.Should().Be(1);
    }

    [Fact]
    public async Task PinEvent_WithoutViewFinancials_Returns403()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);

        var roles = await client.GetFromJsonAsync<List<RoleResponse>>("/api/roles");
        var adminRoleId = roles!.Single(r => r.RoleName == RoleNames.Admin).Id;
        await client.PatchAsJsonAsync($"/api/roles/{adminRoleId}",
            new UpdateRoleRequest(null, null, null, null, null, null, null, CanViewFinancials: false));

        var response = await client.PutAsync($"/api/venues/{venueId}/events/{evt.EventId}/pin", null);
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UnpinEvent_Returns204_AndRemovesPinRow()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (userId, _) = ParseTokenClaims(token);
        var evt = await CreateEventViaApiAsync(client, venueId);

        await client.PutAsync($"/api/venues/{venueId}/events/{evt.EventId}/pin", null);

        var response = await client.DeleteAsync($"/api/venues/{venueId}/events/{evt.EventId}/pin");
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);

        var pin = await GetPinAsync(token, userId, evt.EventId);
        pin.Should().BeNull();
    }

    [Fact]
    public async Task UnpinEvent_WhenNotPinned_Returns204()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var evt = await CreateEventViaApiAsync(client, venueId);

        var response = await client.DeleteAsync($"/api/venues/{venueId}/events/{evt.EventId}/pin");
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task UnpinEvent_PerUserIsolation_TwoUsersSameEvent()
    {
        var (adminClient, venueId, adminToken) = await SetupFinancialAdminAsync();
        var (adminUserId, _) = ParseTokenClaims(adminToken);
        var evt = await CreateEventViaApiAsync(adminClient, venueId);

        var userBEmail = $"pin-b-{Guid.NewGuid():N}@example.com";
        var (userBClient, userBId) = await CreateScopedVenueUserAsync(adminToken, venueId, userBEmail);

        (await adminClient.PutAsync($"/api/venues/{venueId}/events/{evt.EventId}/pin", null))
            .EnsureSuccessStatusCode();
        (await userBClient.PutAsync($"/api/venues/{venueId}/events/{evt.EventId}/pin", null))
            .EnsureSuccessStatusCode();

        (await adminClient.DeleteAsync($"/api/venues/{venueId}/events/{evt.EventId}/pin"))
            .EnsureSuccessStatusCode();

        (await GetPinAsync(adminToken, adminUserId, evt.EventId)).Should().BeNull();
        (await GetPinAsync(adminToken, userBId, evt.EventId)).Should().NotBeNull();
    }

    [Fact]
    public async Task PinEvent_CrossOrg_Returns404()
    {
        var emailA = $"pin-org-a-{Guid.NewGuid():N}@example.com";
        var (clientA, venueA, _) = await SetupFinancialAdminAsync(emailA);
        var evt = await CreateEventViaApiAsync(clientA, venueA);

        var emailB = $"pin-org-b-{Guid.NewGuid():N}@example.com";
        var (clientB, _, _) = await SetupFinancialAdminAsync(emailB);

        var response = await clientB.PutAsync($"/api/venues/{venueA}/events/{evt.EventId}/pin", null);
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PinEvent_OutOfScopeVenue_Returns404()
    {
        var (adminClient, venueA, adminToken) = await SetupFinancialAdminAsync();
        var venueBResponse = await adminClient.PostAsJsonAsync("/api/venues", new CreateVenueRequest("Venue B"));
        venueBResponse.EnsureSuccessStatusCode();
        var venueB = await venueBResponse.Content.ReadFromJsonAsync<VenueResponse>();
        var evt = await CreateEventViaApiAsync(adminClient, venueB!.Id);

        var scopedEmail = $"scoped-{Guid.NewGuid():N}@example.com";
        var (scopedClient, _) = await CreateScopedVenueUserAsync(adminToken, venueA, scopedEmail);

        var response = await scopedClient.PutAsync(
            $"/api/venues/{venueB.Id}/events/{evt.EventId}/pin", null);
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PinEvent_WrongVenueIdForEvent_Returns404()
    {
        var (client, venueA, _) = await SetupFinancialAdminAsync();
        var venueBResponse = await client.PostAsJsonAsync("/api/venues", new CreateVenueRequest("Other Venue"));
        venueBResponse.EnsureSuccessStatusCode();
        var venueB = await venueBResponse.Content.ReadFromJsonAsync<VenueResponse>();
        var evt = await CreateEventViaApiAsync(client, venueA);

        var response = await client.PutAsync($"/api/venues/{venueB!.Id}/events/{evt.EventId}/pin", null);
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task PinEvent_EventDelete_CascadesPinRemoval()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var (userId, orgId) = ParseTokenClaims(token);
        var evt = await CreateEventViaApiAsync(client, venueId);

        (await client.PutAsync($"/api/venues/{venueId}/events/{evt.EventId}/pin", null))
            .EnsureSuccessStatusCode();

        (await GetPinAsync(token, userId, evt.EventId)).Should().NotBeNull();

        (await client.DeleteAsync($"/api/venues/{venueId}/events/{evt.EventId}"))
            .EnsureSuccessStatusCode();

        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        tenantContext.SetContext(userId, orgId);

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var pinCount = await db.UserEventPins.CountAsync();
        pinCount.Should().Be(0);
    }

    private async Task<SplitRail.Api.Models.UserEventPin?> GetPinAsync(
        string accessToken,
        Guid userId,
        Guid eventId)
    {
        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (_, orgId) = ParseTokenClaims(accessToken);
        tenantContext.SetContext(userId, orgId);

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return await db.UserEventPins
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId && p.EventId == eventId);
    }

    private async Task<int> CountPinsAsync(string accessToken, Guid userId, Guid eventId)
    {
        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (_, orgId) = ParseTokenClaims(accessToken);
        tenantContext.SetContext(userId, orgId);

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return await db.UserEventPins
            .AsNoTracking()
            .CountAsync(p => p.UserId == userId && p.EventId == eventId);
    }
}
