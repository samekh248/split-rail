using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SplitRail.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddFestivalBookingStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "booking_status",
                table: "programming_blocks",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "HOLD");

            // Blocks that existed before holds were modeled were already treated as booked, so
            // they backfill to CONFIRMED while the column default keeps new blocks on hold.
            migrationBuilder.Sql("UPDATE programming_blocks SET booking_status = 'CONFIRMED';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "booking_status",
                table: "programming_blocks");
        }
    }
}
