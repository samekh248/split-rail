using FluentAssertions;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NSubstitute;
using SplitRail.Api.Data;
using SplitRail.Api.Extensions;
using SplitRail.Api.Models;
using SplitRail.Api.Services;
using SplitRail.Api.Tests.TestSupport;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class DataProtectionKeyPersistenceTests : IDisposable
{
    private const string ProtectorPurpose = "QboOAuthTokens";
    private readonly string _sharedKeyDirectory;
    private readonly List<string> _directoriesToCleanup = [];

    public DataProtectionKeyPersistenceTests()
    {
        _sharedKeyDirectory = Path.Combine(Path.GetTempPath(), "split-rail-dp-keys-" + Guid.NewGuid());
        Directory.CreateDirectory(_sharedKeyDirectory);
        _directoriesToCleanup.Add(_sharedKeyDirectory);
    }

    public void Dispose()
    {
        foreach (var directory in _directoriesToCleanup)
        {
            if (Directory.Exists(directory))
                Directory.Delete(directory, recursive: true);
        }
    }

    [Fact]
    public void Restart_DecryptsQboTokensAfterFactoryDispose()
    {
        const string accessToken = "persisted-access-token-restart-test";
        string encrypted;

        {
            var serviceProvider = BuildServiceProvider(_sharedKeyDirectory);
            encrypted = serviceProvider.GetRequiredService<IDataProtectionProvider>()
                .CreateProtector(ProtectorPurpose)
                .Protect(accessToken);
            if (serviceProvider is IDisposable disposable)
                disposable.Dispose();
        }

        var providerB = BuildServiceProvider(_sharedKeyDirectory);
        var decrypted = providerB.GetRequiredService<IDataProtectionProvider>()
            .CreateProtector(ProtectorPurpose)
            .Unprotect(encrypted);

        decrypted.Should().Be(accessToken);
    }

    [Fact]
    public void CrossInstance_InstanceBDecryptsTokensEncryptedByInstanceA()
    {
        const string accessToken = "persisted-access-token-cross-instance";

        var serviceProviderA = BuildServiceProvider(_sharedKeyDirectory);
        var encrypted = serviceProviderA.GetRequiredService<IDataProtectionProvider>()
            .CreateProtector(ProtectorPurpose)
            .Protect(accessToken);

        var serviceProviderB = BuildServiceProvider(_sharedKeyDirectory);
        var decrypted = serviceProviderB.GetRequiredService<IDataProtectionProvider>()
            .CreateProtector(ProtectorPurpose)
            .Unprotect(encrypted);

        decrypted.Should().Be(accessToken);
    }

    [Fact]
    public async Task UnprotectFailure_DoesNotLogCleartextTokens()
    {
        const string refreshToken = "super-secret-refresh-token-log-test";
        var venueId = Guid.NewGuid();
        var logCollector = new TestLogCollector();
        var (db, _) = CreateDb();

        var orgId = Guid.NewGuid();
        db.Organizations.Add(new Organization { Id = orgId, Name = "DP Test Org" });
        db.Venues.Add(new Venue { Id = venueId, OrganizationId = orgId, Name = "DP Test Venue" });
        await db.SaveChangesAsync();

        var dataProtectionProvider = BuildServiceProvider(_sharedKeyDirectory)
            .GetRequiredService<IDataProtectionProvider>();
        var service = new QboTokenService(
            db,
            Substitute.For<IHttpClientFactory>(),
            dataProtectionProvider,
            Options.Create(new SplitRail.Api.Configuration.QboSyncOptions
            {
                ClientId = "test-client",
                ClientSecret = "test-secret",
                IntuitTokenUrl = "https://oauth.test/token",
                IntuitRevokeUrl = "https://oauth.test/revoke"
            }),
            NullLogger<QboTokenService>.Instance);

        await service.StoreTokensAsync(
            venueId,
            "test-realm",
            "access-token-log-test",
            refreshToken,
            DateTimeOffset.UtcNow.AddHours(1),
            connectedByUserId: null);

        var credential = await db.QboVenueCredentials.FirstAsync(c => c.VenueId == venueId);
        credential.EncryptedRefreshToken = "corrupted-ciphertext";
        await db.SaveChangesAsync();

        var loggerFactory = LoggerFactory.Create(builder =>
        {
            builder.AddProvider(logCollector);
        });

        var loggingService = new QboTokenService(
            db,
            Substitute.For<IHttpClientFactory>(),
            dataProtectionProvider,
            Options.Create(new SplitRail.Api.Configuration.QboSyncOptions
            {
                ClientId = "test-client",
                ClientSecret = "test-secret",
                IntuitTokenUrl = "https://oauth.test/token",
                IntuitRevokeUrl = "https://oauth.test/revoke"
            }),
            loggerFactory.CreateLogger<QboTokenService>());

        await loggingService.DisconnectAsync(venueId);

        var logText = string.Join('\n', logCollector.Entries.Select(e => e.Message));
        logText.Should().NotContain(refreshToken);
    }

    private static ServiceProvider BuildServiceProvider(string keyDirectory)
    {
        var services = new ServiceCollection();
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["DataProtection:KeyDirectory"] = keyDirectory,
                ["DataProtection:ApplicationName"] = "split-rail-api"
            })
            .Build();

        var environment = Substitute.For<IWebHostEnvironment>();
        environment.EnvironmentName.Returns(Environments.Development);
        environment.ContentRootPath.Returns(Path.GetTempPath());
        environment.ContentRootFileProvider.Returns(new NullFileProvider());

        services.AddSplitRailDataProtection(configuration, environment);
        return services.BuildServiceProvider();
    }

    private static (ApplicationDbContext Db, TenantContext TenantContext) CreateDb()
    {
        var tenantContext = new TenantContext();
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return (new ApplicationDbContext(options, tenantContext), tenantContext);
    }
}
