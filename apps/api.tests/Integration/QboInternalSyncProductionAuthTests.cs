using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using SplitRail.Api.Data;
using SplitRail.Api.Data.Interceptors;
using SplitRail.Api.Services;
using SplitRail.Api.Tests.TestSupport;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

[Collection(nameof(SchedulerAuthTestCollection))]
public class QboInternalSyncProductionAuthTests : IDisposable
{
    private readonly string _dataProtectionDir;

    public QboInternalSyncProductionAuthTests()
    {
        _dataProtectionDir = Path.Combine(Path.GetTempPath(), "split-rail-scheduler-auth-" + Guid.NewGuid());
        Directory.CreateDirectory(_dataProtectionDir);
        Environment.SetEnvironmentVariable("Jwt__Secret", "production-test-secret-at-least-32-chars");
    }

    public void Dispose()
    {
        Environment.SetEnvironmentVariable("Jwt__Secret", null);
        if (Directory.Exists(_dataProtectionDir))
            Directory.Delete(_dataProtectionDir, recursive: true);
    }

    [Fact]
    public async Task Authenticator_WithoutAuth_ReturnsUnauthorized()
    {
        await using var factory = CreateDeployedApiFactory();
        using var scope = factory.Services.CreateScope();
        var auth = scope.ServiceProvider.GetRequiredService<IInternalSyncTriggerAuthenticator>();
        var httpContext = new DefaultHttpContext { RequestServices = scope.ServiceProvider };

        var result = await auth.AuthorizeAsync(httpContext, null, CancellationToken.None);
        result.Should().BeOfType<StatusCodeResult>().Which.StatusCode.Should().Be(StatusCodes.Status401Unauthorized);
    }

    [Fact]
    public async Task TriggerSync_WithoutAuth_Returns401()
    {
        await using var factory = CreateDeployedApiFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsync("/api/internal/qbo-sync-trigger", null);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task TriggerSync_WithSharedKeyInProduction_Returns401()
    {
        await using var factory = CreateDeployedApiFactory();
        using var client = factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/internal/qbo-sync-trigger");
        request.Headers.Add("X-Internal-Sync-Key", "test-internal-key");

        var response = await client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task TriggerSync_WithWrongServiceAccountJwt_Returns403()
    {
        await using var factory = CreateDeployedApiFactory();
        using var client = factory.CreateClient();
        var token = SchedulerTestTokenHelper.CreateSchedulerToken(
            "wrong-scheduler@split-rail.iam.gserviceaccount.com",
            SchedulerTestTokenHelper.TestAudience);

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/internal/qbo-sync-trigger");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task TriggerSync_WithValidSchedulerJwt_ReturnsAccepted()
    {
        await using var factory = CreateDeployedApiFactory();
        using var client = factory.CreateClient();
        var token = SchedulerTestTokenHelper.CreateSchedulerToken(
            SchedulerTestTokenHelper.TestSchedulerEmail,
            SchedulerTestTokenHelper.TestAudience);

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/internal/qbo-sync-trigger");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.Accepted);
    }

    private WebApplicationFactory<Program> CreateDeployedApiFactory()
    {
        return new WebApplicationFactory<Program>().WithWebHostBuilder(ConfigureDeployedApiHost);
    }

    private void ConfigureDeployedApiHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(Environments.Staging);
            builder.ConfigureAppConfiguration((_, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["Preview:UseFakeQboConnector"] = "true",
                    ["Preview:EnableTestSeeding"] = "false",
                    ["QboSync:EnableInProcessTimer"] = "false",
                    ["QboSync:RedirectUri"] = "http://localhost/api/qbo/callback",
                    ["QboSync:ClientId"] = "test-qbo-client-id",
                    ["QboSync:ClientSecret"] = "test-qbo-client-secret",
                    ["QboSync:SchedulerServiceAccountEmail"] = SchedulerTestTokenHelper.TestSchedulerEmail,
                    ["QboSync:SchedulerTokenAudience"] = SchedulerTestTokenHelper.TestAudience,
                    ["QboSync:InternalTriggerKey"] = "",
                    ["ConnectionStrings:DefaultConnection"] = "Host=localhost;Database=x;Username=x;Password=x",
                    ["Jwt:Secret"] = "production-test-secret-at-least-32-chars",
                    ["Jwt:Issuer"] = "split-rail",
                    ["Jwt:Audience"] = "split-rail-api",
                    ["SettlementArchive:UseInMemoryStore"] = "true",
                    ["SettlementArchive:BucketName"] = "test-settlements-bucket",
                    ["SettlementArchive:StagingBucketName"] = "test-settlements-staging",
                    ["SettlementArchive:EnforceRetentionValidation"] = "false",
                    ["DataProtection:KeyDirectory"] = _dataProtectionDir,
                });
            });

            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(d =>
                    d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
                if (descriptor is not null)
                    services.Remove(descriptor);

                var dbName = "scheduler-auth-" + Guid.NewGuid();
                services.AddDbContext<ApplicationDbContext>((sp, options) =>
                {
                    options.UseInMemoryDatabase(dbName);
                    options.AddInterceptors(sp.GetRequiredService<FrozenEventImmutabilityInterceptor>());
                });

                services.PostConfigure<JwtBearerOptions>(
                    InternalSyncTriggerAuthenticator.GoogleSchedulerScheme,
                    options =>
                    {
                        options.Authority = null;
                        options.MetadataAddress = null;
                        options.ConfigurationManager = null;
                        options.TokenValidationParameters = new TokenValidationParameters
                        {
                            ValidateIssuer = true,
                            ValidIssuer = "https://accounts.google.com",
                            ValidateAudience = true,
                            ValidAudience = SchedulerTestTokenHelper.TestAudience,
                            ValidateLifetime = true,
                            ValidateIssuerSigningKey = true,
                            IssuerSigningKey = SchedulerTestTokenHelper.TestSigningKey,
                            ClockSkew = TimeSpan.FromMinutes(1),
                        };
                    });
            });
    }
}
