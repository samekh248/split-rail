using Microsoft.EntityFrameworkCore;
using SplitRail.Api.Models;
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
    public DbSet<Venue> Venues => Set<Venue>();
    public DbSet<User> Users => Set<User>();
    public DbSet<OrganizationRole> OrganizationRoles => Set<OrganizationRole>();
    public DbSet<UserOrganizationMapping> UserOrganizationMappings => Set<UserOrganizationMapping>();
    public DbSet<UserVenueScope> UserVenueScopes => Set<UserVenueScope>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Invitation> Invitations => Set<Invitation>();
    public DbSet<InvitationVenueScope> InvitationVenueScopes => Set<InvitationVenueScope>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        ConfigureOrganization(modelBuilder);
        ConfigureVenue(modelBuilder);
        ConfigureUser(modelBuilder);
        ConfigureOrganizationRole(modelBuilder);
        ConfigureUserOrganizationMapping(modelBuilder);
        ConfigureUserVenueScope(modelBuilder);
        ConfigureRefreshToken(modelBuilder);
        ConfigureInvitation(modelBuilder);
        ConfigureInvitationVenueScope(modelBuilder);

        ApplyTenantQueryFilters(modelBuilder);
    }

    private void ApplyTenantQueryFilters(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Organization>().HasQueryFilter(e =>
            _tenantContext.OrganizationId == null || e.Id == _tenantContext.OrganizationId);

        modelBuilder.Entity<Venue>().HasQueryFilter(e =>
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
}
