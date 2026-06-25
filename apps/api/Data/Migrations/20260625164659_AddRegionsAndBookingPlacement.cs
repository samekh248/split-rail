using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SplitRail.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRegionsAndBookingPlacement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "region_id",
                table: "venues",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "booking_placement_status",
                table: "events",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "CONFIRMED");

            migrationBuilder.AddColumn<TimeOnly>(
                name: "curfew_time",
                table: "events",
                type: "time without time zone",
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "doors_time",
                table: "events",
                type: "time without time zone",
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "load_in_time",
                table: "events",
                type: "time without time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "support_lineup",
                table: "events",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "regions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    notes = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_regions", x => x.id);
                    table.ForeignKey(
                        name: "FK_regions_organizations_organization_id",
                        column: x => x.organization_id,
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_venues_region_id",
                table: "venues",
                column: "region_id");

            migrationBuilder.CreateIndex(
                name: "ix_events_venue_id_event_date",
                table: "events",
                columns: new[] { "venue_id", "event_date" });

            migrationBuilder.CreateIndex(
                name: "ix_regions_organization_id_name",
                table: "regions",
                columns: new[] { "organization_id", "name" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_venues_regions_region_id",
                table: "venues",
                column: "region_id",
                principalTable: "regions",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_venues_regions_region_id",
                table: "venues");

            migrationBuilder.DropTable(
                name: "regions");

            migrationBuilder.DropIndex(
                name: "ix_venues_region_id",
                table: "venues");

            migrationBuilder.DropIndex(
                name: "ix_events_venue_id_event_date",
                table: "events");

            migrationBuilder.DropColumn(
                name: "region_id",
                table: "venues");

            migrationBuilder.DropColumn(
                name: "booking_placement_status",
                table: "events");

            migrationBuilder.DropColumn(
                name: "curfew_time",
                table: "events");

            migrationBuilder.DropColumn(
                name: "doors_time",
                table: "events");

            migrationBuilder.DropColumn(
                name: "load_in_time",
                table: "events");

            migrationBuilder.DropColumn(
                name: "support_lineup",
                table: "events");
        }
    }
}
