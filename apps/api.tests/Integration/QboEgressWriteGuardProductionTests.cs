using System.Net;
using System.Net.Http;
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
using SplitRail.Api.Exceptions;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

/// <summary>
/// Verifies Program.cs registers QboEgressRecordingHandler on QboApi when UseFakeQboConnector=false.
/// Uses in-memory DB (no Testcontainers) because only HttpClient wiring is under test.
/// </summary>
public class QboEgressWriteGuardProductionTests : IAsyncLifetime
{
    private readonly CountingHttpMessageHandler _countingHandler = new();
    private readonly string _dataProtectionDir;
    private WebApplicationFactory<Program> _factory = null!;

    public QboEgressWriteGuardProductionTests()
    {
        _dataProtectionDir = Path.Combine(Path.GetTempPath(), "split-rail-egress-test-" + Guid.NewGuid());
        Directory.CreateDirectory(_dataProtectionDir);
    }

    public async Task InitializeAsync()
    {
        _factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment(Environments.Development);
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Preview:UseFakeQboConnector"] = "false",
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
                    options.UseInMemoryDatabase("qbo-egress-guard-production");
                    options.AddInterceptors(sp.GetRequiredService<FrozenEventImmutabilityInterceptor>());
                });

                services.AddSingleton(_countingHandler);
                services.AddHttpClient("QboApi")
                    .ConfigurePrimaryHttpMessageHandler(_ => _countingHandler);
                services.AddHttpClient("QboOAuth")
                    .ConfigurePrimaryHttpMessageHandler(_ => _countingHandler);
            });
        });

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await db.Database.EnsureCreatedAsync();
    }

    public async Task DisposeAsync()
    {
        if (_factory is not null)
            await _factory.DisposeAsync();

        if (Directory.Exists(_dataProtectionDir))
            Directory.Delete(_dataProtectionDir, recursive: true);
    }

    [Fact]
    public async Task ProductionConfig_QboApi_PostToAccounting_BlockedBeforeInnerHandler()
    {
        _countingHandler.Reset();
        var httpClientFactory = _factory.Services.GetRequiredService<IHttpClientFactory>();
        var client = httpClientFactory.CreateClient("QboApi");

        var ex = await Assert.ThrowsAsync<QboSyncException>(() =>
            client.PostAsync(
                "https://quickbooks.api.intuit.com/v3/company/realm/purchase",
                null));

        Assert.Equal("zero_write_infiltration", ex.ErrorCode);
        Assert.Empty(_countingHandler.Requests);
    }

    [Fact]
    public async Task ProductionConfig_QboApi_GetToAccounting_ReachesInnerHandler()
    {
        _countingHandler.Reset();
        var httpClientFactory = _factory.Services.GetRequiredService<IHttpClientFactory>();
        var client = httpClientFactory.CreateClient("QboApi");

        var response = await client.GetAsync(
            "https://quickbooks.api.intuit.com/v3/company/realm/query?query=select%20*%20from%20Account");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Single(_countingHandler.Requests);
        Assert.Equal(HttpMethod.Get, _countingHandler.Requests[0].Method);
    }

    [Fact]
    public async Task ProductionConfig_QboOAuth_TokenPost_ReachesInnerHandler()
    {
        _countingHandler.Reset();
        var options = _factory.Services.GetRequiredService<IOptions<QboSyncOptions>>().Value;
        var httpClientFactory = _factory.Services.GetRequiredService<IHttpClientFactory>();
        var client = httpClientFactory.CreateClient("QboOAuth");

        var response = await client.PostAsync(options.IntuitTokenUrl, null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Single(_countingHandler.Requests);
        Assert.Equal(HttpMethod.Post, _countingHandler.Requests[0].Method);
        Assert.Contains("oauth.platform.intuit.com", _countingHandler.Requests[0].RequestUri?.Host);
    }

    [Fact]
    public async Task ProductionConfig_QboOAuth_RevokePost_ReachesInnerHandler()
    {
        _countingHandler.Reset();
        var options = _factory.Services.GetRequiredService<IOptions<QboSyncOptions>>().Value;
        var httpClientFactory = _factory.Services.GetRequiredService<IHttpClientFactory>();
        var client = httpClientFactory.CreateClient("QboOAuth");

        var response = await client.PostAsync(options.IntuitRevokeUrl, null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Single(_countingHandler.Requests);
        Assert.Equal(HttpMethod.Post, _countingHandler.Requests[0].Method);
        Assert.Contains("developer.api.intuit.com", _countingHandler.Requests[0].RequestUri?.Host);
    }

    [Fact]
    public async Task ProductionConfig_QboApi_PostBlocked_WhileQboOAuth_PostPermitted()
    {
        _countingHandler.Reset();
        var options = _factory.Services.GetRequiredService<IOptions<QboSyncOptions>>().Value;
        var httpClientFactory = _factory.Services.GetRequiredService<IHttpClientFactory>();
        var qboApi = httpClientFactory.CreateClient("QboApi");
        var qboOAuth = httpClientFactory.CreateClient("QboOAuth");

        await Assert.ThrowsAsync<QboSyncException>(() =>
            qboApi.PostAsync(
                "https://quickbooks.api.intuit.com/v3/company/realm/purchase",
                null));

        var oauthResponse = await qboOAuth.PostAsync(options.IntuitTokenUrl, null);

        Assert.Equal(HttpStatusCode.OK, oauthResponse.StatusCode);
        Assert.Single(_countingHandler.Requests);
        Assert.Equal(HttpMethod.Post, _countingHandler.Requests[0].Method);
    }

    private sealed class CountingHttpMessageHandler : HttpMessageHandler
    {
        public List<HttpRequestMessage> Requests { get; } = [];

        public void Reset() => Requests.Clear();

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            Requests.Add(request);
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK));
        }
    }
}
