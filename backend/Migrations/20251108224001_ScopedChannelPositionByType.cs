using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChordAPI.Migrations
{
    /// <inheritdoc />
    public partial class ScopedChannelPositionByType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Step 1: Reset position values for TEXT channels (Type = 0)
            // Each TEXT channel gets a new position starting from 0 within its guild
            migrationBuilder.Sql(@"
                WITH TextChannels AS (
                    SELECT 
                        Id, 
                        GuildId,
                        ROW_NUMBER() OVER (PARTITION BY GuildId ORDER BY Position, CreatedAt) - 1 AS NewPosition
                    FROM Channels
                    WHERE Type = 0
                )
                UPDATE c
                SET Position = tc.NewPosition
                FROM Channels c
                INNER JOIN TextChannels tc ON c.Id = tc.Id;
            ");

            // Step 2: Reset position values for VOICE channels (Type = 1)
            // Each VOICE channel gets a new position starting from 0 within its guild
            migrationBuilder.Sql(@"
                WITH VoiceChannels AS (
                    SELECT 
                        Id, 
                        GuildId,
                        ROW_NUMBER() OVER (PARTITION BY GuildId ORDER BY Position, CreatedAt) - 1 AS NewPosition
                    FROM Channels
                    WHERE Type = 1
                )
                UPDATE c
                SET Position = vc.NewPosition
                FROM Channels c
                INNER JOIN VoiceChannels vc ON c.Id = vc.Id;
            ");

            // Step 3: Create unique index to enforce position uniqueness within (GuildId, Type)
            migrationBuilder.CreateIndex(
                name: "IX_Channels_GuildId_Type_Position",
                table: "Channels",
                columns: new[] { "GuildId", "Type", "Position" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Drop the unique index
            migrationBuilder.DropIndex(
                name: "IX_Channels_GuildId_Type_Position",
                table: "Channels");

            // Note: We cannot restore the original position values
            // The down migration only removes the index
        }
    }
}

