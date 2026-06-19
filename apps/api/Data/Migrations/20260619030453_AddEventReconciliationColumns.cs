using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SplitRail.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddEventReconciliationColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "reconciled_at",
                table: "events",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "reconciled_by_user_id",
                table: "events",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_events_reconciled_by_user_id",
                table: "events",
                column: "reconciled_by_user_id");

            migrationBuilder.AddForeignKey(
                name: "FK_events_users_reconciled_by_user_id",
                table: "events",
                column: "reconciled_by_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_events_users_reconciled_by_user_id",
                table: "events");

            migrationBuilder.DropIndex(
                name: "IX_events_reconciled_by_user_id",
                table: "events");

            migrationBuilder.DropColumn(
                name: "reconciled_at",
                table: "events");

            migrationBuilder.DropColumn(
                name: "reconciled_by_user_id",
                table: "events");
        }
    }
}
