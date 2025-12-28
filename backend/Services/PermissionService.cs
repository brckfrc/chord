using ChordAPI.Data;
using ChordAPI.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace ChordAPI.Services;

public class PermissionService : IPermissionService
{
    private readonly AppDbContext _context;
    private readonly ILogger<PermissionService> _logger;

    public PermissionService(AppDbContext context, ILogger<PermissionService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<GuildPermission> GetUserPermissionsAsync(Guid guildId, Guid userId)
    {
        // Check if user is guild owner - owners have all permissions
        var guild = await _context.Guilds.FindAsync(guildId);
        if (guild == null)
        {
            return GuildPermission.None;
        }

        if (guild.OwnerId == userId)
        {
            return GuildPermission.Administrator;
        }

        // Get all roles for the user in this guild
        var userRoles = await _context.GuildMemberRoles
            .Where(gmr => gmr.GuildId == guildId && gmr.UserId == userId)
            .Include(gmr => gmr.Role)
            .Select(gmr => gmr.Role.Permissions)
            .ToListAsync();

        if (!userRoles.Any())
        {
            return GuildPermission.None;
        }

        // Combine all permissions using bitwise OR
        long combinedPermissions = 0;
        foreach (var permissions in userRoles)
        {
            combinedPermissions |= permissions;
        }

        // If user has Administrator permission, return full access
        if ((combinedPermissions & (long)GuildPermission.Administrator) != 0)
        {
            return GuildPermission.Administrator;
        }

        return (GuildPermission)combinedPermissions;
    }

    public async Task<bool> HasPermissionAsync(Guid guildId, Guid userId, GuildPermission permission)
    {
        var userPermissions = await GetUserPermissionsAsync(guildId, userId);

        // Administrator permission grants everything
        if ((userPermissions & GuildPermission.Administrator) != 0)
        {
            return true;
        }

        return (userPermissions & permission) == permission;
    }

    public async Task CheckPermissionAsync(Guid guildId, Guid userId, GuildPermission permission, string? errorMessage = null)
    {
        var hasPermission = await HasPermissionAsync(guildId, userId, permission);
        if (!hasPermission)
        {
            var message = errorMessage ?? $"You don't have the required permission: {permission}";
            throw new UnauthorizedAccessException(message);
        }
    }

    public async Task<bool> IsOwnerAsync(Guid guildId, Guid userId)
    {
        var guild = await _context.Guilds.FindAsync(guildId);
        return guild?.OwnerId == userId;
    }

    public async Task<bool> CanManageRoleAsync(Guid guildId, Guid userId, Guid targetRoleId)
    {
        // Guild owners can manage all roles
        if (await IsOwnerAsync(guildId, userId))
        {
            return true;
        }

        // Check if user has ManageRoles permission
        var hasManageRoles = await HasPermissionAsync(guildId, userId, GuildPermission.ManageRoles);
        if (!hasManageRoles)
        {
            return false;
        }

        // Get target role position
        var targetRole = await _context.Roles.FindAsync(targetRoleId);
        if (targetRole == null)
        {
            return false;
        }

        // Cannot manage system roles
        if (targetRole.IsSystemRole)
        {
            return false;
        }

        // Get user's highest role position (lowest number = highest rank)
        var userHighestPosition = await GetHighestRolePositionAsync(guildId, userId);

        // User can only manage roles with higher position number (lower in hierarchy)
        return targetRole.Position > userHighestPosition;
    }

    public async Task<int> GetHighestRolePositionAsync(Guid guildId, Guid userId)
    {
        var highestPosition = await _context.GuildMemberRoles
            .Where(gmr => gmr.GuildId == guildId && gmr.UserId == userId)
            .Include(gmr => gmr.Role)
            .Select(gmr => gmr.Role.Position)
            .DefaultIfEmpty(Role.GeneralPosition) // Default to general role position if no roles
            .MinAsync();

        return highestPosition;
    }
}



