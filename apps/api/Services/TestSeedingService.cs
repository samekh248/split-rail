using System.Security.Cryptography;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using SplitRail.Api.Configuration;
using SplitRail.Api.Data;
using SplitRail.Api.DTOs.Seeding;
using SplitRail.Api.Exceptions;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;
using SplitRail.Api.Services;

namespace SplitRail.Api.Services;

public class TestSeedingService
{
    public const string E2ePassword = "E2eTestPass1";

    private const string OrgAName = "E2E Org Alpha";
    private const string OrgBName = "E2E Org Bravo";
    private const string AlphaAdminEmail = "alpha-admin@e2e.test";
    private const string AlphaScopedEmail = "alpha-scoped@e2e.test";
    private const string BravoAdminEmail = "bravo-admin@e2e.test";
    private const string BravoScopedEmail = "bravo-scoped@e2e.test";
    private const string AlphaMainHall = "Alpha Main Hall";
    private const string AlphaSideRoom = "Alpha Side Room";
    private const string BravoMainHall = "Bravo Main Hall";
    private const string BravoSideRoom = "Bravo Side Room";

    private readonly ApplicationDbContext _db;
    private readonly PreviewOptions _previewOptions;
    private readonly ISettlementArchiveStore _archiveStore;
    private readonly IDataProtector _tokenProtector;
    private readonly FrozenEventMutationAuditor _frozenEventAuditor;

    public TestSeedingService(
        ApplicationDbContext db,
        IOptions<PreviewOptions> previewOptions,
        ISettlementArchiveStore archiveStore,
        IDataProtectionProvider dataProtectionProvider,
        FrozenEventMutationAuditor frozenEventAuditor)
    {
        _db = db;
        _previewOptions = previewOptions.Value;
        _archiveStore = archiveStore;
        _tokenProtector = dataProtectionProvider.CreateProtector("QboOAuthTokens");
        _frozenEventAuditor = frozenEventAuditor;
    }

    public void EnsureEnabled()
    {
        if (!_previewOptions.EnableTestSeeding)
            throw new NotFoundException("Test seeding is not available.");
    }

