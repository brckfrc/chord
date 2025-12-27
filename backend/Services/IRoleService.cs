using ChordAPI.Models.DTOs;

namespace ChordAPI.Services;

/// <summary>
/// Service for managing guild roles.
/// </summary>
public interface IRoleService
{
    /// <summary>
    /// Gets all roles for a guild, ordered by position.
    /// </summary>
    Task<List<RoleDto>> GetGuildRolesAsync(Guid guildId);

    /// <summary>
    /// Gets a role by ID.
    /// </summary>
    Task<RoleDto?> GetRoleByIdAsync(Guid roleId);

    /// <summary>
    /// Creates a new role in a guild.
    /// </summary>
    Task<RoleDto> CreateRoleAsync(Guid guildId, Guid requesterId, CreateRoleDto dto);

    /// <summary>
    /// Updates an existing role.
    /// </summary>
    Task<RoleDto> UpdateRoleAsync(Guid roleId, Guid requesterId, UpdateRoleDto dto);

    /// <summary>
    /// Deletes a role. System roles cannot be deleted.
    /// </summary>
    Task DeleteRoleAsync(Guid roleId, Guid requesterId);

    /// <summary>
    /// Reorders roles within a guild.
    /// </summary>
    Task ReorderRolesAsync(Guid guildId, Guid requesterId, List<Guid> roleIds);

    /// <summary>
    /// Assigns a role to a member.
    /// </summary>
    Task AssignRoleToMemberAsync(Guid guildId, Guid targetUserId, Guid roleId, Guid requesterId);

    /// <summary>
    /// Removes a role from a member.
    /// </summary>
    Task RemoveRoleFromMemberAsync(Guid guildId, Guid targetUserId, Guid roleId, Guid requesterId);

    /// <summary>
    /// Gets all roles for a specific member.
    /// </summary>
    Task<List<RoleDto>> GetMemberRolesAsync(Guid guildId, Guid userId);

    /// <summary>
    /// Creates default roles (owner, general) for a new guild.
    /// </summary>
    Task CreateDefaultRolesAsync(Guid guildId, Guid ownerId);

    /// <summary>
    /// Assigns the general role to a new member.
    /// </summary>
    Task AssignGeneralRoleAsync(Guid guildId, Guid userId);
}


