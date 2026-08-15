using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using SplitRail.Api.DTOs.Festivals;
using Xunit;
using static SplitRail.Api.Tests.Integration.BlockSettlementTestHelpers;
using static SplitRail.Api.Tests.Integration.ProgrammingBlockTests;
using static SplitRail.Api.Tests.Integration.RevenueAllocationTests;

namespace SplitRail.Api.Tests.Integration;

public class BlockSettlementIsolationTests : IntegrationTestBase
{
    [Fact]
    public async Task SettlementSheet_ContainsOnlyThisBlocksDeal()
    {
        var (client, venueId, _) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var bucket = await CreateBucketAsync(client, venueId, festival, "Wristbands", 100_000m);

        var target = await CreateBlockAsync(
            client, venueId, festival, "Headliner", "20:00", "22:00", requiresSettlement: true);
        var other = await CreateBlockAsync(
            client, venueId, festival, "Opener", "18:00", "19:00", requiresSettlement: true);

        await AllocateAsync(client, venueId, festival, bucket.Id, target.Id, 10m);
        await AllocateAsync(client, venueId, festival, bucket.Id, other.Id, 5m);

        await client.PutAsJsonAsync(
            $"{SettlementPath(venueId, festival.EventId, target.Id)}/deal-terms",
            new UpdateBlockDealTermsRequest("guarantee", 8_000m, 0m, "GROSS"));
        await client.PutAsJsonAsync(
            $"{SettlementPath(venueId, festival.EventId, other.Id)}/deal-terms",
            new UpdateBlockDealTermsRequest("guarantee", 2_000m, 0m, "GROSS"));

        var sheet = await client.GetFromJsonAsync<BlockSettlementSheetResponse>(
            SettlementPath(venueId, festival.EventId, target.Id));

        sheet!.BlockId.Should().Be(target.Id);
        sheet.DealTerms.BaseGuarantee.Should().Be(8_000m);
        sheet.Allocations.Should().ContainSingle(a => a.BucketName == "Wristbands");
        sheet.Allocations.Should().NotContain(a => a.CalculatedAmount == 5_000m,
            "other blocks' allocation lines must not appear");

        var json = await (await client.GetAsync(
            SettlementPath(venueId, festival.EventId, target.Id))).Content.ReadAsStringAsync();
        json.Should().NotContain("totalAllocated");
        json.Should().NotContain("remaining");
        json.Should().NotContain("2_000");
    }
}