    public async Task<ResetSeedResponseDto> ResetAsync(CancellationToken cancellationToken = default)
    {
        EnsureEnabled();

        var e2eEmails = new[]
        {
            AlphaAdminEmail, AlphaScopedEmail, BravoAdminEmail, BravoScopedEmail
        };

        var users = await _db.Users
            .Where(u => e2eEmails.Contains(u.Email))
            .ToListAsync(cancellationToken);

        if (users.Count > 0)
        {
            var userIds = users.Select(u => u.Id).ToList();
            var orgIds = await _db.UserOrganizationMappings
                .Where(m => userIds.Contains(m.UserId))
                .Select(m => m.OrganizationId)
                .Distinct()
                .ToListAsync(cancellationToken);

            var venues = await _db.Venues
                .Where(v => orgIds.Contains(v.OrganizationId))
                .ToListAsync(cancellationToken);

            var venueIds = venues.Select(v => v.Id).ToList();
            var events = await _db.Events.Where(e => venueIds.Contains(e.VenueId)).ToListAsync(cancellationToken);
            var eventIds = events.Select(e => e.Id).ToList();

            _db.SettlementReversals.RemoveRange(
                await _db.SettlementReversals.Where(r => eventIds.Contains(r.EventId)).ToListAsync(cancellationToken));
            _db.UnmappedQboTransactions.RemoveRange(
                await _db.UnmappedQboTransactions.Where(t => eventIds.Contains(t.EventId)).ToListAsync(cancellationToken));
            _db.FinancialLineItems.RemoveRange(
                await _db.FinancialLineItems.Where(li => eventIds.Contains(li.EventId)).ToListAsync(cancellationToken));
            _db.EventArtists.RemoveRange(
                await _db.EventArtists.Where(a => eventIds.Contains(a.EventId)).ToListAsync(cancellationToken));
            _db.QboSyncLedgers.RemoveRange(
                await _db.QboSyncLedgers.Where(l => eventIds.Contains(l.EventId)).ToListAsync(cancellationToken));
            _db.Events.RemoveRange(events);

            _db.QboAccountMappings.RemoveRange(
                await _db.QboAccountMappings.Where(m => venueIds.Contains(m.VenueId)).ToListAsync(cancellationToken));
            _db.QboVenueCredentials.RemoveRange(
                await _db.QboVenueCredentials.Where(c => venueIds.Contains(c.VenueId)).ToListAsync(cancellationToken));
            _db.UserVenueScopes.RemoveRange(
                await _db.UserVenueScopes.Where(s => userIds.Contains(s.UserId)).ToListAsync(cancellationToken));
            _db.Venues.RemoveRange(venues);

            var invitationIds = await _db.Invitations
                .Where(i => orgIds.Contains(i.OrganizationId))
                .Select(i => i.Id)
                .ToListAsync(cancellationToken);
            _db.InvitationVenueScopes.RemoveRange(
                await _db.InvitationVenueScopes.Where(s => invitationIds.Contains(s.InvitationId)).ToListAsync(cancellationToken));
            _db.Invitations.RemoveRange(
                await _db.Invitations.Where(i => orgIds.Contains(i.OrganizationId)).ToListAsync(cancellationToken));
            _db.UserOrganizationMappings.RemoveRange(
                await _db.UserOrganizationMappings.Where(m => orgIds.Contains(m.OrganizationId)).ToListAsync(cancellationToken));
            _db.OrganizationRoles.RemoveRange(
                await _db.OrganizationRoles.Where(r => orgIds.Contains(r.OrganizationId)).ToListAsync(cancellationToken));
            _db.Organizations.RemoveRange(
                await _db.Organizations.Where(o => orgIds.Contains(o.Id)).ToListAsync(cancellationToken));

            _db.RefreshTokens.RemoveRange(
                await _db.RefreshTokens.Where(t => userIds.Contains(t.UserId)).ToListAsync(cancellationToken));
            _db.Users.RemoveRange(users);
            await _db.SaveChangesAsync(cancellationToken);
        }

        var orgA = await SeedOrganizationAsync(
            OrgAName, AlphaAdminEmail, AlphaScopedEmail, AlphaMainHall, AlphaSideRoom, cancellationToken);
        var orgB = await SeedOrganizationAsync(
            OrgBName, BravoAdminEmail, BravoScopedEmail, BravoMainHall, BravoSideRoom, cancellationToken);

        return new ResetSeedResponseDto(
            orgA,
            orgB,
            new SeedSentinelsDto(
                [OrgAName, AlphaMainHall, AlphaSideRoom, AlphaAdminEmail],
                [OrgBName, BravoMainHall, BravoSideRoom, BravoAdminEmail]));
    }

