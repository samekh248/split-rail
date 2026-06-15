using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SplitRail.Api.Configuration;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Seeding;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class TestSeedingServiceTests
{
    [Fact]
    public void EnsureEnabled_WhenDisabled_ThrowsNotFound()
    {
        var service = CreateService(enableSeeding: false);

        var act = () => service.EnsureEnabled();

        act.Should().Throw<NotFoundException>();
    }

    [Fact]
    public async Task GetSettlementPdfHashAsync_WithoutReadableArchive_ReturnsNull()
    {
        var service = CreateService(archiveStore: new EmptyArchiveStore());
        var seed = await service.ResetAsync();
        var lifecycle = await service.SeedLifecycleEventAsync(
            new LifecycleEventSeedRequestDto(seed.OrgA.OrganizationId, seed.OrgA.InScopeVenueId));

        var result = await service.GetSettlementPdfHashAsync(lifecycle.EventId);
        result.Should().BeNull();
    }

    [Fact]
    public void GetSettlementPdfBytes_WithoutArchiveStore_ReturnsNull()
    {
        var service = CreateService(archiveStore: new EmptyArchiveStore());
        service.GetSettlementPdfBytes("missing.pdf").Should().BeNull();
    }

    [Fact]
    public async Task MutateSettledEventAsync_UnknownEvent_ThrowsNotFound()
    {
        var service = CreateService();
        var act = () => service.MutateSettledEventAsync(
            new MutateSettledEventRequestDto(Guid.NewGuid(), 100m));

        await act.Should().ThrowAsync<NotFoundException>();
    }

    [Fact]
    public async Task ResetAsync_CreatesTwoOrganizationsWithUsers()
    {
        var service = CreateService();
        var result = await service.ResetAsync();

        result.OrgA.AdminEmail.Should().Be("alpha-admin@e2e.test");
        result.OrgB.ScopedUserEmail.Should().Be("bravo-scoped@e2e.test");
        result.Sentinels.OrgAString.Should().Contain("Alpha Main Hall");
    }

    [Fact]
    public async Task SeedLifecycleEventAsync_CreatesEventWithLineItems()
    {
        var service = CreateService();
        var seed = await service.ResetAsync();

        var lifecycle = await service.SeedLifecycleEventAsync(
            new LifecycleEventSeedRequestDto(seed.OrgA.OrganizationId, seed.OrgA.InScopeVenueId));

        lifecycle.EventId.Should().NotBeEmpty();
        lifecycle.ExpectedSettlement.NetShowRevenue.Should().Be("7700.00");
    }

    [Fact]
    public async Task MutateSettledEventAsync_OnUnsettledEvent_UpdatesValue()
    {
        var service = CreateService();
        var seed = await service.ResetAsync();
        var lifecycle = await service.SeedLifecycleEventAsync(
            new LifecycleEventSeedRequestDto(seed.OrgA.OrganizationId, seed.OrgA.InScopeVenueId));

        var result = await service.MutateSettledEventAsync(
            new MutateSettledEventRequestDto(lifecycle.EventId, 1234.56m));

        result.Rejected.Should().BeFalse();
    }

    [Fact]
    public async Task GetSettlementPdfHashAsync_WhenPdfNotStored_ReturnsNull()
    {
        var archive = new InMemorySettlementArchiveStore();
        var service = CreateService(archiveStore: archive);
        var seed = await service.ResetAsync();
        var lifecycle = await service.SeedLifecycleEventAsync(
            new LifecycleEventSeedRequestDto(seed.OrgA.OrganizationId, seed.OrgA.InScopeVenueId));

        var result = await service.GetSettlementPdfHashAsync(lifecycle.EventId);
        result.Should().BeNull();
    }

    [Fact]
    public async Task MutateSettledEventAsync_OnSettledEvent_RejectsMutation()
    {
        var (service, db) = CreateServiceWithDb();
        var seed = await service.ResetAsync();
        var lifecycle = await service.SeedLifecycleEventAsync(
            new LifecycleEventSeedRequestDto(seed.OrgA.OrganizationId, seed.OrgA.InScopeVenueId));

        var evt = await db.Events.FirstAsync(e => e.Id == lifecycle.EventId);
        evt.Status = SplitRail.Api.Models.Enums.EventStatus.Settled;
        await db.SaveChangesAsync();

        var result = await service.MutateSettledEventAsync(
            new MutateSettledEventRequestDto(lifecycle.EventId, 9999.99m));

        result.Rejected.Should().BeTrue();
        result.Message.Should().NotBeNullOrWhiteSpace();
    }

    [Fact]
    public async Task GetSettlementPdfBytes_ReturnsStoredPdf()
    {
        var archive = new InMemorySettlementArchiveStore();
        await archive.UploadAsync("test.pdf", [0x25, 0x50]);
        var service = CreateService(archiveStore: archive);

        service.GetSettlementPdfBytes("test.pdf").Should().NotBeNull();
    }

    private static TestSeedingService CreateService(
        bool enableSeeding = true,
        ISettlementArchiveStore? archiveStore = null) =>
        CreateServiceWithDb(enableSeeding, archiveStore).Service;

    private static (TestSeedingService Service, ApplicationDbContext Db) CreateServiceWithDb(
        bool enableSeeding = true,
        ISettlementArchiveStore? archiveStore = null)
    {
        var tenantContext = new TenantContext();
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new ApplicationDbContext(options, tenantContext);
        var previewOptions = Options.Create(new PreviewOptions { EnableTestSeeding = enableSeeding });
        var service = new TestSeedingService(
            db,
            previewOptions,
            archiveStore ?? new InMemorySettlementArchiveStore());
        return (service, db);
    }

    private sealed class EmptyArchiveStore : ISettlementArchiveStore
    {
        public Task UploadAsync(string objectPath, byte[] pdfBytes, CancellationToken cancellationToken = default) =>
            Task.CompletedTask;

        public Task<(string Url, DateTimeOffset ExpiresAt)> CreateSignedUrlAsync(
            string objectPath,
            TimeSpan ttl,
            CancellationToken cancellationToken = default) =>
            Task.FromResult(("https://example.test/file.pdf", DateTimeOffset.UtcNow.Add(ttl)));
    }
}
