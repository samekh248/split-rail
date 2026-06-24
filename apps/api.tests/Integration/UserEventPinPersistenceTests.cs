using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SplitRail.Api.Data;
using SplitRail.Api.Models;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class UserEventPinPersistenceTests : IntegrationTestBase
{
    [Fact]
    public async Task PinRecord_InsertAndQuery_ReturnsPinnedAt()
    {
        var (_, venueId, token) = await SetupFinancialAdminAsync();
        var (userId, orgId) = ParseTokenClaims(token);
        var evt = await CreateEventViaApiAsync(CreateAuthenticatedClient(token), venueId);

        var pinnedAt = DateTimeOffset.UtcNow;
        await SeedPinDirectAsync(token, userId, evt.EventId, pinnedAt);

        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        tenantContext.SetContext(userId, orgId);

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var pin = await db.UserEventPins
            .AsNoTracking()
            .FirstAsync(p => p.UserId == userId && p.EventId == evt.EventId);

        Assert.Equal(userId, pin.UserId);
        Assert.Equal(evt.EventId, pin.EventId);
        Assert.True(pin.PinnedAt >= pinnedAt.AddSeconds(-1));
    }

    [Fact]
    public async Task PinRecord_DuplicateUserEvent_Throws()
    {
        var (_, venueId, token) = await SetupFinancialAdminAsync();
        var (userId, _) = ParseTokenClaims(token);
        var evt = await CreateEventViaApiAsync(CreateAuthenticatedClient(token), venueId);

        await SeedPinDirectAsync(token, userId, evt.EventId);

        await Assert.ThrowsAsync<DbUpdateException>(async () =>
            await SeedPinDirectAsync(token, userId, evt.EventId));
    }

    [Fact]
    public async Task PinRecord_CrossOrg_NotVisible()
    {
        var emailA = $"pin-a-{Guid.NewGuid():N}@example.com";
        var (_, venueA, tokenA) = await SetupFinancialAdminAsync(emailA);
        var (userA, orgA) = ParseTokenClaims(tokenA);
        var eventA = await CreateEventViaApiAsync(CreateAuthenticatedClient(tokenA), venueA);
        await SeedPinDirectAsync(tokenA, userA, eventA.EventId);

        var emailB = $"pin-b-{Guid.NewGuid():N}@example.com";
        var (_, venueB, tokenB) = await SetupFinancialAdminAsync(emailB);
        var (userB, orgB) = ParseTokenClaims(tokenB);
        var eventB = await CreateEventViaApiAsync(CreateAuthenticatedClient(tokenB), venueB);
        await SeedPinDirectAsync(tokenB, userB, eventB.EventId);

        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        tenantContext.SetContext(userA, orgA);

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var visiblePins = await db.UserEventPins.AsNoTracking().ToListAsync();

        Assert.Single(visiblePins);
        Assert.Equal(eventA.EventId, visiblePins[0].EventId);
        Assert.NotEqual(orgB, orgA);
    }

    [Fact]
    public async Task PinRecord_EventDelete_Cascades()
    {
        var (_, venueId, token) = await SetupFinancialAdminAsync();
        var (userId, orgId) = ParseTokenClaims(token);
        var evt = await CreateEventViaApiAsync(CreateAuthenticatedClient(token), venueId);
        await SeedPinDirectAsync(token, userId, evt.EventId);

        using (var scope = Factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.SetContext(userId, orgId);

            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var eventEntity = await db.Events.FirstAsync(e => e.Id == evt.EventId);
            db.Events.Remove(eventEntity);
            await db.SaveChangesAsync();
        }

        using var verifyScope = Factory.Services.CreateScope();
        var verifyTenant = verifyScope.ServiceProvider.GetRequiredService<ITenantContext>();
        verifyTenant.SetContext(userId, orgId);

        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var pinCount = await verifyDb.UserEventPins.CountAsync();
        Assert.Equal(0, pinCount);
    }

    [Fact]
    public async Task Migration_AppliesOnPopulatedDatabase()
    {
        var (_, venueId, token) = await SetupFinancialAdminAsync();
        var (userId, orgId) = ParseTokenClaims(token);
        var evt = await CreateEventViaApiAsync(CreateAuthenticatedClient(token), venueId);

        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        tenantContext.SetContext(userId, orgId);

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var eventCountBefore = await db.Events.CountAsync();
        Assert.True(eventCountBefore >= 1);

        await SeedPinDirectAsync(token, userId, evt.EventId);

        var pinCount = await db.UserEventPins.CountAsync();
        Assert.Equal(1, pinCount);
        Assert.True(await db.Events.AnyAsync(e => e.Id == evt.EventId));
    }

    [Fact]
    public async Task PinRecord_UserDelete_Cascades()
    {
        var (_, venueId, token) = await SetupFinancialAdminAsync();
        var (userId, orgId) = ParseTokenClaims(token);
        var evt = await CreateEventViaApiAsync(CreateAuthenticatedClient(token), venueId);
        await SeedPinDirectAsync(token, userId, evt.EventId);

        using (var scope = Factory.Services.CreateScope())
        {
            var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
            tenantContext.SetContext(userId, orgId);

            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var user = await db.Users.FirstAsync(u => u.Id == userId);
            db.Users.Remove(user);
            await db.SaveChangesAsync();
        }

        using var verifyScope = Factory.Services.CreateScope();
        var verifyTenant = verifyScope.ServiceProvider.GetRequiredService<ITenantContext>();
        verifyTenant.SetContext(null, null);

        var verifyDb = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var pinCount = await verifyDb.UserEventPins.IgnoreQueryFilters().CountAsync();
        Assert.Equal(0, pinCount);
    }

    private async Task SeedPinDirectAsync(
        string accessToken,
        Guid userId,
        Guid eventId,
        DateTimeOffset? pinnedAt = null)
    {
        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (_, orgId) = ParseTokenClaims(accessToken);
        tenantContext.SetContext(userId, orgId);

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.UserEventPins.Add(new UserEventPin
        {
            UserId = userId,
            EventId = eventId,
            PinnedAt = pinnedAt ?? DateTimeOffset.UtcNow
        });
        await db.SaveChangesAsync();
    }
}
