using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChordAPI.Migrations
{
    /// <inheritdoc />
    public partial class CreateDirectMessageReadStatesTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "DirectMessageReadStates",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ChannelId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LastReadMessageId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    LastReadAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DirectMessageReadStates", x => new { x.UserId, x.ChannelId });
                    table.ForeignKey(
                        name: "FK_DirectMessageReadStates_DirectMessageChannels_ChannelId",
                        column: x => x.ChannelId,
                        principalTable: "DirectMessageChannels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_DirectMessageReadStates_DirectMessages_LastReadMessageId",
                        column: x => x.LastReadMessageId,
                        principalTable: "DirectMessages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_DirectMessageReadStates_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DirectMessageReadStates_ChannelId",
                table: "DirectMessageReadStates",
                column: "ChannelId");

            migrationBuilder.CreateIndex(
                name: "IX_DirectMessageReadStates_LastReadAt",
                table: "DirectMessageReadStates",
                column: "LastReadAt");

            migrationBuilder.CreateIndex(
                name: "IX_DirectMessageReadStates_LastReadMessageId",
                table: "DirectMessageReadStates",
                column: "LastReadMessageId");

            migrationBuilder.CreateIndex(
                name: "IX_DirectMessageReadStates_UserId",
                table: "DirectMessageReadStates",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DirectMessageReadStates");
        }
    }
}
