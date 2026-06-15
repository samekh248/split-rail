using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SplitRail.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddQboIntegrationEntities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "qbo_venue_credentials",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    venue_id = table.Column<Guid>(type: "uuid", nullable: false),
                    realm_id = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    encrypted_access_token = table.Column<string>(type: "text", nullable: false),
                    encrypted_refresh_token = table.Column<string>(type: "text", nullable: false),
                    token_expires_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    connected_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    connected_by_user_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_qbo_venue_credentials", x => x.id);
                    table.ForeignKey(
                        name: "FK_qbo_venue_credentials_users_connected_by_user_id",
                        column: x => x.connected_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_qbo_venue_credentials_venues_venue_id",
                        column: x => x.venue_id,
                        principalTable: "venues",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "unmapped_qbo_transactions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    event_id = table.Column<Guid>(type: "uuid", nullable: false),
                    venue_id = table.Column<Guid>(type: "uuid", nullable: false),
                    qbo_transaction_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    qbo_account_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    qbo_account_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    amount = table.Column<decimal>(type: "numeric(12,2)", nullable: false),
                    transaction_date = table.Column<DateOnly>(type: "date", nullable: false),
                    synced_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_unmapped_qbo_transactions", x => x.id);
                    table.ForeignKey(
                        name: "FK_unmapped_qbo_transactions_events_event_id",
                        column: x => x.event_id,
                        principalTable: "events",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_unmapped_qbo_transactions_venues_venue_id",
                        column: x => x.venue_id,
                        principalTable: "venues",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "qbo_account_mappings",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    venue_id = table.Column<Guid>(type: "uuid", nullable: false),
                    qbo_account_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    qbo_account_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    mapped_category_label = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    mapped_line_item_id = table.Column<Guid>(type: "uuid", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_qbo_account_mappings", x => x.id);
                    table.ForeignKey(
                        name: "FK_qbo_account_mappings_financial_line_items_mapped_line_item_id",
                        column: x => x.mapped_line_item_id,
                        principalTable: "financial_line_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_qbo_account_mappings_venues_venue_id",
                        column: x => x.venue_id,
                        principalTable: "venues",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "qbo_sync_ledger",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    event_id = table.Column<Guid>(type: "uuid", nullable: false),
                    qbo_transaction_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    qbo_account_id = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    amount = table.Column<decimal>(type: "numeric(12,2)", nullable: false),
                    transaction_date = table.Column<DateOnly>(type: "date", nullable: false),
                    mapped_line_item_id = table.Column<Guid>(type: "uuid", nullable: true),
                    sync_batch_id = table.Column<Guid>(type: "uuid", nullable: false),
                    synced_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_qbo_sync_ledger", x => x.id);
                    table.ForeignKey(
                        name: "FK_qbo_sync_ledger_events_event_id",
                        column: x => x.event_id,
                        principalTable: "events",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_qbo_sync_ledger_financial_line_items_mapped_line_item_id",
                        column: x => x.mapped_line_item_id,
                        principalTable: "financial_line_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_qbo_account_mappings_mapped_line_item_id",
                table: "qbo_account_mappings",
                column: "mapped_line_item_id");

            migrationBuilder.CreateIndex(
                name: "IX_qbo_account_mappings_venue_account",
                table: "qbo_account_mappings",
                columns: new[] { "venue_id", "qbo_account_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_qbo_sync_ledger_event_txn",
                table: "qbo_sync_ledger",
                columns: new[] { "event_id", "qbo_transaction_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_qbo_sync_ledger_mapped_line_item_id",
                table: "qbo_sync_ledger",
                column: "mapped_line_item_id");

            migrationBuilder.CreateIndex(
                name: "IX_qbo_venue_credentials_connected_by_user_id",
                table: "qbo_venue_credentials",
                column: "connected_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_qbo_venue_credentials_venue_id",
                table: "qbo_venue_credentials",
                column: "venue_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_unmapped_qbo_txn_event_txn",
                table: "unmapped_qbo_transactions",
                columns: new[] { "event_id", "qbo_transaction_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_unmapped_qbo_txn_venue_account",
                table: "unmapped_qbo_transactions",
                columns: new[] { "venue_id", "qbo_account_id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "qbo_account_mappings");
            migrationBuilder.DropTable(name: "qbo_sync_ledger");
            migrationBuilder.DropTable(name: "qbo_venue_credentials");
            migrationBuilder.DropTable(name: "unmapped_qbo_transactions");
        }
    }
}