    public async Task<LifecycleEventSeedResponseDto> SeedLifecycleEventAsync(
        LifecycleEventSeedRequestDto request,
        CancellationToken cancellationToken = default)
    {
        EnsureEnabled();

        var venue = await _db.Venues
            .AsNoTracking()
            .Include(v => v.Organization)
            .FirstOrDefaultAsync(v => v.Id == request.VenueId && v.OrganizationId == request.OrganizationId,
                cancellationToken)
            ?? throw new NotFoundException("Venue not found.");

        var evt = new Event
        {
            Id = Guid.NewGuid(),
            VenueId = venue.Id,
            Title = "E2E Lifecycle Show",
            EventDate = DateOnly.FromDateTime(new DateTime(2026, 7, 4, 0, 0, 0, DateTimeKind.Utc)),
            QboTagName = FakeQboTransactionClient.LifecycleTagName,
            Status = EventStatus.PreShow,
            IsBudgetLocked = false
        };
        _db.Events.Add(evt);

        var revenue = new FinancialLineItem
        {
            EventId = evt.Id,
            BlockType = "REVENUE",
            RowLabel = "Ticket Revenue",
            SortOrder = 0,
            ProformaValue = 10000.00m,
            SettlementValue = 9500.00m
        };
        var expense = new FinancialLineItem
        {
            EventId = evt.Id,
            BlockType = "EXPENSE",
            RowLabel = "Production",
            SortOrder = 1,
            ProformaValue = 2000.00m,
            SettlementValue = 1800.00m,
            IsArtistDeduction = false
        };
        _db.FinancialLineItems.AddRange(revenue, expense);

        var artist = new EventArtist
        {
            EventId = evt.Id,
            ArtistName = "E2E Test Artist",
            DealType = DealType.Guarantee.ToString(),
            BaseGuarantee = 3000.00m,
            BackendPercentage = 85.00m,
            TaxWithholdingPercentage = 0m,
            PerformanceOrder = 1
        };
        _db.EventArtists.Add(artist);

        if (!await _db.QboVenueCredentials.AnyAsync(c => c.VenueId == venue.Id, cancellationToken))
        {
            _db.QboVenueCredentials.Add(new QboVenueCredential
            {
                Id = Guid.NewGuid(),
                VenueId = venue.Id,
                RealmId = "e2e-realm-001",
                EncryptedAccessToken = _tokenProtector.Protect("e2e-fake-access-token"),
                EncryptedRefreshToken = _tokenProtector.Protect("e2e-fake-refresh-token"),
                TokenExpiresAt = DateTimeOffset.UtcNow.AddDays(365),
                ConnectedAt = DateTimeOffset.UtcNow
            });
        }

        await _db.SaveChangesAsync(cancellationToken);

        var grossRevenue = 9500.00m;
        var totalDeductions = 0m;
        var netShowRevenue = grossRevenue - totalDeductions;
        var dealMath = new DealMathEngine(new CustomFormulaEvaluator());
        var netPayout = dealMath.CalculateNetPayout(
            DealType.Guarantee,
            netShowRevenue,
            grossRevenue,
            totalDeductions,
            3000.00m,
            85.00m,
            0m,
            null);

        var fakeActual = 5100.00m;
        var variance = fakeActual - expense.SettlementValue;

        return new LifecycleEventSeedResponseDto(
            evt.Id,
            venue.Id,
            evt.QboTagName,
            new ExpectedSettlementDto(
                netPayout.ToString("F2"),
                grossRevenue.ToString("F2"),
                netShowRevenue.ToString("F2")),
            new Dictionary<string, string>
            {
                [FakeQboTransactionClient.LifecycleAccountId] = variance.ToString("F2")
            });
    }

    public async Task<MutateSettledEventResponseDto> MutateSettledEventAsync(
        MutateSettledEventRequestDto request,
        CancellationToken cancellationToken = default)
    {
        EnsureEnabled();

        var lineItem = await _db.FinancialLineItems
            .Include(li => li.Event)
            .FirstOrDefaultAsync(li => li.EventId == request.EventId, cancellationToken);

        if (lineItem?.Event is null)
            throw new NotFoundException("Event not found.");

        if (lineItem.Event.Status is EventStatus.Settled or EventStatus.Reconciled)
        {
            try
            {
                _frozenEventAuditor.RejectIfFrozen(
                    lineItem.Event,
                    lineItem.Event.VenueId,
                    null,
                    FrozenEventMutationOperation.UpdateLineItem);
            }
            catch (LedgerStateException ex)
            {
                return new MutateSettledEventResponseDto(true, ex.Message);
            }
        }

        lineItem.SettlementValue = request.NewSettlementValue;
        await _db.SaveChangesAsync(cancellationToken);
        return new MutateSettledEventResponseDto(false, null);
    }

