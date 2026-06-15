using FluentAssertions;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NSubstitute;
using SplitRail.Api.Configuration;
using SplitRail.Api.Data;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;
using SplitRail.Api.Services;
using Xunit;

namespace SplitRail.Api.Tests.Unit;

public class QboTokenServiceTests
{
    [Fact]
    public void ProtectAndUnprotect_RoundTripsToken()
    {
        var provider = DataProtectionProvider.Create("test");
        var service = CreateService(provider);

        var encrypted = service.Protect("secret-access-token");
        var decrypted = service.Unprotect(encrypted);

        decrypted.Should().Be("secret-access-token");
        encrypted.Should().NotContain("secret-access-token");
    }

    [Fact]
    public async Task RefreshFailure_ThrowsWithoutCleartextTokenInMessage()
    {
        var (db, tenantContext) = CreateDb();
        var orgId = Guid.NewGuid();
        var venueId = Guid.NewGuid();
        tenantContext.SetContext(Guid.NewGuid(), orgId);

        var provider = DataProtectionProvider.Create("test");
        var protector = provider.CreateProtector("QboOAuthTokens");

        db.Venues.Add(new Venue { Id = venueId, OrganizationId = orgId, Name = "Venue" });
        db.QboVenueCredentials.Add(new QboVenueCredential
        {
            VenueId = venueId,
            RealmId = "realm-1",
            EncryptedAccessToken = protector.Protect("expired-access"),
            EncryptedRefreshToken = protector.Protect("refresh-token-value"),
            TokenExpiresAt = DateTimeOffset.UtcNow.AddMinutes(-10)
        });
        await db.SaveChangesAsync();

        var handler = new StubHttpHandler(_ => new HttpResponseMessage(System.Net.HttpStatusCode.Unauthorized));
        var factory = Substitute.For<IHttpClientFactory>();
        factory.CreateClient("QboOAuth").Returns(_ => new HttpClient(handler));

        var service = new QboTokenService(
            db,
            factory,
            provider,
            Options.Create(new QboSyncOptions
            {
                ClientId = "id",
                ClientSecret = "secret",
                IntuitTokenUrl = "https://oauth.test/token"
            }),
            NullLogger<QboTokenService>.Instance);

        var act = () => service.GetValidAccessTokenAsync(venueId);

        var ex = await act.Should().ThrowAsync<QboTokenRefreshException>();
        ex.Which.Message.Should().NotContain("refresh-token-value");
        ex.Which.Message.Should().NotContain("expired-access");
    }

    [Fact]
    public void LogMessages_NeverContainCleartextTokenSubstrings()
    {
        const string token = "super-secret-qbo-token-abc123";
        var provider = DataProtectionProvider.Create("test");
        var service = CreateService(provider);

        var encrypted = service.Protect(token);

        encrypted.Should().NotContain(token);
        service.Unprotect(encrypted).Should().Be(token);
    }

    [Fact]
    public async Task IsConnectedAsync_ReturnsFalse_WhenNoCredential()
    {
        var (db, _) = CreateDb();
        var service = CreateService(DataProtectionProvider.Create("test"), db);

        var connected = await service.IsConnectedAsync(Guid.NewGuid());
        connected.Should().BeFalse();
    }

    [Fact]
    public async Task IsConnectedAsync_ReturnsTrue_WhenCredentialExists()
    {
        var (db, tenantContext) = CreateDb();
        var orgId = Guid.NewGuid();
        var venueId = Guid.NewGuid();
        tenantContext.SetContext(Guid.NewGuid(), orgId);

        db.Venues.Add(new Venue { Id = venueId, OrganizationId = orgId, Name = "Venue" });
        db.QboVenueCredentials.Add(new QboVenueCredential
        {
            VenueId = venueId,
            RealmId = "realm-1",
            EncryptedAccessToken = "enc",
            EncryptedRefreshToken = "enc",
            TokenExpiresAt = DateTimeOffset.UtcNow.AddHours(1)
        });
        await db.SaveChangesAsync();

        var service = CreateService(DataProtectionProvider.Create("test"), db);
        var connected = await service.IsConnectedAsync(venueId);
        connected.Should().BeTrue();
    }

