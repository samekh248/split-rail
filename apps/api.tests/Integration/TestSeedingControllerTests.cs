using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Auth;
using SplitRail.Api.DTOs.Ledger;
using SplitRail.Api.DTOs.Seeding;
using SplitRail.Api.DTOs.Settlement;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class TestSeedingControllerTests : TestSeedingIntegrationTestBase
{
    [Fact]
    public async Task Reset_CreatesDeterministicOrganizationsAndUsers()
    {
        var seed = await ResetSeedAsync();

        seed.OrgA.AdminEmail.Should().Be("alpha-admin@e2e.test");
        seed.OrgB.AdminEmail.Should().Be("bravo-admin@e2e.test");
        seed.Sentinels.OrgAString.Should().Contain("E2E Org Alpha");
        seed.Sentinels.OrgBStrings.Should().Contain("E2E Org Bravo");
    }

    [Fact]
    public async Task Reset_Twice_ReplacesExistingSeedData()
    {
        var first = await ResetSeedAsync();
        var second = await ResetSeedAsync();

        second.OrgA.OrganizationId.Should().NotBe(first.OrgA.OrganizationId);
        second.OrgB.OrganizationId.Should().NotBe(first.OrgB.OrganizationId);
    }

    [Fact]
    public async Task SeedLifecycleEvent_ReturnsExpectedFinancials()
    {
        var seed = await ResetSeedAsync();
        var lifecycle = await SeedLifecycleEventAsync(seed.OrgA);

        lifecycle.QboTagName.Should().Be(FakeQboTransactionClient.LifecycleTagName);
        lifecycle.ExpectedVariance[FakeQboTransactionClient.LifecycleAccountId].Should().Be("3300.00");
        lifecycle.ExpectedSettlement.GrossRevenue.Should().Be("9500.00");
    }

    [Fact]
    public async Task MutateSettledEvent_BeforeSettlement_AllowsMutation()
    {
        var seed = await ResetSeedAsync();
        var lifecycle = await SeedLifecycleEventAsync(seed.OrgA);

        var response = await Client.PostAsJsonAsync("/api/test-seed/mutate-settled-event",
            new MutateSettledEventRequestDto(lifecycle.EventId, 9999.99m));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<MutateSettledEventResponseDto>();
        result!.Rejected.Should().BeFalse();
    }

    [Fact]
    public async Task MutateSettledEvent_AfterSettlement_RejectsMutation()
    {
        if (!IsQuestPdfSupported())
            return;

        var seed = await ResetSeedAsync();
        var lifecycle = await SeedLifecycleEventAsync(seed.OrgA);
        var adminClient = await LoginSeededAdminAsync(seed.OrgA.AdminEmail);
        await SettleLifecycleEventAsync(adminClient, seed.OrgA.InScopeVenueId, lifecycle.EventId);

        var response = await Client.PostAsJsonAsync("/api/test-seed/mutate-settled-event",
            new MutateSettledEventRequestDto(lifecycle.EventId, 9999.99m));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = await response.Content.ReadFromJsonAsync<MutateSettledEventResponseDto>();
        result!.Rejected.Should().BeTrue();
        result.Message.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task GetSettlementHash_AfterSettlement_ReturnsSha256Hex()
    {
        if (!IsQuestPdfSupported())
            return;

        var seed = await ResetSeedAsync();
        var lifecycle = await SeedLifecycleEventAsync(seed.OrgA);
        var adminClient = await LoginSeededAdminAsync(seed.OrgA.AdminEmail);
        await SettleLifecycleEventAsync(adminClient, seed.OrgA.InScopeVenueId, lifecycle.EventId);

        var response = await Client.GetAsync($"/api/test-seed/settlement-hash/{lifecycle.EventId}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var hash = await response.Content.ReadFromJsonAsync<SettlementPdfHashResponseDto>();
        hash!.HashHex.Should().HaveLength(64);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var evt = await db.Events.AsNoTracking().FirstAsync(e => e.Id == lifecycle.EventId);
        var archive = scope.ServiceProvider.GetRequiredService<InMemorySettlementArchiveStore>();
        var pdf = archive.GetStoredPdf(evt.SettlementPdfUrl!)!;
        var expected = Convert.ToHexString(SHA256.HashData(pdf)).ToLowerInvariant();
        hash.HashHex.Should().Be(expected);
    }

    [Fact]
    public async Task GetSettlementPdf_ReturnsStoredDocument()
    {
        if (!IsQuestPdfSupported())
            return;

        var seed = await ResetSeedAsync();
        var lifecycle = await SeedLifecycleEventAsync(seed.OrgA);
        var adminClient = await LoginSeededAdminAsync(seed.OrgA.AdminEmail);
        await SettleLifecycleEventAsync(adminClient, seed.OrgA.InScopeVenueId, lifecycle.EventId);

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var evt = await db.Events.AsNoTracking().FirstAsync(e => e.Id == lifecycle.EventId);

        var response = await Client.GetAsync($"/api/test-seed/settlement-pdf/{evt.SettlementPdfUrl}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        response.Content.Headers.ContentType!.MediaType.Should().Be("application/pdf");
        var bytes = await response.Content.ReadAsByteArrayAsync();
        bytes.Take(4).Should().BeEquivalentTo(new byte[] { 0x25, 0x50, 0x44, 0x46 });
    }

    [Fact]
    public async Task GetQboEgress_ReturnsOk()
    {
        await ResetSeedAsync();
        var response = await Client.GetAsync("/api/test-seed/qbo-egress");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task SeedLifecycleEvent_UnknownVenue_Returns404()
    {
        await ResetSeedAsync();
        var response = await Client.PostAsJsonAsync("/api/test-seed/lifecycle-event",
            new LifecycleEventSeedRequestDto(Guid.NewGuid(), Guid.NewGuid()));
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetSettlementPdf_MissingPath_Returns404()
    {
        await ResetSeedAsync();
        var response = await Client.GetAsync("/api/test-seed/settlement-pdf/missing/path.pdf");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetSettlementHash_WithoutPdf_Returns404()
    {
        var seed = await ResetSeedAsync();
        var lifecycle = await SeedLifecycleEventAsync(seed.OrgA);

        var response = await Client.GetAsync($"/api/test-seed/settlement-hash/{lifecycle.EventId}");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    private async Task<ResetSeedResponseDto> ResetSeedAsync()
    {
        var response = await Client.PostAsync("/api/test-seed/reset", null);
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        return (await response.Content.ReadFromJsonAsync<ResetSeedResponseDto>())!;
    }

    private async Task<LifecycleEventSeedResponseDto> SeedLifecycleEventAsync(OrgSeedContextDto org)
    {
        var response = await Client.PostAsJsonAsync("/api/test-seed/lifecycle-event",
            new LifecycleEventSeedRequestDto(org.OrganizationId, org.InScopeVenueId));
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        return (await response.Content.ReadFromJsonAsync<LifecycleEventSeedResponseDto>())!;
    }

    private async Task<HttpClient> LoginSeededAdminAsync(string email)
    {
        var loginResponse = await Client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(email, TestSeedingService.E2ePassword));
        loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var auth = await loginResponse.Content.ReadFromJsonAsync<AuthResponse>();
        return CreateAuthenticatedClient(auth!.AccessToken);
    }

    private async Task SettleLifecycleEventAsync(HttpClient adminClient, Guid venueId, Guid eventId)
    {
        await adminClient.PostAsync($"/api/venues/{venueId}/events/{eventId}/lock-budget", null);
        var response = await adminClient.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{eventId}/settle",
            new FinalizeSettlementRequest(ValidSignatureBase64(), true));
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}

public class TestSeedingDisabledTests : IntegrationTestBase
{
    [Fact]
    public async Task Reset_WhenDisabled_Returns404()
    {
        var response = await Client.PostAsync("/api/test-seed/reset", null);
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }
}
