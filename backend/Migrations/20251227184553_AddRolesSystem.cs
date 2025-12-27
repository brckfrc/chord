using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChordAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddRolesSystem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Role",
                table: "GuildMembers");

            migrationBuilder.CreateTable(
                name: "Roles",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    GuildId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Color = table.Column<string>(type: "nvarchar(7)", maxLength: 7, nullable: true),
                    Position = table.Column<int>(type: "int", nullable: false),
                    Permissions = table.Column<long>(type: "bigint", nullable: false),
                    IsSystemRole = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Roles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Roles_Guilds_GuildId",
                        column: x => x.GuildId,
                        principalTable: "Guilds",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "GuildMemberRoles",
                columns: table => new
                {
                    GuildId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RoleId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssignedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GuildMemberRoles", x => new { x.GuildId, x.UserId, x.RoleId });
                    table.ForeignKey(
                        name: "FK_GuildMemberRoles_GuildMembers_GuildId_UserId",
                        columns: x => new { x.GuildId, x.UserId },
                        principalTable: "GuildMembers",
                        principalColumns: new[] { "GuildId", "UserId" },
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GuildMemberRoles_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "Roles",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_GuildMemberRoles_GuildId_UserId",
                table: "GuildMemberRoles",
                columns: new[] { "GuildId", "UserId" });

            migrationBuilder.CreateIndex(
                name: "IX_GuildMemberRoles_RoleId",
                table: "GuildMemberRoles",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_Roles_GuildId",
                table: "Roles",
                column: "GuildId");

            migrationBuilder.CreateIndex(
                name: "IX_Roles_GuildId_Name",
                table: "Roles",
                columns: new[] { "GuildId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Roles_GuildId_Position",
                table: "Roles",
                columns: new[] { "GuildId", "Position" });

            // Data migration: Create default roles for existing guilds
            // 1. Create "owner" role for each guild (Position=0, Administrator permission = 1)
            migrationBuilder.Sql(@"
                INSERT INTO Roles (Id, GuildId, Name, Color, Position, Permissions, IsSystemRole, CreatedAt)
                SELECT NEWID(), Id, 'owner', '#E91E63', 0, 1, 1, GETUTCDATE()
                FROM Guilds
            ");

            // 2. Create "general" role for each guild (Position=999, basic permissions)
            // Permissions: SendMessages(128) | ReadMessages(256) | AddReactions(1024) | Connect(2048) | Speak(4096) | CreateInvite(65536) = 73024
            migrationBuilder.Sql(@"
                INSERT INTO Roles (Id, GuildId, Name, Color, Position, Permissions, IsSystemRole, CreatedAt)
                SELECT NEWID(), Id, 'general', '#9E9E9E', 999, 73024, 1, GETUTCDATE()
                FROM Guilds
            ");

            // 3. Assign owner role to each guild's owner
            migrationBuilder.Sql(@"
                INSERT INTO GuildMemberRoles (GuildId, UserId, RoleId, AssignedAt)
                SELECT g.Id, g.OwnerId, r.Id, GETUTCDATE()
                FROM Guilds g
                INNER JOIN Roles r ON r.GuildId = g.Id AND r.Name = 'owner'
                WHERE EXISTS (SELECT 1 FROM GuildMembers gm WHERE gm.GuildId = g.Id AND gm.UserId = g.OwnerId)
            ");

            // 4. Assign general role to all existing guild members
            migrationBuilder.Sql(@"
                INSERT INTO GuildMemberRoles (GuildId, UserId, RoleId, AssignedAt)
                SELECT gm.GuildId, gm.UserId, r.Id, GETUTCDATE()
                FROM GuildMembers gm
                INNER JOIN Roles r ON r.GuildId = gm.GuildId AND r.Name = 'general'
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GuildMemberRoles");

            migrationBuilder.DropTable(
                name: "Roles");

            migrationBuilder.AddColumn<string>(
                name: "Role",
                table: "GuildMembers",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");
        }
    }
}
