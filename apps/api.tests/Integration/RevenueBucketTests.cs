using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Festivals;
using SplitRail.Api.Models.Enums;
using SplitRail.Api.Services;
using Xunit;
using static SplitRail.Api.Tests.Integration.ProgrammingBlockTests;
using static SplitRail.Api.Tests.Integration.RevenueAllocationTests;

namespace SplitRail.Api.Tests.Integration;

/// <summary>
/// Revenue bucket defaults, locking, and edit guards (spec FR-018, FR-020, FR-024).
/// </summary>
public class RevenueBucketTests : IntegrationTestBase
{
    [Fact]
    public async Task CreateBucket_IsNotAllocableByDefault()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        var response = await client.PostAsJsonAsync(
            BucketsPath(venueId, festival.EventId),
            new CreateRevenueBucketRequest("Merch", 5_000m));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var bucket = await response.Content.ReadFromJsonAsync<RevenueBucketResponse>();
        bucket!.IsAllocable.Should().BeFalse();
    }

    [Fact]
    public async Task NonAllocableBucket_RejectsAllocationWrites()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var bucket = await CreateBucketAsync(client, venueId, festival, "Taxes", 1_000m, allocable: false);
        var block = await CreateBlockAsync(client, venueId, festival, "Act", "20:00", "21:00",
            requiresSettlement: true);

        var response = await client.PostAsJsonAsync(
            AllocationsPath(venueId, festival.EventId),
            new CreateRevenueAllocationRequest(bucket.Id, block.Id, "FIXED_AMOUNT", Amount: 100m));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task LockedBucket_RejectsAmountEditWithoutOverride()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        await DisableOverrideSettlementsDirectAsync(token);
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var bucket = await CreateBucketAsync(client, venueId, festival, "Wristbands", 10_000m);
        var block = await CreateBlockAsync(client, venueId, festival, "Act", "20:00", "21:00",
            requiresSettlement: true);
        await AllocateAsync(client, venueId, festival, bucket.Id, block.Id, 10m);

        await LockBucketForBlockAsync(token, block.Id);

        var response = await client.PutAsJsonAsync(
            $"{BucketsPath(venueId, festival.EventId)}/{bucket.Id}",
            new UpdateRevenueBucketRequest("Wristbands", 12_000m, true));

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await response.Content.ReadAsStringAsync()).Should().Contain("locked");
    }

    [Fact]
    public async Task LockedBucket_AllowsEditWithOverridePermission()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var bucket = await CreateBucketAsync(client, venueId, festival, "VIP", 8_000m);
        var block = await CreateBlockAsync(client, venueId, festival, "Act", "20:00", "21:00",
            requiresSettlement: true);
        await AllocateAsync(client, venueId, festival, bucket.Id, block.Id, 5m);
        await LockBucketForBlockAsync(token, block.Id);

        var response = await client.PutAsJsonAsync(
            $"{BucketsPath(venueId, festival.EventId)}/{bucket.Id}",
            new UpdateRevenueBucketRequest("VIP", 9_000m, true));

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var updated = await response.Content.ReadFromJsonAsync<RevenueBucketResponse>();
        updated!.Amount.Should().Be(9_000m);
    }

    [Fact]
    public async Task SettlementFinalization_LocksReferencedBuckets()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var bucket = await CreateBucketAsync(client, venueId, festival, "Wristbands", 10_000m);
        var block = await CreateBlockAsync(client, venueId, festival, "Act", "20:00", "21:00",
            requiresSettlement: true);
        await AllocateAsync(client, venueId, festival, bucket.Id, block.Id, 25m);

        await LockBucketForBlockAsync(token, block.Id);

        var buckets = await client.GetFromJsonAsync<List<RevenueBucketResponse>>(
            BucketsPath(venueId, festival.EventId));
        buckets!.Single(b => b.Id == bucket.Id).LockedAt.Should().NotBeNull();
    }

    private async Task LockBucketForBlockAsync(string accessToken, Guid blockId)
    {
        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (userId, orgId) = ParseTokenClaims(accessToken);
        tenantContext.SetContext(userId, orgId);

        var allocationService = scope.ServiceProvider.GetRequiredService<FestivalAllocationService>();
        await allocationService.LockBucketsForBlockAsync(blockId, userId);
        await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().SaveChangesAsync();
    }

    private async Task DisableOverrideSettlementsDirectAsync(string accessToken)
    {
        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (userId, orgId) = ParseTokenClaims(accessToken);
        tenantContext.SetContext(userId, orgId);

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var role = await db.OrganizationRoles.FirstAsync(r =>
            r.OrganizationId == orgId && r.RoleName == RoleNames.Admin);
        role.CanOverrideSettlements = false;
        await db.SaveChangesAsync();
    }
}
