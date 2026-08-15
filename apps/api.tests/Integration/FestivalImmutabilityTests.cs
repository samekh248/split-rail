using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SplitRail.Api.Data;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;
using SplitRail.Api.Services;
using Xunit;
using static SplitRail.Api.Tests.Integration.BlockSettlementTestHelpers;

namespace SplitRail.Api.Tests.Integration;

public class FestivalImmutabilityTests : IntegrationTestBase
{
    [Fact]
    public async Task Interceptor_RejectsDirectMutationOfFinalizedSettlementFields()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var (block, _) = await SeedSettlementReadyBlockAsync(client, venueId, festival);

        var preflight = await client.GetFromJsonAsync<SplitRail.Api.DTOs.Festivals.FinalizePreflightResponse>(
            PreflightPath(venueId, festival.EventId, block.Id));
        (await FinalizeRawAsync(
            client, venueId, festival.EventId, block.Id, expectedNetPayable: preflight!.FinalPayable))
            .EnsureSuccessStatusCode();

        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (userId, orgId) = ParseTokenClaims(token);
        tenantContext.SetContext(userId, orgId);

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var stored = await db.ProgrammingBlocks.FirstAsync(b => b.Id == block.Id);
        stored.BaseGuarantee = 999m;

        var act = async () => await db.SaveChangesAsync();
        await act.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task Interceptor_RejectsLineItemChangesOnFinalizedSettlement()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var festival = await FestivalStructureTests.CreateFestivalAsync(client, venueId);
        var (block, _) = await SeedSettlementReadyBlockAsync(client, venueId, festival);

        var preflight = await client.GetFromJsonAsync<SplitRail.Api.DTOs.Festivals.FinalizePreflightResponse>(
            PreflightPath(venueId, festival.EventId, block.Id));
        (await FinalizeRawAsync(
            client, venueId, festival.EventId, block.Id, expectedNetPayable: preflight!.FinalPayable))
            .EnsureSuccessStatusCode();

        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (userId, orgId) = ParseTokenClaims(token);
        tenantContext.SetContext(userId, orgId);

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.BlockSettlementLineItems.Add(new BlockSettlementLineItem
        {
            Id = Guid.NewGuid(),
            ProgrammingBlockId = block.Id,
            LineType = BlockSettlementLineType.Deduction,
            Label = "Sneaky",
            Amount = 100m,
            EnteredByUserId = userId,
            EnteredAt = DateTimeOffset.UtcNow
        });

        var act = async () => await db.SaveChangesAsync();
        await act.Should().ThrowAsync<InvalidOperationException>();
    }
}