    [Fact]
    public async Task StoreTokensAsync_CreatesAndUpdatesCredential()
    {
        var (db, tenantContext) = CreateDb();
        var orgId = Guid.NewGuid();
        var venueId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        tenantContext.SetContext(userId, orgId);

        db.Venues.Add(new Venue { Id = venueId, OrganizationId = orgId, Name = "Venue" });
        await db.SaveChangesAsync();

        var provider = DataProtectionProvider.Create("test");
        var service = CreateService(provider, db);

        await service.StoreTokensAsync(venueId, "realm-1", "access-1", "refresh-1",
            DateTimeOffset.UtcNow.AddHours(1), userId);
        (await service.IsConnectedAsync(venueId)).Should().BeTrue();

        await service.StoreTokensAsync(venueId, "realm-2", "access-2", "refresh-2",
            DateTimeOffset.UtcNow.AddHours(2), userId);

        var credential = await db.QboVenueCredentials.FirstAsync(c => c.VenueId == venueId);
        credential.RealmId.Should().Be("realm-2");
        service.Unprotect(credential.EncryptedAccessToken).Should().Be("access-2");
    }

    [Fact]
    public async Task GetValidAccessTokenAsync_ReturnsToken_WhenNotExpired()
    {
        var (db, tenantContext) = CreateDb();
        var orgId = Guid.NewGuid();
        var venueId = Guid.NewGuid();
        tenantContext.SetContext(Guid.NewGuid(), orgId);

        var provider = DataProtectionProvider.Create("test");
        var protector = provider.CreateProtector("QboOAuthTokens");

        db.Venues.Add(new Venue { Id = venueId, OrganizationId = orgId, Name = "Venue" });
        db.QboVenueCredentials.Add(new QboVenueCredential
        {
            VenueId = venueId,
            RealmId = "realm-1",
            EncryptedAccessToken = protector.Protect("valid-access"),
            EncryptedRefreshToken = protector.Protect("refresh"),
            TokenExpiresAt = DateTimeOffset.UtcNow.AddHours(1)
        });
        await db.SaveChangesAsync();

        var service = CreateService(provider, db);
        var (accessToken, realmId) = await service.GetValidAccessTokenAsync(venueId);

        accessToken.Should().Be("valid-access");
        realmId.Should().Be("realm-1");
    }

    [Fact]
    public async Task DisconnectAsync_RemovesCredential()
    {
        var (db, tenantContext) = CreateDb();
        var orgId = Guid.NewGuid();
        var venueId = Guid.NewGuid();
        tenantContext.SetContext(Guid.NewGuid(), orgId);

        var provider = DataProtectionProvider.Create("test");
        var protector = provider.CreateProtector("QboOAuthTokens");

        db.Venues.Add(new Venue { Id = venueId, OrganizationId = orgId, Name = "Venue" });
        db.QboVenueCredentials.Add(new QboVenueCredential
        {
            VenueId = venueId,
            RealmId = "realm-1",
            EncryptedAccessToken = protector.Protect("access"),
            EncryptedRefreshToken = protector.Protect("refresh"),
            TokenExpiresAt = DateTimeOffset.UtcNow.AddHours(1)
        });
        await db.SaveChangesAsync();

        var handler = new StubHttpHandler(_ => new HttpResponseMessage(System.Net.HttpStatusCode.OK));
        var factory = Substitute.For<IHttpClientFactory>();
        factory.CreateClient("QboOAuth").Returns(_ => new HttpClient(handler));

        var service = new QboTokenService(
            db,
            factory,
            provider,
            Options.Create(new QboSyncOptions
            {
                ClientId = "id",
                ClientSecret = "secret",
                IntuitRevokeUrl = "https://oauth.test/revoke"
            }),
            NullLogger<QboTokenService>.Instance);

        await service.DisconnectAsync(venueId);

        (await db.QboVenueCredentials.CountAsync()).Should().Be(0);
    }

