using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SplitRail.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddQboSyncLedgerOffsetSemantics : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_qbo_sync_ledger_event_txn",
                table: "qbo_sync_ledger");

            migrationBuilder.AddColumn<Guid>(
                name: "corrected_ledger_entry_id",
                table: "qbo_sync_ledger",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "correction_type",
                table: "qbo_sync_ledger",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "entry_type",
                table: "qbo_sync_ledger",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Original");

            migrationBuilder.AddColumn<bool>(
                name: "target_state_absent",
                table: "qbo_sync_ledger",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "target_state_amount",
                table: "qbo_sync_ledger",
                type: "numeric(12,2)",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_qbo_sync_ledger_corrected_ledger_entry_id",
                table: "qbo_sync_ledger",
                column: "corrected_ledger_entry_id");

            migrationBuilder.CreateIndex(
                name: "IX_qbo_sync_ledger_event_entry_type",
                table: "qbo_sync_ledger",
                columns: new[] { "event_id", "entry_type" });

            migrationBuilder.CreateIndex(
                name: "IX_qbo_sync_ledger_event_txn_original",
                table: "qbo_sync_ledger",
                columns: new[] { "event_id", "qbo_transaction_id" },
                unique: true,
                filter: "entry_type = 'Original'");

            migrationBuilder.CreateIndex(
                name: "IX_qbo_sync_ledger_offset_idempotency",
                table: "qbo_sync_ledger",
                columns: new[] { "event_id", "qbo_transaction_id", "correction_type", "target_state_absent", "target_state_amount" },
                unique: true,
                filter: "entry_type = 'OffsetCorrection'");

            migrationBuilder.AddForeignKey(
                name: "FK_qbo_sync_ledger_qbo_sync_ledger_corrected_ledger_entry_id",
                table: "qbo_sync_ledger",
                column: "corrected_ledger_entry_id",
                principalTable: "qbo_sync_ledger",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_qbo_sync_ledger_qbo_sync_ledger_corrected_ledger_entry_id",
                table: "qbo_sync_ledger");

            migrationBuilder.DropIndex(
                name: "IX_qbo_sync_ledger_corrected_ledger_entry_id",
                table: "qbo_sync_ledger");

            migrationBuilder.DropIndex(
                name: "IX_qbo_sync_ledger_event_entry_type",
                table: "qbo_sync_ledger");

            migrationBuilder.DropIndex(
                name: "IX_qbo_sync_ledger_event_txn_original",
                table: "qbo_sync_ledger");

            migrationBuilder.DropIndex(
                name: "IX_qbo_sync_ledger_offset_idempotency",
                table: "qbo_sync_ledger");

            migrationBuilder.DropColumn(
                name: "corrected_ledger_entry_id",
                table: "qbo_sync_ledger");

            migrationBuilder.DropColumn(
                name: "correction_type",
                table: "qbo_sync_ledger");

            migrationBuilder.DropColumn(
                name: "entry_type",
                table: "qbo_sync_ledger");

            migrationBuilder.DropColumn(
                name: "target_state_absent",
                table: "qbo_sync_ledger");

            migrationBuilder.DropColumn(
                name: "target_state_amount",
                table: "qbo_sync_ledger");

            migrationBuilder.CreateIndex(
                name: "IX_qbo_sync_ledger_event_txn",
                table: "qbo_sync_ledger",
                columns: new[] { "event_id", "qbo_transaction_id" },
                unique: true);
        }
    }
}
