using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using SplitRail.Api.Configuration;
using SplitRail.Api.Data;
using SplitRail.Api.Data.Interceptors;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class ProductionSecretConfigurationTests : IDisposable
{
    private readonly string _dataProtectionDir;

    public ProductionSecretConfigurationTests()
    {
        _dataProtectionDir = Path.Combine(Path.GetTempPath(), "split-rail-prod-secrets-" + Guid.NewGuid());
        Directory.CreateDirectory(_dataProtectionDir);
    }

    public void Dispose()
    {
        ClearTestEnvironment();

        if (Directory.Exists(_dataProtectionDir))
            Directory.Delete(_dataProtectionDir, recursive: true);
    }

    [Fact]
    public void ProductionStartup_FailsWhenSecretsMissing()
    {
        ClearTestEnvironment();

        var ex = Assert.ThrowsAny<Exception>(() =>
        {
            using var factory = CreateProductionFactory(withSecrets: false);
            _ = factory.Services;
        });

        Assert.Contains("Production configuration requires", ex.Message, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ProductionStartup_SucceedsWithInjectedSecrets()
    {
        ClearTestEnvironment();
        ApplyProductionSecretEnvironment();

        try
        {
            await using var factory = CreateStagingFactory(withSecrets: true);
            using var scope = factory.Services.CreateScope();
            var jwt = scope.ServiceProvider.GetRequiredService<IOptions<JwtSettings>>().Value;
            Assert.False(string.IsNullOrWhiteSpace(jwt.Secret));
            Assert.True(jwt.Secret.Length >= 32);
        }
        finally
        {
            ClearTestEnvironment();
        }
    }

    [Fact]
    public async Task ProductionStartup_ReadsQboOptionsFromEnvironment()
    {
        ClearTestEnvironment();
        Environment.SetEnvironmentVariable("QBO_CLIENT_ID", "env-client-id-override");
        Environment.SetEnvironmentVariable("QBO_CLIENT_SECRET", "env-client-secret-override");
        Environment.SetEnvironmentVariable("QBO_INTERNAL_TRIGGER_KEY", "test-internal-trigger-key");

        try
        {
            await using var factory = CreateStagingFactory(withSecrets: false);
            using var scope = factory.Services.CreateScope();
            var qbo = scope.ServiceProvider.GetRequiredService<IOptions<QboSyncOptions>>().Value;

            Assert.Equal("env-client-id-override", qbo.ClientId);
            Assert.Equal("env-client-secret-override", qbo.ClientSecret);
        }
        finally
        {
            ClearTestEnvironment();
        }
    }

    /// <summary>
    /// Production environment is required so Program.cs runs secret validation; host must not start
    /// (validation throws before GCS/KMS Data Protection clients resolve).
    /// </summary>
    private WebApplicationFactory<Program> CreateProductionFactory(bool withSecrets)
    {
        ClearProductionSecretEnvironment();
        ApplyDataProtectionEnvironment();

        return new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(Environments.Production);
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(BuildBaseConfiguration(withSecrets));
            });
            builder.ConfigureServices(ConfigureInMemoryDatabase);
        });
    }

    /// <summary>
    /// Staging uses filesystem Data Protection (no GCP credentials) while still exercising Program.cs
    /// secret/env binding for success-path integration checks.
    /// </summary>
    private WebApplicationFactory<Program> CreateStagingFactory(bool withSecrets)
    {
        return new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(Environments.Staging);
            builder.ConfigureAppConfiguration((_, config) =>
            {
                var values = BuildBaseConfiguration(withSecrets);
                values["DataProtection:KeyDirectory"] = _dataProtectionDir;
                config.AddInMemoryCollection(values);
            });
            builder.ConfigureServices(ConfigureInMemoryDatabase);
        });
    }

    private static Dictionary<string, string?> BuildBaseConfiguration(bool withSecrets)
    {
        var values = new Dictionary<string, string?>
        {
            ["Preview:UseFakeQboConnector"] = "true",
            ["Preview:EnableTestSeeding"] = "false",
            ["QboSync:EnableInProcessTimer"] = "false",
            ["QboSync:RedirectUri"] = "http://localhost/api/qbo/callback",
            ["ConnectionStrings:DefaultConnection"] = "Host=localhost;Database=x;Username=x;Password=x",
            ["Jwt:Issuer"] = "split-rail",
            ["Jwt:Audience"] = "split-rail-api",
            ["SettlementArchive:BucketName"] = "test-settlements-bucket",
            ["SettlementArchive:StagingBucketName"] = "test-settlements-staging",
            ["SettlementArchive:SignedUrlTtlMinutes"] = "15",
            ["SettlementArchive:UseInMemoryStore"] = "true",
            ["SettlementArchive:EnforceRetentionValidation"] = "false",
        };

        if (withSecrets)
        {
            values["Jwt:Secret"] = "production-test-secret-at-least-32-chars";
            values["QboSync:ClientId"] = "test-qbo-client-id";
            values["QboSync:ClientSecret"] = "test-qbo-client-secret";
            values["QboSync:InternalTriggerKey"] = "test-internal-trigger-key";
        }
        else
        {
            values["Jwt:Secret"] = "staging-test-secret-at-least-32-chars";
            values["QboSync:ClientId"] = "";
            values["QboSync:ClientSecret"] = "";
            values["QboSync:InternalTriggerKey"] = "";
        }

        return values;
    }

    private static void ConfigureInMemoryDatabase(IServiceCollection services)
    {
        var descriptor = services.SingleOrDefault(d =>
            d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
        if (descriptor is not null)
            services.Remove(descriptor);

        services.AddDbContext<ApplicationDbContext>((sp, options) =>
        {
            options.UseInMemoryDatabase("prod-secret-config-" + Guid.NewGuid());
            options.AddInterceptors(sp.GetRequiredService<FrozenEventImmutabilityInterceptor>());
        });
    }

    private static void ApplyProductionSecretEnvironment()
    {
        Environment.SetEnvironmentVariable("DB_PASSWORD", "test-db-password");
        Environment.SetEnvironmentVariable("Jwt__Secret", "production-test-secret-at-least-32-chars");
        Environment.SetEnvironmentVariable("QBO_CLIENT_ID", "test-qbo-client-id");
        Environment.SetEnvironmentVariable("QBO_CLIENT_SECRET", "test-qbo-client-secret");
        Environment.SetEnvironmentVariable("QBO_INTERNAL_TRIGGER_KEY", "test-internal-trigger-key");
    }

    private static void ApplyDataProtectionEnvironment()
    {
        Environment.SetEnvironmentVariable("DataProtection__Bucket", "test-dp-bucket");
        Environment.SetEnvironmentVariable("DataProtection__ObjectPrefix", "test-prefix");
        Environment.SetEnvironmentVariable(
            "DataProtection__KmsKeyName",
            "projects/test/locations/us/keyRings/test/cryptoKeys/test");
    }

    private static void ClearProductionSecretEnvironment()
    {
        Environment.SetEnvironmentVariable("DB_PASSWORD", null);
        Environment.SetEnvironmentVariable("QBO_CLIENT_ID", null);
        Environment.SetEnvironmentVariable("QBO_CLIENT_SECRET", null);
        Environment.SetEnvironmentVariable("QBO_INTERNAL_TRIGGER_KEY", null);
        Environment.SetEnvironmentVariable("Jwt__Secret", null);
    }

    private static void ClearTestEnvironment()
    {
        ClearProductionSecretEnvironment();
        Environment.SetEnvironmentVariable("DataProtection__Bucket", null);
        Environment.SetEnvironmentVariable("DataProtection__ObjectPrefix", null);
        Environment.SetEnvironmentVariable("DataProtection__KmsKeyName", null);
    }
}
