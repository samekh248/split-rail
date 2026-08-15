using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SplitRail.Api.Data;
using SplitRail.Api.Models.Enums;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

/// <summary>
/// The festival migration is purely additive: every new column must default so that existing
/// rows and existing behavior are untouched (spec SC-007 — standard events unchanged).
/// IntegrationTestBase applies real migrations, so these assertions run against the actual
/// generated schema rather than the model snapshot.
/// </summary>
public class FestivalMigrationTests : IntegrationTestBase
{
    [Fact]
    public async Task Migration_CreatesAllFestivalTables()
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var expectedTables = new[]
        {
            "stage_zones",
            "programming_blocks",
            "festival_artists",
            "revenue_buckets",
            "revenue_allocations",
            "expense_allocations",
            "block_settlement_line_items",
            "block_settlement_revisions",
            "stage_zone_assignments",
            "festival_audit_entries"
        };

        var connection = db.Database.GetDbConnection();
        await db.Database.OpenConnectionAsync();

        foreach (var table in expectedTables)
        {
            await using var command = connection.CreateCommand();
            command.CommandText =
                "SELECT COUNT(*) FROM information_schema.tables " +
                "WHERE table_schema = 'public' AND table_name = @name";
            var parameter = command.CreateParameter();
            parameter.ParameterName = "@name";
            parameter.Value = table;
            command.Parameters.Add(parameter);

            var count = Convert.ToInt32(await command.ExecuteScalarAsync());
            count.Should().Be(1, $"table {table} should exist after migration");
        }
    }

    [Fact]
    public async Task ExistingEventsDefaultToStandardType()
    {
        var (client, venueId, token) = await SetupFinancialAdminAsync();
        var created = await CreateEventViaApiAsync(client, venueId);

        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (userId, orgId) = ParseTokenClaims(token);
        tenantContext.SetContext(userId, orgId);
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var evt = await db.Events.AsNoTracking().FirstAsync(e => e.Id == created.EventId);

        evt.EventType.Should().Be(EventType.Standard);
        evt.EndDate.Should().BeNull();
    }

    [Fact]
    public async Task FestivalPermissionColumnsDefaultToFalseForRolesThatDoNotSetThem()
    {
        // Verifies the migration's column defaults, not the seeding policy: a role inserted
        // without festival flags must come back with every layer denied (least privilege).
        var (_, _, token) = await SetupFinancialAdminAsync();

        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (userId, orgId) = ParseTokenClaims(token);
        tenantContext.SetContext(userId, orgId);
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var bareRole = new SplitRail.Api.Models.OrganizationRole
        {
            Id = Guid.NewGuid(),
            OrganizationId = orgId!.Value,
            RoleName = "Bare Role"
        };
        db.OrganizationRoles.Add(bareRole);
        await db.SaveChangesAsync();

        var persisted = await db.OrganizationRoles.AsNoTracking()
            .FirstAsync(r => r.Id == bareRole.Id);

        persisted.CanManageFestivalSchedule.Should().BeFalse();
        persisted.CanManageAllocations.Should().BeFalse();
        persisted.CanAdjustSettlements.Should().BeFalse();
        persisted.CanFinalizeSettlements.Should().BeFalse();
        persisted.CanOverrideSettlements.Should().BeFalse();
        persisted.CanPublishPublicItinerary.Should().BeFalse();
    }

    [Fact]
    public async Task NonManagerSeededRolesReceiveNoFestivalAuthority()
    {
        // Promoter and External Bookkeeper are schedule/finance-light roles — spec FR-036
        // requires they get none of the festival layers by default.
        var (_, _, token) = await SetupFinancialAdminAsync();

        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (userId, orgId) = ParseTokenClaims(token);
        tenantContext.SetContext(userId, orgId);
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var lightRoles = await db.OrganizationRoles.AsNoTracking()
            .Where(r => r.OrganizationId == orgId &&
                        (r.RoleName == "Promoter" || r.RoleName == "External Bookkeeper"))
            .ToListAsync();

        lightRoles.Should().HaveCount(2);
        lightRoles.Should().OnlyContain(r =>
            !r.CanManageFestivalSchedule &&
            !r.CanManageAllocations &&
            !r.CanAdjustSettlements &&
            !r.CanFinalizeSettlements &&
            !r.CanOverrideSettlements &&
            !r.CanPublishPublicItinerary);
    }

    [Fact]
    public async Task FestivalTablesStartEmptyForANewOrganization()
    {
        var (_, _, token) = await SetupFinancialAdminAsync();

        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (userId, orgId) = ParseTokenClaims(token);
        tenantContext.SetContext(userId, orgId);
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        (await db.StageZones.CountAsync()).Should().Be(0);
        (await db.ProgrammingBlocks.CountAsync()).Should().Be(0);
        (await db.RevenueBuckets.CountAsync()).Should().Be(0);
        (await db.FestivalAuditEntries.CountAsync()).Should().Be(0);
    }
}
