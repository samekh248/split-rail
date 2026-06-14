using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SplitRail.Api.Data;

#nullable disable

namespace SplitRail.Api.Data.Migrations
{
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260614120000_AddFinancialLedgerEntities")]
    public partial class AddFinancialLedgerEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "events",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    venue_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    event_date = table.Column<DateOnly>(type: "date", nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "PRE_SHOW"),
                    qbo_tag_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    is_budget_locked = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    settled_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    settled_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_events", x => x.id);
                    table.ForeignKey(
                        name: "FK_events_users_settled_by_user_id",
                        column: x => x.settled_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_events_venues_venue_id",
                        column: x => x.venue_id,
                        principalTable: "venues",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "event_artists",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    event_id = table.Column<Guid>(type: "uuid", nullable: false),
                    artist_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    performance_order = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    deal_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    custom_formula_expression = table.Column<string>(type: "text", nullable: true),
                    base_guarantee = table.Column<decimal>(type: "numeric(12,2)", nullable: false, defaultValue: 0m),
                    backend_percentage = table.Column<decimal>(type: "numeric(5,2)", nullable: false, defaultValue: 0m),
                    tax_withholding_percentage = table.Column<decimal>(type: "numeric(5,2)", nullable: false, defaultValue: 0m),
                    calculated_net_payout = table.Column<decimal>(type: "numeric(12,2)", nullable: false, defaultValue: 0m)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_event_artists", x => x.id);
                    table.ForeignKey(
                        name: "FK_event_artists_events_event_id",
                        column: x => x.event_id,
                        principalTable: "events",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "financial_line_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    event_id = table.Column<Guid>(type: "uuid", nullable: false),
                    block_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    row_label = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    is_artist_deduction = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    proforma_value = table.Column<decimal>(type: "numeric(12,2)", nullable: false, defaultValue: 0m),
                    settlement_value = table.Column<decimal>(type: "numeric(12,2)", nullable: false, defaultValue: 0m),
                    qbo_actual_value = table.Column<decimal>(type: "numeric(12,2)", nullable: false, defaultValue: 0m),
                    notes = table.Column<string>(type: "text", nullable: true),
                    is_hidden_from_promoter = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_financial_line_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_financial_line_items_events_event_id",
                        column: x => x.event_id,
                        principalTable: "events",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_event_artists_event_id",
                table: "event_artists",
                column: "event_id");

            migrationBuilder.CreateIndex(
                name: "IX_events_venue_id",
                table: "events",
                column: "venue_id");

            migrationBuilder.CreateIndex(
                name: "IX_financial_line_items_event_id",
                table: "financial_line_items",
                column: "event_id");

            migrationBuilder.CreateIndex(
                name: "IX_financial_line_items_event_block_sort",
                table: "financial_line_items",
                columns: new[] { "event_id", "block_type", "sort_order" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "event_artists");
            migrationBuilder.DropTable(name: "financial_line_items");
            migrationBuilder.DropTable(name: "events");
        }
    }
}
