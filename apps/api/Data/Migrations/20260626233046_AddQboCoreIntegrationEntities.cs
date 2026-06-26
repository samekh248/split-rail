using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SplitRail.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddQboCoreIntegrationEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "company_name",
                table: "qbo_venue_credentials",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_expired",
                table: "qbo_venue_credentials",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "time_zone_id",
                table: "organizations",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "America/Denver");

            migrationBuilder.CreateTable(
                name: "qbo_tracking_mappings",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    venue_id = table.Column<Guid>(type: "uuid", nullable: false),
                    qbo_tracking_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    qbo_tracking_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    qbo_tracking_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    target_tier = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    target_entity_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_qbo_tracking_mappings", x => x.id);
                    table.ForeignKey(
                        name: "FK_qbo_tracking_mappings_organizations_organization_id",
                        column: x => x.organization_id,
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_qbo_tracking_mappings_venues_venue_id",
                        column: x => x.venue_id,
                        principalTable: "venues",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_qbo_tracking_mappings_organization_id",
                table: "qbo_tracking_mappings",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_qbo_tracking_mappings_venue_tracking_target",
                table: "qbo_tracking_mappings",
                columns: new[] { "venue_id", "qbo_tracking_id", "target_tier", "target_entity_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "qbo_tracking_mappings");

            migrationBuilder.DropColumn(
                name: "company_name",
                table: "qbo_venue_credentials");

            migrationBuilder.DropColumn(
                name: "is_expired",
                table: "qbo_venue_credentials");

            migrationBuilder.DropColumn(
                name: "time_zone_id",
                table: "organizations");
        }
    }
}
