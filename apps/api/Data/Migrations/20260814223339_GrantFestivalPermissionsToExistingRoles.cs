using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SplitRail.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class GrantFestivalPermissionsToExistingRoles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Festival permission columns were added defaulting to false, so roles that existed
            // before the festival module never received the authority that CreateDefaultRoles
            // now grants Admin and Venue Manager on new organizations.
            migrationBuilder.Sql("""
                UPDATE organization_roles
                SET can_manage_festival_schedule = TRUE,
                    can_manage_allocations = TRUE,
                    can_adjust_settlements = TRUE,
                    can_finalize_settlements = TRUE,
                    can_override_settlements = TRUE,
                    can_publish_public_itinerary = TRUE
                WHERE role_name IN ('Admin', 'Venue Manager');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE organization_roles
                SET can_manage_festival_schedule = FALSE,
                    can_manage_allocations = FALSE,
                    can_adjust_settlements = FALSE,
                    can_finalize_settlements = FALSE,
                    can_override_settlements = FALSE,
                    can_publish_public_itinerary = FALSE
                WHERE role_name IN ('Admin', 'Venue Manager');
                """);
        }
    }
}
