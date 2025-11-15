using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChordAPI.Migrations
{
    /// <inheritdoc />
    public partial class CreateChannelReadStatesTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ChannelReadStates",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ChannelId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    LastReadMessageId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    LastReadAt = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChannelReadStates", x => new { x.UserId, x.ChannelId });
                    table.ForeignKey(
                        name: "FK_ChannelReadStates_Channels_ChannelId",
                        column: x => x.ChannelId,
                        principalTable: "Channels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ChannelReadStates_Messages_LastReadMessageId",
                        column: x => x.LastReadMessageId,
                        principalTable: "Messages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ChannelReadStates_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ChannelReadStates_ChannelId",
                table: "ChannelReadStates",
                column: "ChannelId");

            migrationBuilder.CreateIndex(
                name: "IX_ChannelReadStates_LastReadAt",
                table: "ChannelReadStates",
                column: "LastReadAt");

            migrationBuilder.CreateIndex(
                name: "IX_ChannelReadStates_LastReadMessageId",
                table: "ChannelReadStates",
                column: "LastReadMessageId");

            migrationBuilder.CreateIndex(
                name: "IX_ChannelReadStates_UserId",
                table: "ChannelReadStates",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ChannelReadStates");
        }
    }
}
