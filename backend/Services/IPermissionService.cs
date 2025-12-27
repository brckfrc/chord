using ChordAPI.Models.Entities;

namespace ChordAPI.Services;

/// <summary>
/// Service for checking user permissions within a guild.
/// </summary>
public interface IPermissionService
{
    /// <summary>
    /// Gets the combined permissions for a user in a guild.
    /// </summary>
    Task<GuildPermission> GetUserPermissionsAsync(Guid guildId, Guid userId);

    /// <summary>
    /// Checks if a user has a specific permission in a guild.
    /// </summary>
    Task<bool> HasPermissionAsync(Guid guildId, Guid userId, GuildPermission permission);

    /// <summary>
    /// Checks if a user has a specific permission. Throws UnauthorizedAccessException if not.
    /// </summary>
    Task CheckPermissionAsync(Guid guildId, Guid userId, GuildPermission permission, string? errorMessage = null);

    /// <summary>
    /// Checks if a user is the guild owner.
    /// </summary>
    Task<bool> IsOwnerAsync(Guid guildId, Guid userId);

    /// <summary>
    /// Checks if a user can manage a target role (based on role hierarchy).
    /// Users can only manage roles with a higher position number (lower in hierarchy) than their highest role.
    /// </summary>
    Task<bool> CanManageRoleAsync(Guid guildId, Guid userId, Guid targetRoleId);

    /// <summary>
    /// Gets the highest role position for a user (lowest number = highest rank).
    /// </summary>
    Task<int> GetHighestRolePositionAsync(Guid guildId, Guid userId);
}