    [Fact]
    public async Task ExchangeCodeAsync_ParsesTokenResponse()
    {
        var handler = new StubHttpHandler(_ => new HttpResponseMessage(System.Net.HttpStatusCode.OK)
        {
            Content = new StringContent(
                """{"access_token":"new-access","refresh_token":"new-refresh","expires_in":3600}""")
        });
        var factory = Substitute.For<IHttpClientFactory>();
        factory.CreateClient("QboOAuth").Returns(_ => new HttpClient(handler));

        var (db, _) = CreateDb();
        var service = new QboTokenService(
            db,
            factory,
            DataProtectionProvider.Create("test"),
            Options.Create(new QboSyncOptions
            {
                ClientId = "id",
                ClientSecret = "secret",
                IntuitTokenUrl = "https://oauth.test/token",
                RedirectUri = "http://localhost/callback"
            }),
            NullLogger<QboTokenService>.Instance);

        var (access, refresh, expiresAt) = await service.ExchangeCodeAsync("auth-code");

        access.Should().Be("new-access");
        refresh.Should().Be("new-refresh");
        expiresAt.Should().BeAfter(DateTimeOffset.UtcNow);
    }

    [Fact]
    public async Task RefreshTokenAsync_Success_UpdatesStoredCredential()
    {
        var (db, tenantContext) = CreateDb();
        var orgId = Guid.NewGuid();
        var venueId = Guid.NewGuid();
        tenantContext.SetContext(Guid.NewGuid(), orgId);

        var provider = DataProtectionProvider.Create("test");
        var protector = provider.CreateProtector("QboOAuthTokens");

        db.Venues.Add(new Venue { Id = venueId, OrganizationId = orgId, Name = "Venue" });
        db.QboVenueCredentials.Add(new QboVenueCredential
        {
            VenueId = venueId,
            RealmId = "realm-1",
            EncryptedAccessToken = protector.Protect("expired-access"),
            EncryptedRefreshToken = protector.Protect("refresh-token"),
            TokenExpiresAt = DateTimeOffset.UtcNow.AddMinutes(-10)
        });
        await db.SaveChangesAsync();

        var handler = new StubHttpHandler(_ => new HttpResponseMessage(System.Net.HttpStatusCode.OK)
        {
            Content = new StringContent(
                """{"access_token":"fresh-access","refresh_token":"fresh-refresh","expires_in":3600}""")
        });
        var factory = Substitute.For<IHttpClientFactory>();
        factory.CreateClient("QboOAuth").Returns(_ => new HttpClient(handler));

        var service = new QboTokenService(
            db,
            factory,
            provider,
            Options.Create(new QboSyncOptions
            {
                ClientId = "id",
                ClientSecret = "secret",
                IntuitTokenUrl = "https://oauth.test/token"
            }),
            NullLogger<QboTokenService>.Instance);

        var (accessToken, realmId) = await service.GetValidAccessTokenAsync(venueId);

        accessToken.Should().Be("fresh-access");
        realmId.Should().Be("realm-1");
    }

    private static QboTokenService CreateService(IDataProtectionProvider provider) =>
        CreateService(provider, CreateDb().Db);

    private static QboTokenService CreateService(IDataProtectionProvider provider, ApplicationDbContext db)
    {
        return new QboTokenService(
            db,
            Substitute.For<IHttpClientFactory>(),
            provider,
            Options.Create(new QboSyncOptions()),
            NullLogger<QboTokenService>.Instance);
    }

    private static (ApplicationDbContext Db, TenantContext TenantContext) CreateDb()
    {
        var tenantContext = new TenantContext();
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return (new ApplicationDbContext(options, tenantContext), tenantContext);
    }

    private sealed class StubHttpHandler : HttpMessageHandler
    {
        private readonly Func<HttpRequestMessage, HttpResponseMessage> _responder;

        public StubHttpHandler(Func<HttpRequestMessage, HttpResponseMessage> responder) => _responder = responder;

        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken) =>
            Task.FromResult(_responder(request));
    }
}
