using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SplitRail.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddOrganizationArchivedAt : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<Guid>(
                name: "reversed_by_user_id",
                table: "settlement_reversals",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "archived_at",
                table: "organizations",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "archived_at",
                table: "organizations");

            migrationBuilder.AlterColumn<Guid>(
                name: "reversed_by_user_id",
                table: "settlement_reversals",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);
        }
    }
}
