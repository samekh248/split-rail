using System.Net;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using SplitRail.Api.Configuration;
using SplitRail.Api.Data;
using SplitRail.Api.Data.Interceptors;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public class ContentSecurityPolicyMiddlewareTests : IAsyncLifetime
{
    private readonly string _dataProtectionDir;
    private WebApplicationFactory<Program> _productionFactory = null!;
    private WebApplicationFactory<Program> _developmentFactory = null!;

    public ContentSecurityPolicyMiddlewareTests()
    {
        _dataProtectionDir = Path.Combine(Path.GetTempPath(), "split-rail-csp-test-" + Guid.NewGuid());
        Directory.CreateDirectory(_dataProtectionDir);
    }

    public async Task InitializeAsync()
    {
        // Staging uses the production CSP policy (non-Development) without Production DP/GCP wiring.
        _productionFactory = CreateFactory(Environments.Staging);
        _developmentFactory = CreateFactory(Environments.Development);

        foreach (var factory in new[] { _productionFactory, _developmentFactory })
        {
            using var scope = factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            await db.Database.EnsureCreatedAsync();
        }
    }

    public async Task DisposeAsync()
    {
        if (_productionFactory is not null)
            await _productionFactory.DisposeAsync();
        if (_developmentFactory is not null)
            await _developmentFactory.DisposeAsync();

        if (Directory.Exists(_dataProtectionDir))
            Directory.Delete(_dataProtectionDir, recursive: true);
    }

    [Fact]
    public async Task ProductionConfig_SwaggerIndex_IncludesCanonicalCspHeader()
    {
        var client = _productionFactory.CreateClient();
        var response = await client.GetAsync("/swagger/index.html");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        AssertCanonicalCspHeader(response);
    }

    [Fact]
    public async Task ProductionConfig_UnauthenticatedApi_IncludesCanonicalCspHeader()
    {
        var client = _productionFactory.CreateClient();
        var response = await client.GetAsync("/api/organizations");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        AssertCanonicalCspHeader(response);
    }

    [Fact]
    public async Task ProductionConfig_NotFound_IncludesCanonicalCspHeader()
    {
        var client = _productionFactory.CreateClient();
        var response = await client.GetAsync("/api/nonexistent-route-csp-test");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        AssertCanonicalCspHeader(response);
    }

    [Fact]
    public async Task ProductionConfig_Header_ContainsObjectSrcNone()
    {
        var client = _productionFactory.CreateClient();
        var response = await client.GetAsync("/swagger/index.html");

        var header = GetCspHeader(response);
        Assert.Contains("object-src 'none'", header);
    }

    [Fact]
    public async Task ProductionEnvironment_Header_ExcludesUnsafeInline()
    {
        var client = _productionFactory.CreateClient();
        var response = await client.GetAsync("/swagger/index.html");

        var header = GetCspHeader(response);
        Assert.DoesNotContain("unsafe-inline", header);
    }

    [Fact]
    public async Task DevelopmentEnvironment_Header_MayIncludeStyleSrcUnsafeInline()
    {
        var client = _developmentFactory.CreateClient();
        var response = await client.GetAsync("/swagger/index.html");

        var header = GetCspHeader(response);
        Assert.StartsWith(ContentSecurityPolicyOptions.ProductionPolicy, header);
        Assert.Contains("style-src 'self' 'unsafe-inline'", header);
    }

    private WebApplicationFactory<Program> CreateFactory(string environment)
    {
        return new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(environment);
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Preview:UseFakeQboConnector"] = "true",
                    ["Preview:EnableTestSeeding"] = "false",
                    ["QboSync:EnableInProcessTimer"] = "false",
                    ["QboSync:ClientId"] = "test-client",
                    ["QboSync:ClientSecret"] = "test-secret",
                    ["QboSync:RedirectUri"] = "http://localhost/api/qbo/callback",
                    ["QboSync:InternalTriggerKey"] = "test-internal-key",
                    ["ConnectionStrings:DefaultConnection"] = "Host=localhost;Database=x;Username=x;Password=x",
                    ["DataProtection:KeyDirectory"] = _dataProtectionDir,
                    ["Jwt:Secret"] = "test-secret-at-least-32-characters-long",
                    ["Jwt:Issuer"] = "split-rail",
                    ["Jwt:Audience"] = "split-rail-api",
                    ["SettlementArchive:BucketName"] = "test-settlements-bucket",
                    ["SettlementArchive:StagingBucketName"] = "test-settlements-staging",
                    ["SettlementArchive:SignedUrlTtlMinutes"] = "15"
                });
            });
            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(d =>
                    d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
                if (descriptor is not null)
                    services.Remove(descriptor);

                services.AddDbContext<ApplicationDbContext>((sp, options) =>
                {
                    options.UseInMemoryDatabase($"csp-middleware-{environment}");
                    options.AddInterceptors(sp.GetRequiredService<FrozenEventImmutabilityInterceptor>());
                });
            });
        });
    }

    private static void AssertCanonicalCspHeader(HttpResponseMessage response)
    {
        var header = GetCspHeader(response);
        Assert.Equal(ContentSecurityPolicyOptions.ProductionPolicy, header);
    }

    private static string GetCspHeader(HttpResponseMessage response)
    {
        Assert.True(response.Headers.TryGetValues("Content-Security-Policy", out var values));
        return Assert.Single(values);
    }
}