    public async Task<SettlementPdfHashResponseDto?> GetSettlementPdfHashAsync(
        Guid eventId,
        CancellationToken cancellationToken = default)
    {
        EnsureEnabled();

        var evt = await _db.Events.AsNoTracking().FirstOrDefaultAsync(e => e.Id == eventId, cancellationToken)
            ?? throw new NotFoundException("Event not found.");

        if (string.IsNullOrWhiteSpace(evt.SettlementPdfUrl))
            return null;

        var objectPath = SettlementService.ExtractObjectPath(evt.SettlementPdfUrl);
        var pdf = _archiveStore.TryGetStoredPdf(objectPath);
        if (pdf is null)
            return null;

        var hash = Convert.ToHexString(SHA256.HashData(pdf)).ToLowerInvariant();
        return new SettlementPdfHashResponseDto(hash);
    }

    public byte[]? GetSettlementPdfBytes(string objectPath)
    {
        EnsureEnabled();
        var normalizedPath = SettlementService.ExtractObjectPath(objectPath);
        return _archiveStore.TryGetStoredPdf(normalizedPath);
    }

    private async Task<OrgSeedContextDto> SeedOrganizationAsync(
        string orgName,
        string adminEmail,
        string scopedEmail,
        string inScopeVenueName,
        string outOfScopeVenueName,
        CancellationToken cancellationToken)
    {
        var admin = await CreateUserAsync(adminEmail, cancellationToken);
        var scopedUser = await CreateUserAsync(scopedEmail, cancellationToken);

        var org = new Organization { Id = Guid.NewGuid(), Name = orgName };
        _db.Organizations.Add(org);

        var adminRole = new OrganizationRole
        {
            Id = Guid.NewGuid(),
            OrganizationId = org.Id,
            RoleName = RoleNames.Admin,
            CanManagePermissions = true,
            CanLockBudget = true,
            CanEditSettlement = true,
            CanSignSettlement = true,
            CanReverseSettlement = true,
            CanTriggerQboSync = true,
            CanMapQboAccounts = true,
            CanViewFinancials = true
        };
        var venueManagerRole = new OrganizationRole
        {
            Id = Guid.NewGuid(),
            OrganizationId = org.Id,
            RoleName = RoleNames.VenueManager,
            CanLockBudget = true,
            CanEditSettlement = true,
            CanSignSettlement = true,
            CanTriggerQboSync = true,
            CanViewFinancials = true
        };
        _db.OrganizationRoles.AddRange(adminRole, venueManagerRole);

        _db.UserOrganizationMappings.AddRange(
            new UserOrganizationMapping { UserId = admin.Id, OrganizationId = org.Id, RoleId = adminRole.Id },
            new UserOrganizationMapping { UserId = scopedUser.Id, OrganizationId = org.Id, RoleId = venueManagerRole.Id });

        var inScopeVenue = new Venue { Id = Guid.NewGuid(), OrganizationId = org.Id, Name = inScopeVenueName };
        var outOfScopeVenue = new Venue { Id = Guid.NewGuid(), OrganizationId = org.Id, Name = outOfScopeVenueName };
        _db.Venues.AddRange(inScopeVenue, outOfScopeVenue);

        _db.UserVenueScopes.Add(new UserVenueScope
        {
            UserId = scopedUser.Id,
            VenueId = inScopeVenue.Id
        });

        await _db.SaveChangesAsync(cancellationToken);

        return new OrgSeedContextDto(
            org.Id,
            adminEmail,
            E2ePassword,
            scopedEmail,
            E2ePassword,
            inScopeVenue.Id,
            outOfScopeVenue.Id,
            admin.Id,
            scopedUser.Id);
    }

    private async Task<User> CreateUserAsync(string email, CancellationToken cancellationToken)
    {
        var normalized = email.Trim().ToLowerInvariant();
        var existing = await _db.Users.FirstOrDefaultAsync(u => u.Email == normalized, cancellationToken);
        if (existing is not null)
            return existing;

        var user = new User
        {
            Email = normalized,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(E2ePassword)
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync(cancellationToken);
        return user;
    }
}
