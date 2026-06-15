using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SplitRail.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSettlementArchiveColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "can_reverse_settlement",
                table: "organization_roles",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "artist_signature_data",
                table: "events",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "settlement_pdf_url",
                table: "events",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "settlement_reversals",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    event_id = table.Column<Guid>(type: "uuid", nullable: false),
                    reversed_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    reason = table.Column<string>(type: "text", nullable: false),
                    previous_pdf_url = table.Column<string>(type: "text", nullable: false),
                    reversed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_settlement_reversals", x => x.id);
                    table.ForeignKey(
                        name: "FK_settlement_reversals_events_event_id",
                        column: x => x.event_id,
                        principalTable: "events",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_settlement_reversals_users_reversed_by_user_id",
                        column: x => x.reversed_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_settlement_reversals_event_id",
                table: "settlement_reversals",
                column: "event_id");

            migrationBuilder.CreateIndex(
                name: "IX_settlement_reversals_reversed_by_user_id",
                table: "settlement_reversals",
                column: "reversed_by_user_id");

            migrationBuilder.Sql(
                """
                UPDATE organization_roles
                SET can_reverse_settlement = TRUE
                WHERE role_name = 'Admin';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "settlement_reversals");

            migrationBuilder.DropColumn(
                name: "can_reverse_settlement",
                table: "organization_roles");

            migrationBuilder.DropColumn(
                name: "artist_signature_data",
                table: "events");

            migrationBuilder.DropColumn(
                name: "settlement_pdf_url",
                table: "events");
        }
    }
}
