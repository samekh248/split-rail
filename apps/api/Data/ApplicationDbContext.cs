using Microsoft.EntityFrameworkCore;
using SplitRail.Api.Models;

namespace SplitRail.Api.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options) { }

    public DbSet<Organization> Organizations => Set<Organization>();
    public DbSet<Venue> Venues => Set<Venue>();
    public DbSet<User> Users => Set<User>();
    public DbSet<OrganizationRole> OrganizationRoles => Set<OrganizationRole>();
    public DbSet<UserOrganizationMapping> UserOrganizationMappings => Set<UserOrganizationMapping>();
    public DbSet<UserVenueScope> UserVenueScopes => Set<UserVenueScope>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        ConfigureOrganization(modelBuilder);
        ConfigureVenue(modelBuilder);
        ConfigureUser(modelBuilder);
        ConfigureOrganizationRole(modelBuilder);
        ConfigureUserOrganizationMapping(modelBuilder);
        ConfigureUserVenueScope(modelBuilder);
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
}
