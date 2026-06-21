using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using SplitRail.Api.Data;
using SplitRail.Api.Data.Interceptors;
using SplitRail.Api.DTOs;
using SplitRail.Api.DTOs.Auth;
using SplitRail.Api.DTOs.Invitations;
using SplitRail.Api.DTOs.Ledger;
using SplitRail.Api.DTOs.Organizations;
using SplitRail.Api.DTOs.Settlement;
using SplitRail.Api.DTOs.Venues;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;
using SplitRail.Api.Services;
using SplitRail.Api.Tests.TestSupport;
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
    protected InMemorySettlementArchiveStore ArchiveStore { get; } = new();
    protected ThrowingSettlementPdfRenderer ThrowingPdfRenderer { get; } = new();
    protected SaveChangesFailureInterceptor SaveChangesFailure { get; } = new();
    protected TestLogCollector? LogCollector { get; private set; }

    protected virtual bool ReplaceSettlementArchiveStore => true;
    protected virtual bool EnableLogCapture => false;

    protected virtual void AddAppConfiguration(Dictionary<string, string?> config)
    {
        config["QboSync:EnableInProcessTimer"] = "false";
        config["QboSync:ClientId"] = "test-client";
        config["QboSync:ClientSecret"] = "test-secret";
        config["QboSync:RedirectUri"] = "http://localhost/api/qbo/callback";
        config["QboSync:InternalTriggerKey"] = "test-internal-key";
        config["SettlementArchive:BucketName"] = "test-settlements-bucket";
        config["SettlementArchive:StagingBucketName"] = "test-settlements-staging";
        config["SettlementArchive:SignedUrlTtlMinutes"] = "15";
    }

    protected virtual void ConfigureAdditionalTestServices(IServiceCollection services) { }

    protected virtual void ConfigureTestServices(IServiceCollection services, string connectionString)
    {
        var descriptor = services.SingleOrDefault(d =>
            d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
        if (descriptor is not null)
            services.Remove(descriptor);

        services.AddSingleton(SaveChangesFailure);

        services.AddDbContext<ApplicationDbContext>((sp, options) =>
        {
            options.UseNpgsql(connectionString);
            options.AddInterceptors(
                sp.GetRequiredService<FrozenEventImmutabilityInterceptor>(),
                sp.GetRequiredService<SaveChangesFailureInterceptor>());
        });

        var pdfRendererDescriptor = services.SingleOrDefault(d =>
            d.ServiceType == typeof(ISettlementPdfRenderer));
        if (pdfRendererDescriptor is not null)
            services.Remove(pdfRendererDescriptor);

        services.AddSingleton(ThrowingPdfRenderer);
        services.AddSingleton<ISettlementPdfRenderer>(sp =>
            sp.GetRequiredService<ThrowingSettlementPdfRenderer>());

        if (!ReplaceSettlementArchiveStore)
        {
            ConfigureAdditionalTestServices(services);
            return;
        }

        var archiveDescriptor = services.SingleOrDefault(d =>
            d.ServiceType == typeof(ISettlementArchiveStore));
        if (archiveDescriptor is not null)
            services.Remove(archiveDescriptor);

        services.AddSingleton(ArchiveStore);
        services.AddSingleton<ISettlementArchiveStore>(sp =>
            sp.GetRequiredService<InMemorySettlementArchiveStore>());

        ConfigureAdditionalTestServices(services);
    }

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();

        var connectionString = _postgres.GetConnectionString();

        Action<IWebHostBuilder> configureWebHost = builder =>
        {
            builder.ConfigureAppConfiguration((_, config) =>
            {
                var settings = new Dictionary<string, string?>();
                AddAppConfiguration(settings);
                config.AddInMemoryCollection(settings);
            });

            builder.ConfigureServices(services =>
                ConfigureTestServices(services, connectionString));
        };

        if (EnableLogCapture)
        {
            LogCollector = new TestLogCollector();
            Factory = new LogCapturingWebApplicationFactory(LogCollector, configureWebHost);
        }
        else
        {
            Factory = new WebApplicationFactory<Program>().WithWebHostBuilder(configureWebHost);
        }

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

    protected async Task<(HttpClient Client, Guid VenueId, string AccessToken)> SetupFinancialAdminAsync(
        string? email = null)
    {
        email ??= $"fin-{Guid.NewGuid():N}@example.com";
        var (token, _, _) = await RegisterAndLoginAsync(email);
        token = await CreateOrgAndGetTokenAsync(token, email, "SecurePass1");
        var client = CreateAuthenticatedClient(token);

        var venueResponse = await client.PostAsJsonAsync("/api/venues",
            new CreateVenueRequest("Financial Test Venue"));
        venueResponse.EnsureSuccessStatusCode();
        var venue = await venueResponse.Content.ReadFromJsonAsync<VenueResponse>();

        return (client, venue!.Id, token);
    }

    protected async Task<EventResponse> CreateEventViaApiAsync(
        HttpClient client,
        Guid venueId,
        string title = "Test Show",
        string eventDate = "2026-07-04",
        string qboTagName = "EVENT-2026-07-04")
    {
        var response = await client.PostAsJsonAsync($"/api/venues/{venueId}/events",
            new CreateEventRequest(title, eventDate, qboTagName));
        response.EnsureSuccessStatusCode();
        return (await response.Content.ReadFromJsonAsync<EventResponse>())!;
    }

    protected async Task SetEventStatusDirectAsync(
        string accessToken,
        Guid eventId,
        EventStatus status,
        bool isBudgetLocked = true)
    {
        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (userId, orgId) = ParseTokenClaims(accessToken);
        tenantContext.SetContext(userId, orgId);

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var saveContext = scope.ServiceProvider.GetRequiredService<IFrozenEventSaveContext>();
        var evt = await db.Events.FirstAsync(e => e.Id == eventId);
        var originalStatus = evt.Status;
        evt.Status = status;
        evt.IsBudgetLocked = isBudgetLocked;

        using var authorize = ResolveFrozenEventSaveAuthorization(saveContext, originalStatus, status);
        await db.SaveChangesAsync();
    }

    private static IDisposable? ResolveFrozenEventSaveAuthorization(
        IFrozenEventSaveContext saveContext,
        EventStatus originalStatus,
        EventStatus targetStatus)
    {
        if (originalStatus == EventStatus.Settled && targetStatus == EventStatus.Reconciled)
            return saveContext.Authorize(FrozenEventSaveReason.EventReconciliation);

        if (originalStatus == EventStatus.Settled && targetStatus == EventStatus.PreShow)
            return saveContext.Authorize(FrozenEventSaveReason.SettlementReversal);

        return null;
    }

    protected async Task<Guid> SeedLineItemDirectAsync(
        string accessToken,
        Guid eventId,
        string blockType = "REVENUE",
        decimal proformaValue = 10000m,
        decimal settlementValue = 0m,
        bool isArtistDeduction = false,
        bool isHiddenFromPromoter = false)
    {
        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (userId, orgId) = ParseTokenClaims(accessToken);
        tenantContext.SetContext(userId, orgId);

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var lineItem = new FinancialLineItem
        {
            EventId = eventId,
            BlockType = blockType,
            RowLabel = "Seeded Row",
            SortOrder = 0,
            IsArtistDeduction = isArtistDeduction,
            ProformaValue = proformaValue,
            SettlementValue = settlementValue,
            IsHiddenFromPromoter = isHiddenFromPromoter
        };
        db.FinancialLineItems.Add(lineItem);
        await db.SaveChangesAsync();
        return lineItem.Id;
    }

    protected async Task<(HttpClient Client, Guid UserId)> CreateScopedVenueUserAsync(
        string adminAccessToken,
        Guid venueId,
        string email)
    {
        using var adminScope = Factory.Services.CreateScope();
        var tenantContext = adminScope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (adminUserId, orgId) = ParseTokenClaims(adminAccessToken);
        tenantContext.SetContext(adminUserId, orgId);

        var db = adminScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var adminRole = await db.OrganizationRoles.FirstAsync(r =>
            r.OrganizationId == orgId && r.RoleName == RoleNames.Admin);

        var rawToken = await SendInvitationViaServiceAsync(
            adminAccessToken, email, adminRole.Id, [venueId]);

        var acceptResponse = await Client.PostAsJsonAsync("/api/invitations/accept",
            new AcceptInvitationRequest(rawToken, "SecurePass1"));
        acceptResponse.EnsureSuccessStatusCode();

        var auth = await acceptResponse.Content.ReadFromJsonAsync<AcceptInvitationResponse>();
        var userId = ParseTokenClaims(auth!.AccessToken).UserId;

        return (CreateAuthenticatedClient(auth.AccessToken), userId);
    }

    protected async Task SeedQboCredentialDirectAsync(
        string accessToken,
        Guid venueId,
        string realmId = "test-realm")
    {
        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (userId, orgId) = ParseTokenClaims(accessToken);
        tenantContext.SetContext(userId, orgId);

        var protector = scope.ServiceProvider
            .GetRequiredService<IDataProtectionProvider>()
            .CreateProtector("QboOAuthTokens");

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.QboVenueCredentials.Add(new QboVenueCredential
        {
            VenueId = venueId,
            RealmId = realmId,
            EncryptedAccessToken = protector.Protect("test-access-token"),
            EncryptedRefreshToken = protector.Protect("test-refresh-token"),
            TokenExpiresAt = DateTimeOffset.UtcNow.AddHours(1),
            ConnectedAt = DateTimeOffset.UtcNow,
            ConnectedByUserId = userId
        });
        await db.SaveChangesAsync();
    }

    protected async Task<Guid> SeedQboMappingDirectAsync(
        string accessToken,
        Guid venueId,
        string qboAccountId,
        Guid? mappedLineItemId,
        string accountName = "Test Account",
        string categoryLabel = "Production")
    {
        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (userId, orgId) = ParseTokenClaims(accessToken);
        tenantContext.SetContext(userId, orgId);

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var mapping = new QboAccountMapping
        {
            VenueId = venueId,
            QboAccountId = qboAccountId,
            QboAccountName = accountName,
            MappedCategoryLabel = categoryLabel,
            MappedLineItemId = mappedLineItemId
        };
        db.QboAccountMappings.Add(mapping);
        await db.SaveChangesAsync();
        return mapping.Id;
    }

    protected async Task SeedSyncLedgerEntryDirectAsync(
        string accessToken,
        Guid eventId,
        string qboTransactionId,
        string qboAccountId,
        decimal amount,
        Guid? mappedLineItemId,
        Guid? syncBatchId = null)
    {
        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (userId, orgId) = ParseTokenClaims(accessToken);
        tenantContext.SetContext(userId, orgId);

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.QboSyncLedgers.Add(new QboSyncLedger
        {
            EventId = eventId,
            QboTransactionId = qboTransactionId,
            QboAccountId = qboAccountId,
            Amount = amount,
            TransactionDate = DateOnly.FromDateTime(DateTime.UtcNow),
            MappedLineItemId = mappedLineItemId,
            SyncBatchId = syncBatchId ?? Guid.NewGuid(),
            SyncedAt = DateTimeOffset.UtcNow,
            EntryType = QboSyncLedgerEntryType.Original
        });
        await db.SaveChangesAsync();
    }

    protected async Task SeedOffsetLedgerEntryDirectAsync(
        string accessToken,
        Guid eventId,
        Guid mappedLineItemId,
        string qboTransactionId,
        string qboAccountId,
        decimal amount,
        Guid? syncBatchId = null)
    {
        using var scope = Factory.Services.CreateScope();
        var tenantContext = scope.ServiceProvider.GetRequiredService<ITenantContext>();
        var (userId, orgId) = ParseTokenClaims(accessToken);
        tenantContext.SetContext(userId, orgId);

        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        db.QboSyncLedgers.Add(new QboSyncLedger
        {
            EventId = eventId,
            QboTransactionId = qboTransactionId,
            QboAccountId = qboAccountId,
            Amount = amount,
            TransactionDate = DateOnly.FromDateTime(DateTime.UtcNow),
            MappedLineItemId = mappedLineItemId,
            SyncBatchId = syncBatchId ?? Guid.NewGuid(),
            SyncedAt = DateTimeOffset.UtcNow,
            EntryType = QboSyncLedgerEntryType.OffsetCorrection,
            CorrectionType = QboSyncCorrectionType.AmountChange,
            TargetStateAbsent = false,
            TargetStateAmount = 100m
        });
        await db.SaveChangesAsync();
    }

    protected WebApplicationFactory<Program> CreateFactoryWithQboHandler(HttpMessageHandler handler) =>
        Factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                services.AddSingleton(handler);
                services.AddHttpClient("QboApi")
                    .ConfigurePrimaryHttpMessageHandler(sp => sp.GetRequiredService<HttpMessageHandler>());
                services.AddHttpClient("QboOAuth")
                    .ConfigurePrimaryHttpMessageHandler(sp => sp.GetRequiredService<HttpMessageHandler>());
            });
        });

    protected async Task<EventResponse> SeedSettlementReadyEventAsync(
        HttpClient client,
        Guid venueId,
        string accessToken)
    {
        var evt = await CreateEventViaApiAsync(client, venueId);
        await SeedLineItemDirectAsync(accessToken, evt.EventId, settlementValue: 5000m);
        await client.PostAsync($"/api/venues/{venueId}/events/{evt.EventId}/lock-budget", null);
        return evt;
    }

    protected sealed record FinalizedEventSeed(
        Guid EventId,
        LineItemDto LineItem,
        EventArtistDto? Artist,
        string StoredPath,
        byte[] OriginalPdfBytes,
        Guid UserId);

    protected async Task<FinalizedEventSeed> SeedFinalizedEventAsync(
        HttpClient client,
        Guid venueId,
        string token,
        bool includeArtist = false,
        string artistDealType = "guarantee",
        decimal artistBaseGuarantee = 5000m,
        decimal artistBackendPercentage = 0m,
        string? artistCustomFormulaExpression = null)
    {
        var (userId, _) = ParseTokenClaims(token);
        var evt = await CreateEventViaApiAsync(client, venueId);

        var createLineResponse = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items",
            new CreateLineItemRequest("REVENUE", "Control Row", 1, false, 100m, 0m, null));
        createLineResponse.EnsureSuccessStatusCode();
        var lineItem = (await createLineResponse.Content.ReadFromJsonAsync<LineItemDto>())!;

        var lockResponse = await client.PostAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/lock-budget", null);
        lockResponse.EnsureSuccessStatusCode();

        var updateLineResponse = await client.PutAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/line-items/{lineItem.Id}",
            new UpdateLineItemRequest("Control Row", 1, false, 100m, 100m, null, false, lineItem.RowVersion));
        updateLineResponse.EnsureSuccessStatusCode();
        lineItem = (await updateLineResponse.Content.ReadFromJsonAsync<LineItemDto>())!;

        EventArtistDto? artist = null;
        if (includeArtist)
        {
            var createArtistResponse = await client.PostAsJsonAsync(
                $"/api/venues/{venueId}/events/{evt.EventId}/artists",
                new CreateArtistRequest(
                    "Headliner",
                    1,
                    artistDealType,
                    artistCustomFormulaExpression,
                    artistBaseGuarantee,
                    artistBackendPercentage,
                    0m));
            createArtistResponse.EnsureSuccessStatusCode();
            artist = (await createArtistResponse.Content.ReadFromJsonAsync<EventArtistDto>())!;
        }

        var settleResponse = await client.PostAsJsonAsync(
            $"/api/venues/{venueId}/events/{evt.EventId}/settle",
            new FinalizeSettlementRequest(ValidSignatureBase64(), true));
        settleResponse.EnsureSuccessStatusCode();

        var storedPath = ArchiveStore.StoredObjectPaths.Single();
        var originalPdfBytes = ArchiveStore.GetStoredPdf(storedPath)!;

        return new FinalizedEventSeed(evt.EventId, lineItem, artist, storedPath, originalPdfBytes, userId);
    }

    protected Task<FinalizedEventSeed> SeedFinalizedEventWithArtistAsync(
        HttpClient client,
        Guid venueId,
        string token) =>
        SeedFinalizedEventAsync(client, venueId, token, includeArtist: true);

    protected Task<FinalizedEventSeed> SeedFinalizedEventWithArtistDealAsync(
        HttpClient client,
        Guid venueId,
        string token,
        string dealType,
        decimal baseGuarantee,
        decimal backendPercentage,
        string? customFormulaExpression = null) =>
        SeedFinalizedEventAsync(
            client,
            venueId,
            token,
            includeArtist: true,
            artistDealType: dealType,
            artistBaseGuarantee: baseGuarantee,
            artistBackendPercentage: backendPercentage,
            artistCustomFormulaExpression: customFormulaExpression);

    protected async Task<FinalizedEventSeed> SeedFinalizedThenReconciledAsync(
        HttpClient client,
        Guid venueId,
        string token,
        bool includeArtist = false)
    {
        var seed = await SeedFinalizedEventAsync(client, venueId, token, includeArtist);
        var reconcileResponse = await client.PostAsync(
            $"/api/venues/{venueId}/events/{seed.EventId}/reconcile", null);
        reconcileResponse.EnsureSuccessStatusCode();
        return seed;
    }

    protected IEnumerable<TestLogCollector.LogEntry> GetFrozenAuditLogs() =>
        LogCollector!.Entries.Where(e =>
            e.Level == LogLevel.Warning &&
            e.Message.Contains("Rejected frozen event mutation", StringComparison.Ordinal));

    protected void AssertFrozenAuditLog(
        Guid eventId,
        Guid venueId,
        Guid userId,
        string operation,
        string eventStatus)
    {
        var entry = GetFrozenAuditLogs().Should().ContainSingle().Subject;
        GetAuditStateValue(entry, "Operation").Should().Be(operation);
        GetAuditStateValue(entry, "EventId").Should().Be(eventId);
        GetAuditStateValue(entry, "VenueId").Should().Be(venueId);
        GetAuditStateValue(entry, "UserId").Should().Be(userId);
        GetAuditStateValue(entry, "EventStatus").Should().Be(eventStatus);
    }

    protected void AssertPdfUnchanged(FinalizedEventSeed seed)
    {
        ArchiveStore.GetStoredPdf(seed.StoredPath).Should().Equal(seed.OriginalPdfBytes);
        ArchiveStore.StoredObjectCount.Should().Be(1);
    }

    protected async Task AssertArtistPayoutUnchanged(Guid artistId, decimal expectedPayout)
    {
        using var scope = Factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var artist = await db.EventArtists.AsNoTracking().SingleAsync(a => a.Id == artistId);
        artist.CalculatedNetPayout.Should().Be(expectedPayout);
    }

    protected async Task AssertRecalculateRejectionResponse(HttpResponseMessage response)
    {
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var error = await response.Content.ReadFromJsonAsync<ErrorResponse>();
        error!.Type.Should().Be("ledger_state");
        error.Detail.Should().Contain("settled or reconciled");
    }

    protected static object? GetAuditStateValue(TestLogCollector.LogEntry entry, string key) =>
        entry.State.FirstOrDefault(kvp => kvp.Key == key).Value;

    protected static string ValidSignatureBase64()
    {
        const string json = "[[{\"x\":10,\"y\":20},{\"x\":30,\"y\":40}]]";
        return Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(json));
    }

    protected static bool IsQuestPdfSupported()
    {
        if (!OperatingSystem.IsWindows())
            return true;

        return Environment.GetEnvironmentVariable("PROCESSOR_ARCHITECTURE") is "AMD64" or "x86";
    }
}
