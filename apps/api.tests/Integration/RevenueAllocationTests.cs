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

namespace SplitRail.Api.Tests.Integration;

/// <summary>
/// Controlled revenue allocation — the financial core that makes isolated sub-settlements
/// safe (spec FR-018 – FR-024).
/// </summary>
public class RevenueAllocationTests : IntegrationTestBase
{
    [Fact]
    public async Task Buckets_AreNotAllocableByDefault()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);

        var response = await client.PostAsJsonAsync(
            BucketsPath(venueId, festival.EventId),
            new CreateRevenueBucketRequest("3-Day Wristbands", 100_000m));

        var bucket = await response.Content.ReadFromJsonAsync<RevenueBucketResponse>();
        bucket!.IsAllocable.Should().BeFalse(
            "allocation is opt-in; revenue must never be allocable by accident");
        bucket.Remaining.Should().Be(100_000m);
    }

    [Fact]
    public async Task NonAllocableBucket_RejectsAllocations()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var bucket = await CreateBucketAsync(client, venueId, festival, "Taxes", 5_000m, allocable: false);
        var block = await CreateBlockAsync(client, venueId, festival, "Act", "20:00", "21:00",
            requiresSettlement: true);

        var response = await client.PostAsJsonAsync(
            AllocationsPath(venueId, festival.EventId),
            new CreateRevenueAllocationRequest(bucket.Id, block.Id, "PERCENT_OF_BUCKET", Percentage: 10m));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadAsStringAsync()).Should().Contain("not marked allocable");
    }

    [Fact]
    public async Task Allocation_ComputesAmountAndUpdatesLiveBalances()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var bucket = await CreateBucketAsync(client, venueId, festival, "Wristbands", 100_000m);
        var block = await CreateBlockAsync(client, venueId, festival, "Cody Jinks", "20:00", "22:00",
            requiresSettlement: true);

        var response = await client.PostAsJsonAsync(
            AllocationsPath(venueId, festival.EventId),
            new CreateRevenueAllocationRequest(bucket.Id, block.Id, "PERCENT_OF_BUCKET", Percentage: 5m));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var allocation = await response.Content.ReadFromJsonAsync<RevenueAllocationResponse>();
        allocation!.CalculatedAmount.Should().Be(5_000m, "5% of 100,000");
        allocation.BucketRemaining.Should().Be(95_000m);
        allocation.BucketName.Should().Be("Wristbands", "every allocation names its source bucket");

        var buckets = await client.GetFromJsonAsync<List<RevenueBucketResponse>>(
            BucketsPath(venueId, festival.EventId));
        buckets!.Single().TotalAllocated.Should().Be(5_000m);
        buckets.Single().Remaining.Should().Be(95_000m);
    }

    [Fact]
    public async Task FixedAmountAllocation_IsSupported()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var bucket = await CreateBucketAsync(client, venueId, festival, "VIP", 20_000m);
        var block = await CreateBlockAsync(client, venueId, festival, "Act", "20:00", "21:00",
            requiresSettlement: true);

        var response = await client.PostAsJsonAsync(
            AllocationsPath(venueId, festival.EventId),
            new CreateRevenueAllocationRequest(bucket.Id, block.Id, "FIXED_AMOUNT", Amount: 2_500m));

        var allocation = await response.Content.ReadFromJsonAsync<RevenueAllocationResponse>();
        allocation!.CalculatedAmount.Should().Be(2_500m);
        allocation.BucketRemaining.Should().Be(17_500m);
    }

    [Fact]
    public async Task MultipleBlocks_ShareOneBucketWithRunningBalance()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var bucket = await CreateBucketAsync(client, venueId, festival, "Wristbands", 100_000m);

        var first = await CreateBlockAsync(client, venueId, festival, "Act A", "18:00", "19:00",
            requiresSettlement: true);
        var second = await CreateBlockAsync(client, venueId, festival, "Act B", "20:00", "21:00",
            requiresSettlement: true);

        await AllocateAsync(client, venueId, festival, bucket.Id, first.Id, 60m);
        var response = await AllocateRawAsync(client, venueId, festival, bucket.Id, second.Id, 30m);

        var allocation = await response.Content.ReadFromJsonAsync<RevenueAllocationResponse>();
        allocation!.BucketRemaining.Should().Be(10_000m, "60% + 30% of 100,000 leaves 10,000");
    }

    [Fact]
    public async Task OverAllocation_SurfacesWarningWhenOverrideAllowed()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var bucket = await CreateBucketAsync(client, venueId, festival, "Wristbands", 100_000m);

        var first = await CreateBlockAsync(client, venueId, festival, "Act A", "18:00", "19:00",
            requiresSettlement: true);
        var second = await CreateBlockAsync(client, venueId, festival, "Act B", "20:00", "21:00",
            requiresSettlement: true);

        await AllocateAsync(client, venueId, festival, bucket.Id, first.Id, 80m);

        // Admin holds override permission, so this succeeds but must report the conflict.
        var response = await AllocateRawAsync(client, venueId, festival, bucket.Id, second.Id, 40m);
        var allocation = await response.Content.ReadFromJsonAsync<RevenueAllocationResponse>();

        allocation!.BucketRemaining.Should().BeLessThan(0m);
        allocation.Warnings.Should().Contain(w => w.Code == "BUCKET_OVERALLOCATED");
    }

    [Fact]
    public async Task ReducingBucketBelowAllocatedTotal_IsRejected()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var bucket = await CreateBucketAsync(client, venueId, festival, "Wristbands", 100_000m);
        var block = await CreateBlockAsync(client, venueId, festival, "Act", "20:00", "21:00",
            requiresSettlement: true);
        await AllocateAsync(client, venueId, festival, bucket.Id, block.Id, 50m);

        var response = await client.PutAsJsonAsync(
            $"{BucketsPath(venueId, festival.EventId)}/{bucket.Id}",
            new UpdateRevenueBucketRequest("Wristbands", 10_000m, true));

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await response.Content.ReadAsStringAsync()).Should().Contain("already has");
    }

    [Fact]
    public async Task DuplicateBucketName_IsRejected()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        await CreateBucketAsync(client, venueId, festival, "Wristbands", 100m);

        var response = await client.PostAsJsonAsync(
            BucketsPath(venueId, festival.EventId),
            new CreateRevenueBucketRequest("wristbands", 500m));

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task DeletingBucketWithAllocations_IsRejected()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var bucket = await CreateBucketAsync(client, venueId, festival, "Wristbands", 100_000m);
        var block = await CreateBlockAsync(client, venueId, festival, "Act", "20:00", "21:00",
            requiresSettlement: true);
        await AllocateAsync(client, venueId, festival, bucket.Id, block.Id, 10m);

        var response = await client.DeleteAsync(
            $"{BucketsPath(venueId, festival.EventId)}/{bucket.Id}");

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task OverAllocation_IsRejectedWithoutOverridePermission()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        await DisableOverrideSettlementsAsync(token);

        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var bucket = await CreateBucketAsync(client, venueId, festival, "Wristbands", 100_000m);

        var first = await CreateBlockAsync(client, venueId, festival, "Act A", "18:00", "19:00",
            requiresSettlement: true);
        var second = await CreateBlockAsync(client, venueId, festival, "Act B", "20:00", "21:00",
            requiresSettlement: true);

        await AllocateAsync(client, venueId, festival, bucket.Id, first.Id, 80m);

        var response = await AllocateRawAsync(client, venueId, festival, bucket.Id, second.Id, 40m);
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await response.Content.ReadAsStringAsync()).Should().Contain("exceed");
    }

    [Fact]
    public async Task AllocationEdit_WritesBeforeAndAfterAuditEntry()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var bucket = await CreateBucketAsync(client, venueId, festival, "Wristbands", 100_000m);
        var block = await CreateBlockAsync(client, venueId, festival, "Act", "20:00", "21:00",
            requiresSettlement: true);
        var allocation = await AllocateAsync(client, venueId, festival, bucket.Id, block.Id, 10m);

        var response = await client.PutAsJsonAsync(
            $"{AllocationsPath(venueId, festival.EventId)}/{allocation.Id}",
            new UpdateRevenueAllocationRequest("PERCENT_OF_BUCKET", Percentage: 15m));
        response.EnsureSuccessStatusCode();

        var entries = await GetAllocationAuditEntriesAsync(token, festival.EventId, allocation.Id);
        var editEntry = entries.Should().ContainSingle(e =>
            e.Action == "AllocationEdit" && e.PriorValueJson != null).Subject;
        editEntry.PriorValueJson.Should().Contain("10");
        editEntry.NewValueJson.Should().Contain("15");
    }

    [Fact]
    public async Task AllocationEdit_OnFinalizedBlock_Returns409()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var bucket = await CreateBucketAsync(client, venueId, festival, "Wristbands", 100_000m);
        var block = await CreateBlockAsync(client, venueId, festival, "Act", "20:00", "21:00",
            requiresSettlement: true);
        var allocation = await AllocateAsync(client, venueId, festival, bucket.Id, block.Id, 10m);

        await FinalizeBlockSettlementDirectAsync(token, block.Id);

        var response = await client.PutAsJsonAsync(
            $"{AllocationsPath(venueId, festival.EventId)}/{allocation.Id}",
            new UpdateRevenueAllocationRequest("PERCENT_OF_BUCKET", Percentage: 20m));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadAsStringAsync()).Should().Contain("finalized");
    }

    [Fact]
    public async Task AllocationEndpoints_RejectCrossOrganizationAccess()
    {
        var (ownerClient, ownerVenueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(ownerClient, ownerVenueId);

        var (otherClient, _, _) = await SetupFinancialAdminAsync();

        (await otherClient.GetAsync(BucketsPath(ownerVenueId, festival.EventId)))
            .StatusCode.Should().Be(HttpStatusCode.NotFound);

        (await otherClient.PostAsJsonAsync(
            BucketsPath(ownerVenueId, festival.EventId),
            new CreateRevenueBucketRequest("Sneaky", 1m)))
            .StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    // ---- helpers ---------------------------------------------------------

    internal static string BucketsPath(Guid venueId, Guid eventId) =>
        $"/api/venues/{venueId}/festivals/{eventId}/buckets";

    internal static string AllocationsPath(Guid venueId, Guid eventId) =>
        $"/api/venues/{venueId}/festivals/{eventId}/allocations";

    internal static async Task<RevenueBucketResponse> CreateBucketAsync(
        HttpClient client,
        Guid venueId,
        FestivalResponse festival,
        string name,
        decimal amount,
        bool allocable = true)
    {
        var response = await client.PostAsJsonAsync(
            BucketsPath(venueId, festival.EventId),
            new CreateRevenueBucketRequest(name, amount, allocable));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<RevenueBucketResponse>())!;
    }

    internal static async Task<RevenueAllocationResponse> AllocateAsync(
        HttpClient client,
        Guid venueId,
        FestivalResponse festival,
        Guid bucketId,
        Guid blockId,
        decimal percentage)
    {
        var response = await AllocateRawAsync(client, venueId, festival, bucketId, blockId, percentage);
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<RevenueAllocationResponse>())!;
    }

    internal static Task<HttpResponseMessage> AllocateRawAsync(
        HttpClient client,
        Guid venueId,
        FestivalResponse festival,
        Guid bucketId,
        Guid blockId,
        decimal percentage) =>
        client.PostAsJsonAsync(
            AllocationsPath(venueId, festival.EventId),
            new CreateRevenueAllocationRequest(
                bucketId, blockId, "PERCENT_OF_BUCKET", Percentage: percentage));

    private async Task DisableOverrideSettlementsAsync(string accessToken)
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

    private async Task FinalizeBlockSettlementDirectAsync(string accessToken, Guid blockId)
    {
        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (userId, orgId) = ParseTokenClaims(accessToken);
        tenantContext.SetContext(userId, orgId);

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var block = await db.ProgrammingBlocks.FirstAsync(b => b.Id == blockId);
        block.SettlementStatus = BlockSettlementStatus.Finalized;
        block.FinalizedAt = DateTimeOffset.UtcNow;
        block.FinalizedByUserId = userId;
        await db.SaveChangesAsync();
    }

    private async Task<List<FestivalAuditEntryResponse>> GetAllocationAuditEntriesAsync(
        string accessToken,
        Guid eventId,
        Guid allocationId)
    {
        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (userId, orgId) = ParseTokenClaims(accessToken);
        tenantContext.SetContext(userId, orgId);

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        return await db.FestivalAuditEntries
            .AsNoTracking()
            .Where(e => e.EventId == eventId
                        && e.EntityType == "RevenueAllocation"
                        && e.EntityId == allocationId)
            .OrderBy(e => e.OccurredAt)
            .Select(e => new FestivalAuditEntryResponse(
                e.Id, e.EntityType, e.EntityId, e.Action,
                e.PriorValueJson, e.NewValueJson, e.UserId, e.OccurredAt, e.Reason))
            .ToListAsync();
    }
}
