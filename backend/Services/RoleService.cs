using ChordAPI.Data;
using ChordAPI.Models.DTOs;
using ChordAPI.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace ChordAPI.Services;

public class RoleService : IRoleService
{
    private readonly AppDbContext _context;
    private readonly IPermissionService _permissionService;
    private readonly ILogger<RoleService> _logger;

    public RoleService(
        AppDbContext context,
        IPermissionService permissionService,
        ILogger<RoleService> logger)
    {
        _context = context;
        _permissionService = permissionService;
        _logger = logger;
    }

    public async Task<List<RoleDto>> GetGuildRolesAsync(Guid guildId)
    {
        var roles = await _context.Roles
            .Where(r => r.GuildId == guildId)
            .OrderBy(r => r.Position)
            .Select(r => new RoleDto
            {
                Id = r.Id,
                GuildId = r.GuildId,
                Name = r.Name,
                Color = r.Color,
                Position = r.Position,
                Permissions = r.Permissions,
                IsSystemRole = r.IsSystemRole,
                MemberCount = r.MemberRoles.Count,
                CreatedAt = r.CreatedAt
            })
            .ToListAsync();

        return roles;
    }

    public async Task<RoleDto?> GetRoleByIdAsync(Guid roleId)
    {
        var role = await _context.Roles
            .Where(r => r.Id == roleId)
            .Select(r => new RoleDto
            {
                Id = r.Id,
                GuildId = r.GuildId,
                Name = r.Name,
                Color = r.Color,
                Position = r.Position,
                Permissions = r.Permissions,
                IsSystemRole = r.IsSystemRole,
                MemberCount = r.MemberRoles.Count,
                CreatedAt = r.CreatedAt
            })
            .FirstOrDefaultAsync();

        return role;
    }

    public async Task<RoleDto> CreateRoleAsync(Guid guildId, Guid requesterId, CreateRoleDto dto)
    {
        // Check permission
        await _permissionService.CheckPermissionAsync(guildId, requesterId, GuildPermission.ManageRoles,
            "You don't have permission to create roles");

        // Validate name
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            throw new ArgumentException("Role name cannot be empty");
        }

        // Check for duplicate name
        var existingRole = await _context.Roles
            .FirstOrDefaultAsync(r => r.GuildId == guildId && r.Name == dto.Name);

        if (existingRole != null)
        {
            throw new InvalidOperationException($"A role with the name '{dto.Name}' already exists");
        }

        // Get next available position (before general role, which is at 999)
        var maxPosition = await _context.Roles
            .Where(r => r.GuildId == guildId && r.Position < Role.GeneralPosition)
            .Select(r => (int?)r.Position)
            .MaxAsync() ?? 0;

        var newPosition = maxPosition + 1;

        // Create role
        var role = new Role
        {
            Id = Guid.NewGuid(),
            GuildId = guildId,
            Name = dto.Name,
            Color = dto.Color,
            Position = newPosition,
            Permissions = dto.Permissions,
            IsSystemRole = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.Roles.Add(role);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Role {RoleId} '{RoleName}' created in guild {GuildId} by user {UserId}",
            role.Id, role.Name, guildId, requesterId);

