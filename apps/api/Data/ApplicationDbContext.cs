using Microsoft.EntityFrameworkCore;
using SplitRail.Api.DTOs.Booking;
using SplitRail.Api.DTOs.Ledger;
using SplitRail.Api.Models;
using SplitRail.Api.Models.Enums;
using SplitRail.Api.Services;

namespace SplitRail.Api.Data;

public class ApplicationDbContext : DbContext
{
    private readonly ITenantContext _tenantContext;

    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options, ITenantContext tenantContext)
        : base(options)
    {
        _tenantContext = tenantContext;
    }

    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<Region> Regions => Set<Region>();
    public DbSet<Venue> Venues => Set<Venue>();
    public DbSet<User> Users => Set<User>();
    public DbSet<OrganizationRole> OrganizationRoles => Set<OrganizationRole>();
    public DbSet<UserOrganizationMapping> UserOrganizationMappings => Set<UserOrganizationMapping>();
    public DbSet<UserVenueScope> UserVenueScopes => Set<UserVenueScope>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Invitation> Invitations => Set<Invitation>();
    public DbSet<InvitationVenueScope> InvitationVenueScopes => Set<InvitationVenueScope>();
    public DbSet<Event> Events => Set<Event>();
    public DbSet<FinancialLineItem> FinancialLineItems => Set<FinancialLineItem>();
    public DbSet<EventArtist> EventArtists => Set<EventArtist>();
    public DbSet<QboAccountMapping> QboAccountMappings => Set<QboAccountMapping>();
    public DbSet<QboVenueCredential> QboVenueCredentials => Set<QboVenueCredential>();
    public DbSet<QboSyncLedger> QboSyncLedgers => Set<QboSyncLedger>();
    public DbSet<UnmappedQboTransaction> UnmappedQboTransactions => Set<UnmappedQboTransaction>();
    public DbSet<SettlementReversal> SettlementReversals => Set<SettlementReversal>();
    public DbSet<UserEventPin> UserEventPins => Set<UserEventPin>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        ConfigureOrganization(modelBuilder);
        ConfigureRegion(modelBuilder);
        ConfigureVenue(modelBuilder);
        ConfigureUser(modelBuilder);
        ConfigureOrganizationRole(modelBuilder);
        ConfigureUserOrganizationMapping(modelBuilder);
        ConfigureUserVenueScope(modelBuilder);
        ConfigureRefreshToken(modelBuilder);
        ConfigureInvitation(modelBuilder);
        ConfigureInvitationVenueScope(modelBuilder);
        ConfigureEvent(modelBuilder);
        ConfigureFinancialLineItem(modelBuilder);
        ConfigureEventArtist(modelBuilder);
        ConfigureQboAccountMapping(modelBuilder);
        ConfigureQboVenueCredential(modelBuilder);
        ConfigureQboSyncLedger(modelBuilder);
        ConfigureUnmappedQboTransaction(modelBuilder);
        ConfigureSettlementReversal(modelBuilder);
        ConfigureUserEventPin(modelBuilder);

        ApplyTenantQueryFilters(modelBuilder);
    }

    private void ApplyTenantQueryFilters(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Organization>().HasQueryFilter(e =>
            (_tenantContext.OrganizationId == null || e.Id == _tenantContext.OrganizationId)
            && e.ArchivedAt == null);

        modelBuilder.Entity<Venue>().HasQueryFilter(e =>
            _tenantContext.OrganizationId == null || e.OrganizationId == _tenantContext.OrganizationId);

        modelBuilder.Entity<Region>().HasQueryFilter(e =>
            _tenantContext.OrganizationId == null || e.OrganizationId == _tenantContext.OrganizationId);

        modelBuilder.Entity<OrganizationRole>().HasQueryFilter(e =>
            _tenantContext.OrganizationId == null || e.OrganizationId == _tenantContext.OrganizationId);

        modelBuilder.Entity<UserOrganizationMapping>().HasQueryFilter(e =>
            _tenantContext.OrganizationId == null || e.OrganizationId == _tenantContext.OrganizationId);

        modelBuilder.Entity<UserVenueScope>().HasQueryFilter(e =>
            _tenantContext.OrganizationId == null ||
            e.Venue.OrganizationId == _tenantContext.OrganizationId);

        modelBuilder.Entity<Invitation>().HasQueryFilter(e =>
            _tenantContext.OrganizationId == null || e.OrganizationId == _tenantContext.OrganizationId);

        modelBuilder.Entity<InvitationVenueScope>().HasQueryFilter(e =>
            _tenantContext.OrganizationId == null ||
            e.Venue.OrganizationId == _tenantContext.OrganizationId);

        modelBuilder.Entity<Event>().HasQueryFilter(e =>
            _tenantContext.OrganizationId == null ||
            e.Venue.OrganizationId == _tenantContext.OrganizationId);

        modelBuilder.Entity<FinancialLineItem>().HasQueryFilter(e =>
            _tenantContext.OrganizationId == null ||
            e.Event.Venue.OrganizationId == _tenantContext.OrganizationId);

        modelBuilder.Entity<EventArtist>().HasQueryFilter(e =>
            _tenantContext.OrganizationId == null ||
            e.Event.Venue.OrganizationId == _tenantContext.OrganizationId);

        modelBuilder.Entity<QboAccountMapping>().HasQueryFilter(e =>
            _tenantContext.OrganizationId == null ||
            e.Venue.OrganizationId == _tenantContext.OrganizationId);

        modelBuilder.Entity<QboVenueCredential>().HasQueryFilter(e =>
            _tenantContext.OrganizationId == null ||
            e.Venue.OrganizationId == _tenantContext.OrganizationId);

        modelBuilder.Entity<QboSyncLedger>().HasQueryFilter(e =>
            _tenantContext.OrganizationId == null ||
            e.Event.Venue.OrganizationId == _tenantContext.OrganizationId);

        modelBuilder.Entity<UnmappedQboTransaction>().HasQueryFilter(e =>
            _tenantContext.OrganizationId == null ||
            e.Venue.OrganizationId == _tenantContext.OrganizationId);

        modelBuilder.Entity<SettlementReversal>().HasQueryFilter(e =>
            _tenantContext.OrganizationId == null ||
            e.Event.Venue.OrganizationId == _tenantContext.OrganizationId);

        modelBuilder.Entity<UserEventPin>().HasQueryFilter(e =>
            _tenantContext.OrganizationId == null ||
            e.Event.Venue.OrganizationId == _tenantContext.OrganizationId);
    }

    private static void ConfigureOrganization(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Organization>(entity =>
        {
            entity.ToTable("organizations");

            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id)
                .HasColumnName("id")
                .HasDefaultValueSql("gen_random_uuid()");

            entity.Property(e => e.Name)
                .HasColumnName("name")
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(e => e.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("NOW()");

            entity.Property(e => e.ArchivedAt)
                .HasColumnName("archived_at");
        });
    }

    private static void ConfigureVenue(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Venue>(entity =>
        {
            entity.ToTable("venues");

            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id)
                .HasColumnName("id")
                .HasDefaultValueSql("gen_random_uuid()");

            entity.Property(e => e.OrganizationId)
                .HasColumnName("organization_id");

            entity.Property(e => e.RegionId)
                .HasColumnName("region_id");

            entity.Property(e => e.Name)
                .HasColumnName("name")
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(e => e.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("NOW()");

            entity.HasOne(e => e.Organization)
                .WithMany(o => o.Venues)
                .HasForeignKey(e => e.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Region)
                .WithMany(r => r.Venues)
                .HasForeignKey(e => e.RegionId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasIndex(e => e.RegionId).HasDatabaseName("ix_venues_region_id");
        });
    }

    private static void ConfigureRegion(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Region>(entity =>
        {
            entity.ToTable("regions");

            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id)
                .HasColumnName("id")
                .HasDefaultValueSql("gen_random_uuid()");

            entity.Property(e => e.OrganizationId)
                .HasColumnName("organization_id");

            entity.Property(e => e.Name)
                .HasColumnName("name")
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(e => e.Notes)
                .HasColumnName("notes");

            entity.Property(e => e.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("NOW()");

            entity.HasOne(e => e.Organization)
                .WithMany(o => o.Regions)
                .HasForeignKey(e => e.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.OrganizationId, e.Name })
                .IsUnique()
                .HasDatabaseName("ix_regions_organization_id_name");
        });
    }

    private static void ConfigureUser(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");

            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id)
                .HasColumnName("id")
                .HasDefaultValueSql("gen_random_uuid()");

            entity.Property(e => e.Email)
                .HasColumnName("email")
                .HasMaxLength(255)
                .IsRequired();

            entity.HasIndex(e => e.Email).IsUnique();

            entity.Property(e => e.PasswordHash)
                .HasColumnName("password_hash")
                .IsRequired();

            entity.Property(e => e.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("NOW()");
        });
    }

    private static void ConfigureOrganizationRole(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<OrganizationRole>(entity =>
        {
            entity.ToTable("organization_roles");

            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id)
                .HasColumnName("id")
                .HasDefaultValueSql("gen_random_uuid()");

            entity.Property(e => e.OrganizationId)
                .HasColumnName("organization_id");

            entity.Property(e => e.RoleName)
                .HasColumnName("role_name")
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(e => e.CanManagePermissions)
                .HasColumnName("can_manage_permissions")
                .HasDefaultValue(false);

            entity.Property(e => e.CanLockBudget)
                .HasColumnName("can_lock_budget")
                .HasDefaultValue(false);

            entity.Property(e => e.CanEditSettlement)
                .HasColumnName("can_edit_settlement")
                .HasDefaultValue(false);

            entity.Property(e => e.CanSignSettlement)
                .HasColumnName("can_sign_settlement")
                .HasDefaultValue(false);

            entity.Property(e => e.CanReverseSettlement)
                .HasColumnName("can_reverse_settlement")
                .HasDefaultValue(false);

            entity.Property(e => e.CanTriggerQboSync)
                .HasColumnName("can_trigger_qbo_sync")
                .HasDefaultValue(false);

            entity.Property(e => e.CanMapQboAccounts)
                .HasColumnName("can_map_qbo_accounts")
                .HasDefaultValue(false);

            entity.Property(e => e.CanViewFinancials)
                .HasColumnName("can_view_financials")
                .HasDefaultValue(true);

            entity.HasIndex(e => new { e.OrganizationId, e.RoleName })
                .IsUnique()
                .HasDatabaseName("unique_role_per_org");

            entity.HasOne(e => e.Organization)
                .WithMany(o => o.Roles)
                .HasForeignKey(e => e.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureUserOrganizationMapping(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UserOrganizationMapping>(entity =>
        {
            entity.ToTable("user_organization_mappings");

            entity.HasKey(e => new { e.UserId, e.OrganizationId });

            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.Property(e => e.RoleId).HasColumnName("role_id");

            entity.HasOne(e => e.User)
                .WithMany(u => u.OrganizationMappings)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Organization)
                .WithMany(o => o.UserMappings)
                .HasForeignKey(e => e.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Role)
                .WithMany(r => r.UserMappings)
                .HasForeignKey(e => e.RoleId);
        });
    }

    private static void ConfigureUserVenueScope(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UserVenueScope>(entity =>
        {
            entity.ToTable("user_venue_scopes");

            entity.HasKey(e => new { e.UserId, e.VenueId });

            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.VenueId).HasColumnName("venue_id");

            entity.HasOne(e => e.User)
                .WithMany(u => u.VenueScopes)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Venue)
                .WithMany(v => v.UserVenueScopes)
                .HasForeignKey(e => e.VenueId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureRefreshToken(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<RefreshToken>(entity =>
        {
            entity.ToTable("refresh_tokens");

            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id)
                .HasColumnName("id")
                .HasDefaultValueSql("gen_random_uuid()");

            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.TokenHash)
                .HasColumnName("token_hash")
                .HasMaxLength(64)
                .IsRequired();
            entity.Property(e => e.ExpiresAt).HasColumnName("expires_at");
            entity.Property(e => e.IsRevoked).HasColumnName("is_revoked");
            entity.Property(e => e.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("NOW()");

            entity.HasIndex(e => e.UserId).HasDatabaseName("IX_refresh_tokens_user_id");
            entity.HasIndex(e => e.TokenHash).HasDatabaseName("IX_refresh_tokens_token_hash");

            entity.HasOne(e => e.User)
                .WithMany(u => u.RefreshTokens)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureInvitation(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Invitation>(entity =>
        {
            entity.ToTable("invitations");

            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id)
                .HasColumnName("id")
                .HasDefaultValueSql("gen_random_uuid()");

            entity.Property(e => e.OrganizationId).HasColumnName("organization_id");
            entity.Property(e => e.Email)
                .HasColumnName("email")
                .HasMaxLength(255)
                .IsRequired();
            entity.Property(e => e.RoleId).HasColumnName("role_id");
            entity.Property(e => e.TokenHash)
                .HasColumnName("token_hash")
                .HasMaxLength(64)
                .IsRequired();
            entity.Property(e => e.Status)
                .HasColumnName("status")
                .HasMaxLength(20)
                .HasDefaultValue(InvitationStatus.Pending);
            entity.Property(e => e.ExpiresAt).HasColumnName("expires_at");
            entity.Property(e => e.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("NOW()");

            entity.HasIndex(e => e.TokenHash).HasDatabaseName("IX_invitations_token_hash");
            entity.HasIndex(e => e.OrganizationId).HasDatabaseName("IX_invitations_organization_id");

            entity.HasOne(e => e.Organization)
                .WithMany(o => o.Invitations)
                .HasForeignKey(e => e.OrganizationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Role)
                .WithMany()
                .HasForeignKey(e => e.RoleId);
        });
    }

    private static void ConfigureInvitationVenueScope(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<InvitationVenueScope>(entity =>
        {
            entity.ToTable("invitation_venue_scopes");

            entity.HasKey(e => new { e.InvitationId, e.VenueId });
            entity.Property(e => e.InvitationId).HasColumnName("invitation_id");
            entity.Property(e => e.VenueId).HasColumnName("venue_id");

            entity.HasOne(e => e.Invitation)
                .WithMany(i => i.VenueScopes)
                .HasForeignKey(e => e.InvitationId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Venue)
                .WithMany()
                .HasForeignKey(e => e.VenueId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureEvent(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Event>(entity =>
        {
            entity.ToTable("events");

            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id)
                .HasColumnName("id")
                .HasDefaultValueSql("gen_random_uuid()");

            entity.Property(e => e.VenueId).HasColumnName("venue_id");

            entity.Property(e => e.Title)
                .HasColumnName("title")
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(e => e.EventDate).HasColumnName("event_date");

            entity.Property(e => e.Status)
                .HasColumnName("status")
                .HasMaxLength(20)
                .HasConversion(
                    v => EventStatusFormat.ToApiString(v),
                    v => EventStatusFormat.FromApiString(v))
                .HasDefaultValue(EventStatus.PreShow);

            entity.Property(e => e.QboTagName)
                .HasColumnName("qbo_tag_name")
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(e => e.IsBudgetLocked)
                .HasColumnName("is_budget_locked")
                .HasDefaultValue(false);

            entity.Property(e => e.SettledAt).HasColumnName("settled_at");
            entity.Property(e => e.SettledByUserId).HasColumnName("settled_by_user_id");
            entity.Property(e => e.ReconciledAt).HasColumnName("reconciled_at");
            entity.Property(e => e.ReconciledByUserId).HasColumnName("reconciled_by_user_id");

            entity.Property(e => e.ArtistSignatureData)
                .HasColumnName("artist_signature_data");

            entity.Property(e => e.SettlementPdfUrl)
                .HasColumnName("settlement_pdf_url");

            entity.Property(e => e.Xmin)
                .HasColumnName("xmin")
                .HasColumnType("xid")
                .ValueGeneratedOnAddOrUpdate()
                .IsConcurrencyToken();

            entity.Property(e => e.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("NOW()");

            entity.Property(e => e.BookingPlacementStatus)
                .HasColumnName("booking_placement_status")
                .HasMaxLength(20)
                .HasConversion(
                    v => BookingPlacementStatusFormat.ToApiString(v),
                    v => BookingPlacementStatusFormat.FromApiString(v))
                .HasDefaultValue(BookingPlacementStatus.Confirmed);

            entity.Property(e => e.DoorsTime)
                .HasColumnName("doors_time");

            entity.Property(e => e.LoadInTime)
                .HasColumnName("load_in_time");

            entity.Property(e => e.CurfewTime)
                .HasColumnName("curfew_time");

            entity.Property(e => e.SupportLineup)
                .HasColumnName("support_lineup")
                .HasMaxLength(2000);

            entity.HasIndex(e => e.VenueId).HasDatabaseName("IX_events_venue_id");
            entity.HasIndex(e => new { e.VenueId, e.EventDate })
                .HasDatabaseName("ix_events_venue_id_event_date");

            entity.HasOne(e => e.Venue)
                .WithMany()
                .HasForeignKey(e => e.VenueId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.SettledByUser)
                .WithMany()
                .HasForeignKey(e => e.SettledByUserId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.ReconciledByUser)
                .WithMany()
                .HasForeignKey(e => e.ReconciledByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }

    private static void ConfigureFinancialLineItem(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<FinancialLineItem>(entity =>
        {
            entity.ToTable("financial_line_items");

            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id)
                .HasColumnName("id")
                .HasDefaultValueSql("gen_random_uuid()");

            entity.Property(e => e.EventId).HasColumnName("event_id");

            entity.Property(e => e.BlockType)
                .HasColumnName("block_type")
                .HasMaxLength(20)
                .IsRequired();

            entity.Property(e => e.RowLabel)
                .HasColumnName("row_label")
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(e => e.SortOrder)
                .HasColumnName("sort_order")
                .HasDefaultValue(0);

            entity.Property(e => e.IsArtistDeduction)
                .HasColumnName("is_artist_deduction")
                .HasDefaultValue(false);

            entity.Property(e => e.ProformaValue)
                .HasColumnName("proforma_value")
                .HasColumnType("numeric(12,2)")
                .HasDefaultValue(0m);

            entity.Property(e => e.SettlementValue)
                .HasColumnName("settlement_value")
                .HasColumnType("numeric(12,2)")
                .HasDefaultValue(0m);

            entity.Property(e => e.QboActualValue)
                .HasColumnName("qbo_actual_value")
                .HasColumnType("numeric(12,2)")
                .HasDefaultValue(0m);

            entity.Property(e => e.Notes).HasColumnName("notes");
            entity.Property(e => e.IsHiddenFromPromoter)
                .HasColumnName("is_hidden_from_promoter")
                .HasDefaultValue(false);

            entity.Property(e => e.UpdatedAt)
                .HasColumnName("updated_at")
                .HasDefaultValueSql("NOW()");

            entity.Property(e => e.Xmin)
                .HasColumnName("xmin")
                .HasColumnType("xid")
                .ValueGeneratedOnAddOrUpdate()
                .IsConcurrencyToken();

            entity.HasIndex(e => e.EventId).HasDatabaseName("IX_financial_line_items_event_id");
            entity.HasIndex(e => new { e.EventId, e.BlockType, e.SortOrder })
                .HasDatabaseName("IX_financial_line_items_event_block_sort");

            entity.HasOne(e => e.Event)
                .WithMany(ev => ev.LineItems)
                .HasForeignKey(e => e.EventId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureEventArtist(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<EventArtist>(entity =>
        {
            entity.ToTable("event_artists");

            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id)
                .HasColumnName("id")
                .HasDefaultValueSql("gen_random_uuid()");

            entity.Property(e => e.EventId).HasColumnName("event_id");

            entity.Property(e => e.ArtistName)
                .HasColumnName("artist_name")
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(e => e.PerformanceOrder)
                .HasColumnName("performance_order")
                .HasDefaultValue(1);

            entity.Property(e => e.DealType)
                .HasColumnName("deal_type")
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(e => e.CustomFormulaExpression)
                .HasColumnName("custom_formula_expression");

            entity.Property(e => e.BaseGuarantee)
                .HasColumnName("base_guarantee")
                .HasColumnType("numeric(12,2)")
                .HasDefaultValue(0m);

            entity.Property(e => e.BackendPercentage)
                .HasColumnName("backend_percentage")
                .HasColumnType("numeric(5,2)")
                .HasDefaultValue(0m);

            entity.Property(e => e.TaxWithholdingPercentage)
                .HasColumnName("tax_withholding_percentage")
                .HasColumnType("numeric(5,2)")
                .HasDefaultValue(0m);

            entity.Property(e => e.CalculatedNetPayout)
                .HasColumnName("calculated_net_payout")
                .HasColumnType("numeric(12,2)")
                .HasDefaultValue(0m);

            entity.Property(e => e.Xmin)
                .HasColumnName("xmin")
                .HasColumnType("xid")
                .ValueGeneratedOnAddOrUpdate()
                .IsConcurrencyToken();

            entity.HasIndex(e => e.EventId).HasDatabaseName("IX_event_artists_event_id");

            entity.HasOne(e => e.Event)
                .WithMany(ev => ev.Artists)
                .HasForeignKey(e => e.EventId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureQboAccountMapping(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<QboAccountMapping>(entity =>
        {
            entity.ToTable("qbo_account_mappings");

            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id)
                .HasColumnName("id")
                .HasDefaultValueSql("gen_random_uuid()");

            entity.Property(e => e.VenueId).HasColumnName("venue_id");

            entity.Property(e => e.QboAccountId)
                .HasColumnName("qbo_account_id")
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(e => e.QboAccountName)
                .HasColumnName("qbo_account_name")
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(e => e.MappedCategoryLabel)
                .HasColumnName("mapped_category_label")
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(e => e.MappedLineItemId).HasColumnName("mapped_line_item_id");

            entity.Property(e => e.CreatedAt)
                .HasColumnName("created_at")
                .HasDefaultValueSql("NOW()");

            entity.HasIndex(e => new { e.VenueId, e.QboAccountId })
                .IsUnique()
                .HasDatabaseName("IX_qbo_account_mappings_venue_account");

            entity.HasOne(e => e.Venue)
                .WithMany(v => v.QboAccountMappings)
                .HasForeignKey(e => e.VenueId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.MappedLineItem)
                .WithMany()
                .HasForeignKey(e => e.MappedLineItemId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }

    private static void ConfigureQboVenueCredential(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<QboVenueCredential>(entity =>
        {
            entity.ToTable("qbo_venue_credentials");

            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id)
                .HasColumnName("id")
                .HasDefaultValueSql("gen_random_uuid()");

            entity.Property(e => e.VenueId).HasColumnName("venue_id");

            entity.Property(e => e.RealmId)
                .HasColumnName("realm_id")
                .HasMaxLength(50)
                .IsRequired();

            entity.Property(e => e.EncryptedAccessToken)
                .HasColumnName("encrypted_access_token")
                .IsRequired();

            entity.Property(e => e.EncryptedRefreshToken)
                .HasColumnName("encrypted_refresh_token")
                .IsRequired();

            entity.Property(e => e.TokenExpiresAt).HasColumnName("token_expires_at");
            entity.Property(e => e.ConnectedAt)
                .HasColumnName("connected_at")
                .HasDefaultValueSql("NOW()");

            entity.Property(e => e.ConnectedByUserId).HasColumnName("connected_by_user_id");

            entity.HasIndex(e => e.VenueId)
                .IsUnique()
                .HasDatabaseName("IX_qbo_venue_credentials_venue_id");

            entity.HasOne(e => e.Venue)
                .WithOne(v => v.QboCredential)
                .HasForeignKey<QboVenueCredential>(e => e.VenueId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ConnectedByUser)
                .WithMany()
                .HasForeignKey(e => e.ConnectedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }

    private static void ConfigureQboSyncLedger(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<QboSyncLedger>(entity =>
        {
            entity.ToTable("qbo_sync_ledger");

            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id)
                .HasColumnName("id")
                .HasDefaultValueSql("gen_random_uuid()");

            entity.Property(e => e.EventId).HasColumnName("event_id");

            entity.Property(e => e.QboTransactionId)
                .HasColumnName("qbo_transaction_id")
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(e => e.QboAccountId)
                .HasColumnName("qbo_account_id")
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(e => e.Amount)
                .HasColumnName("amount")
                .HasColumnType("numeric(12,2)");

            entity.Property(e => e.TransactionDate).HasColumnName("transaction_date");
            entity.Property(e => e.MappedLineItemId).HasColumnName("mapped_line_item_id");
            entity.Property(e => e.SyncBatchId).HasColumnName("sync_batch_id");

            entity.Property(e => e.SyncedAt)
                .HasColumnName("synced_at")
                .HasDefaultValueSql("NOW()");

            entity.Property(e => e.EntryType)
                .HasColumnName("entry_type")
                .HasConversion<string>()
                .HasMaxLength(20)
                .HasDefaultValue(QboSyncLedgerEntryType.Original);

            entity.Property(e => e.CorrectionType)
                .HasColumnName("correction_type")
                .HasConversion<string>()
                .HasMaxLength(20);

            entity.Property(e => e.TargetStateAbsent)
                .HasColumnName("target_state_absent");

            entity.Property(e => e.TargetStateAmount)
                .HasColumnName("target_state_amount")
                .HasColumnType("numeric(12,2)");

            entity.Property(e => e.CorrectedLedgerEntryId)
                .HasColumnName("corrected_ledger_entry_id");

            entity.HasIndex(e => new { e.EventId, e.QboTransactionId })
                .IsUnique()
                .HasFilter("entry_type = 'Original'")
                .HasDatabaseName("IX_qbo_sync_ledger_event_txn_original");

            entity.HasIndex(e => new
                {
                    e.EventId,
                    e.QboTransactionId,
                    e.CorrectionType,
                    e.TargetStateAbsent,
                    e.TargetStateAmount
                })
                .IsUnique()
                .HasFilter("entry_type = 'OffsetCorrection'")
                .HasDatabaseName("IX_qbo_sync_ledger_offset_idempotency");

            entity.HasIndex(e => new { e.EventId, e.EntryType })
                .HasDatabaseName("IX_qbo_sync_ledger_event_entry_type");

            entity.HasIndex(e => e.MappedLineItemId)
                .HasDatabaseName("IX_qbo_sync_ledger_mapped_line_item_id");

            entity.HasOne(e => e.Event)
                .WithMany(ev => ev.QboSyncLedgerEntries)
                .HasForeignKey(e => e.EventId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.MappedLineItem)
                .WithMany()
                .HasForeignKey(e => e.MappedLineItemId)
                .OnDelete(DeleteBehavior.SetNull);

            entity.HasOne(e => e.CorrectedLedgerEntry)
                .WithMany()
                .HasForeignKey(e => e.CorrectedLedgerEntryId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }

    private static void ConfigureUnmappedQboTransaction(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UnmappedQboTransaction>(entity =>
        {
            entity.ToTable("unmapped_qbo_transactions");

            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id)
                .HasColumnName("id")
                .HasDefaultValueSql("gen_random_uuid()");

            entity.Property(e => e.EventId).HasColumnName("event_id");
            entity.Property(e => e.VenueId).HasColumnName("venue_id");

            entity.Property(e => e.QboTransactionId)
                .HasColumnName("qbo_transaction_id")
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(e => e.QboAccountId)
                .HasColumnName("qbo_account_id")
                .HasMaxLength(100)
                .IsRequired();

            entity.Property(e => e.QboAccountName)
                .HasColumnName("qbo_account_name")
                .HasMaxLength(255)
                .IsRequired();

            entity.Property(e => e.Amount)
                .HasColumnName("amount")
                .HasColumnType("numeric(12,2)");

            entity.Property(e => e.TransactionDate).HasColumnName("transaction_date");

            entity.Property(e => e.SyncedAt)
                .HasColumnName("synced_at")
                .HasDefaultValueSql("NOW()");

            entity.HasIndex(e => new { e.EventId, e.QboTransactionId })
                .IsUnique()
                .HasDatabaseName("IX_unmapped_qbo_txn_event_txn");

            entity.HasIndex(e => new { e.VenueId, e.QboAccountId })
                .HasDatabaseName("IX_unmapped_qbo_txn_venue_account");

            entity.HasOne(e => e.Event)
                .WithMany(ev => ev.UnmappedQboTransactions)
                .HasForeignKey(e => e.EventId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Venue)
                .WithMany()
                .HasForeignKey(e => e.VenueId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureSettlementReversal(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<SettlementReversal>(entity =>
        {
            entity.ToTable("settlement_reversals");

            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id)
                .HasColumnName("id")
                .HasDefaultValueSql("gen_random_uuid()");

            entity.Property(e => e.EventId).HasColumnName("event_id");
            entity.Property(e => e.ReversedByUserId).HasColumnName("reversed_by_user_id");

            entity.Property(e => e.Reason)
                .HasColumnName("reason")
                .IsRequired();

            entity.Property(e => e.PreviousPdfUrl)
                .HasColumnName("previous_pdf_url")
                .IsRequired();

            entity.Property(e => e.ReversedAt)
                .HasColumnName("reversed_at")
                .HasDefaultValueSql("NOW()");

            entity.HasIndex(e => e.EventId).HasDatabaseName("IX_settlement_reversals_event_id");

            entity.HasOne(e => e.Event)
                .WithMany(ev => ev.Reversals)
                .HasForeignKey(e => e.EventId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.ReversedByUser)
                .WithMany()
                .HasForeignKey(e => e.ReversedByUserId)
                .OnDelete(DeleteBehavior.SetNull);
        });
    }

    private static void ConfigureUserEventPin(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UserEventPin>(entity =>
        {
            entity.ToTable("user_event_pins");

            entity.HasKey(e => new { e.UserId, e.EventId });

            entity.Property(e => e.UserId).HasColumnName("user_id");
            entity.Property(e => e.EventId).HasColumnName("event_id");

            entity.Property(e => e.PinnedAt)
                .HasColumnName("pinned_at")
                .HasDefaultValueSql("NOW()");

            entity.HasOne(e => e.User)
                .WithMany(u => u.EventPins)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Event)
                .WithMany(ev => ev.UserEventPins)
                .HasForeignKey(e => e.EventId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
