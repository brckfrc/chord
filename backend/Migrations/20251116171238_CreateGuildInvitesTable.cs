using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChordAPI.Migrations
{
    /// <inheritdoc />
    public partial class CreateGuildInvitesTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GuildInvites",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(8)", maxLength: 8, nullable: false),
                    GuildId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    MaxUses = table.Column<int>(type: "int", nullable: true),
                    Uses = table.Column<int>(type: "int", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GuildInvites", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GuildInvites_Guilds_GuildId",
                        column: x => x.GuildId,
                        principalTable: "Guilds",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_GuildInvites_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GuildInvites_Code",
                table: "GuildInvites",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GuildInvites_CreatedAt",
                table: "GuildInvites",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_GuildInvites_CreatedByUserId",
                table: "GuildInvites",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_GuildInvites_GuildId",
                table: "GuildInvites",
                column: "GuildId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GuildInvites");
        }
    }
}