        return new RoleDto
        {
            Id = role.Id,
            GuildId = role.GuildId,
            Name = role.Name,
            Color = role.Color,
            Position = role.Position,
            Permissions = role.Permissions,
            IsSystemRole = role.IsSystemRole,
            MemberCount = 0,
            CreatedAt = role.CreatedAt
        };
    }

    public async Task<RoleDto> UpdateRoleAsync(Guid roleId, Guid requesterId, UpdateRoleDto dto)
    {
        var role = await _context.Roles.FindAsync(roleId);
        if (role == null)
        {
            throw new KeyNotFoundException("Role not found");
        }

        // Check if user can manage this role
        if (!await _permissionService.CanManageRoleAsync(role.GuildId, requesterId, roleId))
        {
            throw new UnauthorizedAccessException("You don't have permission to update this role");
        }

        // Cannot rename system roles
        if (role.IsSystemRole && dto.Name != null && dto.Name != role.Name)
        {
            throw new InvalidOperationException("Cannot rename system roles");
        }

        // Check for duplicate name
        if (dto.Name != null && dto.Name != role.Name)
        {
            var existingRole = await _context.Roles
                .FirstOrDefaultAsync(r => r.GuildId == role.GuildId && r.Name == dto.Name);

            if (existingRole != null)
            {
                throw new InvalidOperationException($"A role with the name '{dto.Name}' already exists");
            }

            role.Name = dto.Name;
        }

        if (dto.Color != null)
        {
            role.Color = dto.Color;
        }

        if (dto.Permissions.HasValue)
        {
            role.Permissions = dto.Permissions.Value;
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("Role {RoleId} updated in guild {GuildId} by user {UserId}",
            roleId, role.GuildId, requesterId);

        var memberCount = await _context.GuildMemberRoles.CountAsync(gmr => gmr.RoleId == roleId);

        return new RoleDto
        {
            Id = role.Id,
            GuildId = role.GuildId,
            Name = role.Name,
            Color = role.Color,
            Position = role.Position,
            Permissions = role.Permissions,
            IsSystemRole = role.IsSystemRole,
            MemberCount = memberCount,
            CreatedAt = role.CreatedAt
        };
    }

    public async Task DeleteRoleAsync(Guid roleId, Guid requesterId)
    {
        var role = await _context.Roles.FindAsync(roleId);
        if (role == null)
        {
            throw new KeyNotFoundException("Role not found");
        }

        // Cannot delete system roles
        if (role.IsSystemRole)
        {
            throw new InvalidOperationException("Cannot delete system roles");
        }

        // Check if user can manage this role
        if (!await _permissionService.CanManageRoleAsync(role.GuildId, requesterId, roleId))
        {
            throw new UnauthorizedAccessException("You don't have permission to delete this role");
        }

        // Remove all role assignments first
        var assignments = await _context.GuildMemberRoles
            .Where(gmr => gmr.RoleId == roleId)
            .ToListAsync();

        _context.GuildMemberRoles.RemoveRange(assignments);
        _context.Roles.Remove(role);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Role {RoleId} deleted from guild {GuildId} by user {UserId}",
            roleId, role.GuildId, requesterId);
    }

    public async Task ReorderRolesAsync(Guid guildId, Guid requesterId, List<Guid> roleIds)
    {
        // Check permission
        await _permissionService.CheckPermissionAsync(guildId, requesterId, GuildPermission.ManageRoles,
            "You don't have permission to reorder roles");

        var userHighestPosition = await _permissionService.GetHighestRolePositionAsync(guildId, requesterId);

        // Get all non-system roles
        var roles = await _context.Roles
            .Where(r => r.GuildId == guildId && !r.IsSystemRole)
            .ToListAsync();

        // Validate that all provided role IDs exist and belong to this guild
        foreach (var roleId in roleIds)
        {
            var role = roles.FirstOrDefault(r => r.Id == roleId);
            if (role == null)
            {
                throw new ArgumentException($"Role {roleId} not found or cannot be reordered");
            }

            // User can only reorder roles below their own highest role
            if (role.Position <= userHighestPosition && !await _permissionService.IsOwnerAsync(guildId, requesterId))
            {
                throw new UnauthorizedAccessException("Cannot reorder roles above your own role");
            }
        }

        // Update positions (starting from 1, since 0 is for owner)
        for (int i = 0; i < roleIds.Count; i++)
        {
            var role = roles.First(r => r.Id == roleIds[i]);
            role.Position = i + 1;
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("Roles reordered in guild {GuildId} by user {UserId}", guildId, requesterId);
    }

    public async Task AssignRoleToMemberAsync(Guid guildId, Guid targetUserId, Guid roleId, Guid requesterId)
    {
        var role = await _context.Roles.FindAsync(roleId);
        if (role == null || role.GuildId != guildId)
        {
            throw new KeyNotFoundException("Role not found");
        }

        // Cannot manually assign owner role
        if (role.Name == Role.OwnerRoleName)
        {
            throw new InvalidOperationException("Cannot manually assign owner role");
        }

        // Check if user can manage this role
        if (!await _permissionService.CanManageRoleAsync(guildId, requesterId, roleId))
        {
            throw new UnauthorizedAccessException("You don't have permission to assign this role");
        }

        // Check if target user is a member
        var membership = await _context.GuildMembers
            .FirstOrDefaultAsync(gm => gm.GuildId == guildId && gm.UserId == targetUserId);

        if (membership == null)
        {
            throw new InvalidOperationException("User is not a member of this guild");
        }

        // Check if already assigned
        var existingAssignment = await _context.GuildMemberRoles
            .FirstOrDefaultAsync(gmr => gmr.GuildId == guildId && gmr.UserId == targetUserId && gmr.RoleId == roleId);

        if (existingAssignment != null)
        {
            return; // Already assigned
        }

        var assignment = new GuildMemberRole
        {
            GuildId = guildId,
            UserId = targetUserId,
            RoleId = roleId,
            AssignedAt = DateTime.UtcNow
        };

        _context.GuildMemberRoles.Add(assignment);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Role {RoleId} assigned to user {TargetUserId} in guild {GuildId} by user {RequesterId}",
            roleId, targetUserId, guildId, requesterId);
    }

    public async Task RemoveRoleFromMemberAsync(Guid guildId, Guid targetUserId, Guid roleId, Guid requesterId)
    {
        var role = await _context.Roles.FindAsync(roleId);
        if (role == null || role.GuildId != guildId)
        {
            throw new KeyNotFoundException("Role not found");
        }

        // Cannot remove owner or general role
        if (role.IsSystemRole)
        {
            throw new InvalidOperationException("Cannot remove system roles from members");
        }

        // Check if user can manage this role
        if (!await _permissionService.CanManageRoleAsync(guildId, requesterId, roleId))
        {
            throw new UnauthorizedAccessException("You don't have permission to remove this role");
        }

        var assignment = await _context.GuildMemberRoles
            .FirstOrDefaultAsync(gmr => gmr.GuildId == guildId && gmr.UserId == targetUserId && gmr.RoleId == roleId);

        if (assignment == null)
        {
            return; // Not assigned
        }

        _context.GuildMemberRoles.Remove(assignment);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Role {RoleId} removed from user {TargetUserId} in guild {GuildId} by user {RequesterId}",
            roleId, targetUserId, guildId, requesterId);
    }

    public async Task<List<RoleDto>> GetMemberRolesAsync(Guid guildId, Guid userId)
    {
        var roles = await _context.GuildMemberRoles
            .Where(gmr => gmr.GuildId == guildId && gmr.UserId == userId)
            .Include(gmr => gmr.Role)
            .OrderBy(gmr => gmr.Role.Position)
            .Select(gmr => new RoleDto
            {
                Id = gmr.Role.Id,
                GuildId = gmr.Role.GuildId,
                Name = gmr.Role.Name,
                Color = gmr.Role.Color,
                Position = gmr.Role.Position,
                Permissions = gmr.Role.Permissions,
                IsSystemRole = gmr.Role.IsSystemRole,
                MemberCount = gmr.Role.MemberRoles.Count,
                CreatedAt = gmr.Role.CreatedAt
            })
            .ToListAsync();

        return roles;
    }

    public async Task CreateDefaultRolesAsync(Guid guildId, Guid ownerId)
    {
        // Create owner role
        var ownerRole = new Role
        {
            Id = Guid.NewGuid(),
            GuildId = guildId,
            Name = Role.OwnerRoleName,
            Color = "#E91E63",
            Position = Role.OwnerPosition,
            Permissions = Role.OwnerPermissions,
            IsSystemRole = true,
            CreatedAt = DateTime.UtcNow
        };

        // Create general role
        var generalRole = new Role
        {
            Id = Guid.NewGuid(),
            GuildId = guildId,
            Name = Role.GeneralRoleName,
            Color = "#9E9E9E",
            Position = Role.GeneralPosition,
            Permissions = Role.DefaultGeneralPermissions,
            IsSystemRole = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Roles.AddRange(ownerRole, generalRole);
        await _context.SaveChangesAsync();

        // Assign owner role to the guild owner
        var ownerAssignment = new GuildMemberRole
        {
            GuildId = guildId,
            UserId = ownerId,
            RoleId = ownerRole.Id,
            AssignedAt = DateTime.UtcNow
        };

        // Assign general role to the guild owner
        var generalAssignment = new GuildMemberRole
        {
            GuildId = guildId,
            UserId = ownerId,
            RoleId = generalRole.Id,
            AssignedAt = DateTime.UtcNow
        };

        _context.GuildMemberRoles.AddRange(ownerAssignment, generalAssignment);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Default roles created for guild {GuildId}", guildId);
    }

    public async Task AssignGeneralRoleAsync(Guid guildId, Guid userId)
    {
        var generalRole = await _context.Roles
            .FirstOrDefaultAsync(r => r.GuildId == guildId && r.Name == Role.GeneralRoleName);

        if (generalRole == null)
        {
            _logger.LogWarning("General role not found for guild {GuildId}", guildId);
            return;
        }

        // Check if already assigned
        var existingAssignment = await _context.GuildMemberRoles
            .FirstOrDefaultAsync(gmr => gmr.GuildId == guildId && gmr.UserId == userId && gmr.RoleId == generalRole.Id);

        if (existingAssignment != null)
        {
            return; // Already assigned
        }

        var assignment = new GuildMemberRole
        {
            GuildId = guildId,
            UserId = userId,
            RoleId = generalRole.Id,
            AssignedAt = DateTime.UtcNow
        };

        _context.GuildMemberRoles.Add(assignment);
        await _context.SaveChangesAsync();

        _logger.LogInformation("General role assigned to user {UserId} in guild {GuildId}", userId, guildId);
    }
}


