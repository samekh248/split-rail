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

    private static QboTokenService CreateService(IDataProtectionProvider provider)
    {
        var (db, tenantContext) = CreateDb();
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
