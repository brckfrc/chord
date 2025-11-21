using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChordAPI.Migrations
{
    /// <inheritdoc />
    public partial class SetExistingUsersToOffline : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Set all existing users' status to Offline (4)
            // This ensures existing users start as offline, matching the new default value
            migrationBuilder.Sql("UPDATE Users SET Status = 4 WHERE Status = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Revert: Set users back to Online (0) - though this may not be desired
            // This is just for migration rollback purposes
            migrationBuilder.Sql("UPDATE Users SET Status = 0 WHERE Status = 4");
        }
    }
}
