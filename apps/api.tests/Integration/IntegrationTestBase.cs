using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Auth;
using SplitRail.Api.DTOs.Invitations;
using SplitRail.Api.DTOs.Organizations;
using SplitRail.Api.Services;
using Testcontainers.PostgreSql;
using Xunit;

namespace SplitRail.Api.Tests.Integration;

public abstract class IntegrationTestBase : IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder()
        .WithImage("postgres:16")
        .WithDatabase("split_rail_test")
        .WithUsername("postgres")
        .WithPassword("postgres")
        .Build();

    protected WebApplicationFactory<Program> Factory = null!;
    protected HttpClient Client = null!;

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();

        Factory = new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                var descriptor = services.SingleOrDefault(d =>
                    d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
                if (descriptor is not null)
                    services.Remove(descriptor);

                services.AddDbContext<ApplicationDbContext>(options =>
                    options.UseNpgsql(_postgres.GetConnectionString()));
            });
        });

        Client = Factory.CreateClient();

        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await db.Database.MigrateAsync();
    }

    public async Task DisposeAsync()
    {
        Client.Dispose();
        await Factory.DisposeAsync();
        await _postgres.DisposeAsync();
    }

    protected async Task<(string AccessToken, string RefreshToken, Guid UserId)> RegisterAndLoginAsync(
        string email = "test@example.com",
        string password = "SecurePass1")
    {
        var registerResponse = await Client.PostAsJsonAsync("/api/auth/register",
            new RegisterRequest(email, password));
        registerResponse.EnsureSuccessStatusCode();

        var loginResponse = await Client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(email, password));
        loginResponse.EnsureSuccessStatusCode();

        var auth = await loginResponse.Content.ReadFromJsonAsync<AuthResponse>();
        Assert.NotNull(auth);

        var registerBody = await registerResponse.Content.ReadFromJsonAsync<RegisterResponse>();
        return (auth.AccessToken, auth.RefreshToken, registerBody!.Id);
    }

    protected async Task<string> CreateOrgAndGetTokenAsync(
        string accessToken,
        string email,
        string password,
        string orgName = "Test Org")
    {
        using var authedClient = CreateAuthenticatedClient(accessToken);
        var orgResponse = await authedClient.PostAsJsonAsync("/api/organizations",
            new CreateOrganizationRequest(orgName));
        orgResponse.EnsureSuccessStatusCode();

        var loginResponse = await Client.PostAsJsonAsync("/api/auth/login",
            new LoginRequest(email, password));
        loginResponse.EnsureSuccessStatusCode();
        var auth = await loginResponse.Content.ReadFromJsonAsync<AuthResponse>();
        return auth!.AccessToken;
    }

    protected HttpClient CreateAuthenticatedClient(string accessToken)
    {
        var client = Factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return client;
    }

    protected static (Guid UserId, Guid? OrganizationId) ParseTokenClaims(string accessToken)
    {
        var handler = new JwtSecurityTokenHandler();
        var jwt = handler.ReadJwtToken(accessToken);
        var userId = Guid.Parse(jwt.Claims.First(c => c.Type == "sub").Value);
        var orgClaim = jwt.Claims.FirstOrDefault(c => c.Type == "org_id")?.Value;
        Guid? orgId = orgClaim is not null ? Guid.Parse(orgClaim) : null;
        return (userId, orgId);
    }

    protected async Task<string> SendInvitationViaServiceAsync(
        string adminAccessToken,
        string email,
        Guid roleId,
        IReadOnlyList<Guid>? venueIds = null)
    {
        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (userId, orgId) = ParseTokenClaims(adminAccessToken);
        tenantContext.SetContext(userId, orgId);

        var invitationService = scope.ServiceProvider.GetRequiredService<InvitationService>();
        var (_, rawToken) = await invitationService.SendInvitationAsync(
            new CreateInvitationRequest(email, roleId, venueIds));
        return rawToken;
    }
}
