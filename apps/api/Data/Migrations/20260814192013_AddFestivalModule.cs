using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SplitRail.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddFestivalModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ReviewState",
                table: "unmapped_qbo_transactions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "can_adjust_settlements",
                table: "organization_roles",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "can_finalize_settlements",
                table: "organization_roles",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "can_manage_allocations",
                table: "organization_roles",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "can_manage_festival_schedule",
                table: "organization_roles",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "can_override_settlements",
                table: "organization_roles",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "can_publish_public_itinerary",
                table: "organization_roles",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateOnly>(
                name: "end_date",
                table: "events",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "event_type",
                table: "events",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "STANDARD");

            migrationBuilder.CreateTable(
                name: "festival_artists",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    event_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_festival_artists", x => x.id);
                    table.ForeignKey(
                        name: "FK_festival_artists_events_event_id",
                        column: x => x.event_id,
                        principalTable: "events",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "festival_audit_entries",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    event_id = table.Column<Guid>(type: "uuid", nullable: false),
                    entity_type = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    entity_id = table.Column<Guid>(type: "uuid", nullable: false),
                    action = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    prior_value_json = table.Column<string>(type: "text", nullable: true),
                    new_value_json = table.Column<string>(type: "text", nullable: true),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    occurred_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    reason = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_festival_audit_entries", x => x.id);
                    table.ForeignKey(
                        name: "FK_festival_audit_entries_events_event_id",
                        column: x => x.event_id,
                        principalTable: "events",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "revenue_buckets",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    event_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    is_allocable = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    amount = table.Column<decimal>(type: "numeric(14,2)", nullable: false, defaultValue: 0m),
                    linked_line_item_id = table.Column<Guid>(type: "uuid", nullable: true),
                    locked_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    locked_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_revenue_buckets", x => x.id);
                    table.ForeignKey(
                        name: "FK_revenue_buckets_events_event_id",
                        column: x => x.event_id,
                        principalTable: "events",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_revenue_buckets_financial_line_items_linked_line_item_id",
                        column: x => x.linked_line_item_id,
                        principalTable: "financial_line_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "stage_zones",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    event_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false, defaultValue: 0),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_stage_zones", x => x.id);
                    table.ForeignKey(
                        name: "FK_stage_zones_events_event_id",
                        column: x => x.event_id,
                        principalTable: "events",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "programming_blocks",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    event_id = table.Column<Guid>(type: "uuid", nullable: false),
                    stage_zone_id = table.Column<Guid>(type: "uuid", nullable: false),
                    festival_artist_id = table.Column<Guid>(type: "uuid", nullable: true),
                    day_date = table.Column<DateOnly>(type: "date", nullable: false),
                    start_time = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    end_time = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    title = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    category = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "MUSIC"),
                    requires_settlement = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    is_publicly_visible = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    load_in_time = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    soundcheck_time = table.Column<TimeOnly>(type: "time without time zone", nullable: true),
                    schedule_status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "SCHEDULED"),
                    requires_settlement_review = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    deal_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "guarantee"),
                    base_guarantee = table.Column<decimal>(type: "numeric(12,2)", nullable: false, defaultValue: 0m),
                    backend_percentage = table.Column<decimal>(type: "numeric(5,2)", nullable: false, defaultValue: 0m),
                    percent_basis = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false, defaultValue: "GROSS"),
                    cap_amount = table.Column<decimal>(type: "numeric(12,2)", nullable: true),
                    floor_amount = table.Column<decimal>(type: "numeric(12,2)", nullable: true),
                    bonus_threshold_amount = table.Column<decimal>(type: "numeric(12,2)", nullable: true),
                    bonus_amount = table.Column<decimal>(type: "numeric(12,2)", nullable: true),
                    tax_withholding_percentage = table.Column<decimal>(type: "numeric(5,2)", nullable: false, defaultValue: 0m),
                    custom_formula_expression = table.Column<string>(type: "text", nullable: true),
                    settlement_status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "NOT_REQUIRED"),
                    calculated_net_payout = table.Column<decimal>(type: "numeric(12,2)", nullable: false, defaultValue: 0m),
                    finalized_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    finalized_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    settlement_pdf_url = table.Column<string>(type: "text", nullable: true),
                    finalized_snapshot_json = table.Column<string>(type: "text", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_programming_blocks", x => x.id);
                    table.ForeignKey(
                        name: "FK_programming_blocks_events_event_id",
                        column: x => x.event_id,
                        principalTable: "events",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_programming_blocks_festival_artists_festival_artist_id",
                        column: x => x.festival_artist_id,
                        principalTable: "festival_artists",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_programming_blocks_stage_zones_stage_zone_id",
                        column: x => x.stage_zone_id,
                        principalTable: "stage_zones",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_programming_blocks_users_finalized_by_user_id",
                        column: x => x.finalized_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "stage_zone_assignments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    stage_zone_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_stage_zone_assignments", x => x.id);
                    table.ForeignKey(
                        name: "FK_stage_zone_assignments_stage_zones_stage_zone_id",
                        column: x => x.stage_zone_id,
                        principalTable: "stage_zones",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_stage_zone_assignments_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "block_settlement_line_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    programming_block_id = table.Column<Guid>(type: "uuid", nullable: false),
                    line_type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    label = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    amount = table.Column<decimal>(type: "numeric(12,2)", nullable: false, defaultValue: 0m),
                    entered_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    entered_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_block_settlement_line_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_block_settlement_line_items_programming_blocks_programming_~",
                        column: x => x.programming_block_id,
                        principalTable: "programming_blocks",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "block_settlement_revisions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    programming_block_id = table.Column<Guid>(type: "uuid", nullable: false),
                    revision_number = table.Column<int>(type: "integer", nullable: false),
                    snapshot_json = table.Column<string>(type: "text", nullable: false),
                    reason_code = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    note = table.Column<string>(type: "text", nullable: true),
                    reopened_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    reopened_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    finalized_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    finalized_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    pdf_url = table.Column<string>(type: "text", nullable: true),
                    dispatch_outcome = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_block_settlement_revisions", x => x.id);
                    table.ForeignKey(
                        name: "FK_block_settlement_revisions_programming_blocks_programming_b~",
                        column: x => x.programming_block_id,
                        principalTable: "programming_blocks",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "expense_allocations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    event_id = table.Column<Guid>(type: "uuid", nullable: false),
                    source_line_item_id = table.Column<Guid>(type: "uuid", nullable: true),
                    source_qbo_transaction_id = table.Column<Guid>(type: "uuid", nullable: true),
                    target_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    target_day_date = table.Column<DateOnly>(type: "date", nullable: true),
                    target_stage_zone_id = table.Column<Guid>(type: "uuid", nullable: true),
                    target_block_id = table.Column<Guid>(type: "uuid", nullable: true),
                    method = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    percentage = table.Column<decimal>(type: "numeric(7,4)", nullable: true),
                    calculated_amount = table.Column<decimal>(type: "numeric(14,2)", nullable: false, defaultValue: 0m),
                    counts_toward_settlement = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_expense_allocations", x => x.id);
                    table.ForeignKey(
                        name: "FK_expense_allocations_events_event_id",
                        column: x => x.event_id,
                        principalTable: "events",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_expense_allocations_financial_line_items_source_line_item_id",
                        column: x => x.source_line_item_id,
                        principalTable: "financial_line_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_expense_allocations_programming_blocks_target_block_id",
                        column: x => x.target_block_id,
                        principalTable: "programming_blocks",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_expense_allocations_stage_zones_target_stage_zone_id",
                        column: x => x.target_stage_zone_id,
                        principalTable: "stage_zones",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_expense_allocations_unmapped_qbo_transactions_source_qbo_tr~",
                        column: x => x.source_qbo_transaction_id,
                        principalTable: "unmapped_qbo_transactions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "revenue_allocations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    revenue_bucket_id = table.Column<Guid>(type: "uuid", nullable: false),
                    programming_block_id = table.Column<Guid>(type: "uuid", nullable: false),
                    allocation_type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    percentage = table.Column<decimal>(type: "numeric(7,4)", nullable: true),
                    amount = table.Column<decimal>(type: "numeric(14,2)", nullable: true),
                    calculated_amount = table.Column<decimal>(type: "numeric(14,2)", nullable: false, defaultValue: 0m),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_revenue_allocations", x => x.id);
                    table.ForeignKey(
                        name: "FK_revenue_allocations_programming_blocks_programming_block_id",
                        column: x => x.programming_block_id,
                        principalTable: "programming_blocks",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_revenue_allocations_revenue_buckets_revenue_bucket_id",
                        column: x => x.revenue_bucket_id,
                        principalTable: "revenue_buckets",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_block_settlement_line_items_block_id",
                table: "block_settlement_line_items",
                column: "programming_block_id");

            migrationBuilder.CreateIndex(
                name: "ux_block_settlement_revisions_block_revision",
                table: "block_settlement_revisions",
                columns: new[] { "programming_block_id", "revision_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_expense_allocations_event_id",
                table: "expense_allocations",
                column: "event_id");

            migrationBuilder.CreateIndex(
                name: "ix_expense_allocations_source_line_item_id",
                table: "expense_allocations",
                column: "source_line_item_id");

            migrationBuilder.CreateIndex(
                name: "ix_expense_allocations_source_qbo_transaction_id",
                table: "expense_allocations",
                column: "source_qbo_transaction_id");

            migrationBuilder.CreateIndex(
                name: "ix_expense_allocations_target_block_id",
                table: "expense_allocations",
                column: "target_block_id");

            migrationBuilder.CreateIndex(
                name: "IX_expense_allocations_target_stage_zone_id",
                table: "expense_allocations",
                column: "target_stage_zone_id");

            migrationBuilder.CreateIndex(
                name: "ux_festival_artists_event_id_name",
                table: "festival_artists",
                columns: new[] { "event_id", "name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_festival_audit_entries_entity",
                table: "festival_audit_entries",
                columns: new[] { "entity_type", "entity_id" });

            migrationBuilder.CreateIndex(
                name: "ix_festival_audit_entries_event_id",
                table: "festival_audit_entries",
                column: "event_id");

            migrationBuilder.CreateIndex(
                name: "ix_programming_blocks_event_day",
                table: "programming_blocks",
                columns: new[] { "event_id", "day_date" });

            migrationBuilder.CreateIndex(
                name: "ix_programming_blocks_event_stage_day",
                table: "programming_blocks",
                columns: new[] { "event_id", "stage_zone_id", "day_date" });

            migrationBuilder.CreateIndex(
                name: "ix_programming_blocks_festival_artist_id",
                table: "programming_blocks",
                column: "festival_artist_id");

            migrationBuilder.CreateIndex(
                name: "IX_programming_blocks_finalized_by_user_id",
                table: "programming_blocks",
                column: "finalized_by_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_programming_blocks_stage_zone_id",
                table: "programming_blocks",
                column: "stage_zone_id");

            migrationBuilder.CreateIndex(
                name: "ix_revenue_allocations_block_id",
                table: "revenue_allocations",
                column: "programming_block_id");

            migrationBuilder.CreateIndex(
                name: "ix_revenue_allocations_bucket_id",
                table: "revenue_allocations",
                column: "revenue_bucket_id");

            migrationBuilder.CreateIndex(
                name: "IX_revenue_buckets_linked_line_item_id",
                table: "revenue_buckets",
                column: "linked_line_item_id");

            migrationBuilder.CreateIndex(
                name: "ux_revenue_buckets_event_id_name",
                table: "revenue_buckets",
                columns: new[] { "event_id", "name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_stage_zone_assignments_user_id",
                table: "stage_zone_assignments",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ux_stage_zone_assignments_stage_user",
                table: "stage_zone_assignments",
                columns: new[] { "stage_zone_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_stage_zones_event_id",
                table: "stage_zones",
                column: "event_id");

            migrationBuilder.CreateIndex(
                name: "ux_stage_zones_event_id_name",
                table: "stage_zones",
                columns: new[] { "event_id", "name" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "block_settlement_line_items");

            migrationBuilder.DropTable(
                name: "block_settlement_revisions");

            migrationBuilder.DropTable(
                name: "expense_allocations");

            migrationBuilder.DropTable(
                name: "festival_audit_entries");

            migrationBuilder.DropTable(
                name: "revenue_allocations");

            migrationBuilder.DropTable(
                name: "stage_zone_assignments");

            migrationBuilder.DropTable(
                name: "programming_blocks");

            migrationBuilder.DropTable(
                name: "revenue_buckets");

            migrationBuilder.DropTable(
                name: "festival_artists");

            migrationBuilder.DropTable(
                name: "stage_zones");

            migrationBuilder.DropColumn(
                name: "ReviewState",
                table: "unmapped_qbo_transactions");

            migrationBuilder.DropColumn(
                name: "can_adjust_settlements",
                table: "organization_roles");

            migrationBuilder.DropColumn(
                name: "can_finalize_settlements",
                table: "organization_roles");

            migrationBuilder.DropColumn(
                name: "can_manage_allocations",
                table: "organization_roles");

            migrationBuilder.DropColumn(
                name: "can_manage_festival_schedule",
                table: "organization_roles");

            migrationBuilder.DropColumn(
                name: "can_override_settlements",
                table: "organization_roles");

            migrationBuilder.DropColumn(
                name: "can_publish_public_itinerary",
                table: "organization_roles");

            migrationBuilder.DropColumn(
                name: "end_date",
                table: "events");

            migrationBuilder.DropColumn(
                name: "event_type",
                table: "events");
        }
    }
}
