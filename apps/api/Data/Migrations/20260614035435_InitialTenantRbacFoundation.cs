using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SplitRail.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialTenantRbacFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "organizations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_organizations", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    password_hash = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "organization_roles",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    role_name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    can_manage_permissions = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    can_lock_budget = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    can_edit_settlement = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    can_sign_settlement = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    can_trigger_qbo_sync = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    can_map_qbo_accounts = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    can_view_financials = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_organization_roles", x => x.id);
                    table.ForeignKey(
                        name: "FK_organization_roles_organizations_organization_id",
                        column: x => x.organization_id,
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "venues",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false, defaultValueSql: "gen_random_uuid()"),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_venues", x => x.id);
                    table.ForeignKey(
                        name: "FK_venues_organizations_organization_id",
                        column: x => x.organization_id,
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_organization_mappings",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    organization_id = table.Column<Guid>(type: "uuid", nullable: false),
                    role_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_organization_mappings", x => new { x.user_id, x.organization_id });
                    table.ForeignKey(
                        name: "FK_user_organization_mappings_organization_roles_role_id",
                        column: x => x.role_id,
                        principalTable: "organization_roles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_user_organization_mappings_organizations_organization_id",
                        column: x => x.organization_id,
                        principalTable: "organizations",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_user_organization_mappings_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "user_venue_scopes",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    venue_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_venue_scopes", x => new { x.user_id, x.venue_id });
                    table.ForeignKey(
                        name: "FK_user_venue_scopes_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_user_venue_scopes_venues_venue_id",
                        column: x => x.venue_id,
                        principalTable: "venues",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "unique_role_per_org",
                table: "organization_roles",
                columns: new[] { "organization_id", "role_name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_user_organization_mappings_organization_id",
                table: "user_organization_mappings",
                column: "organization_id");

            migrationBuilder.CreateIndex(
                name: "IX_user_organization_mappings_role_id",
                table: "user_organization_mappings",
                column: "role_id");

            migrationBuilder.CreateIndex(
                name: "IX_user_venue_scopes_venue_id",
                table: "user_venue_scopes",
                column: "venue_id");

            migrationBuilder.CreateIndex(
                name: "IX_users_email",
                table: "users",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_venues_organization_id",
                table: "venues",
                column: "organization_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "user_organization_mappings");

            migrationBuilder.DropTable(
                name: "user_venue_scopes");

            migrationBuilder.DropTable(
                name: "organization_roles");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "venues");

            migrationBuilder.DropTable(
                name: "organizations");
        }
    }
}
