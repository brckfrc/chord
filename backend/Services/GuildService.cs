using AutoMapper;
using ChordAPI.Data;
using ChordAPI.Models.DTOs;
using ChordAPI.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace ChordAPI.Services;

public class GuildService : IGuildService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly ILogger<GuildService> _logger;
    private readonly IChannelService _channelService;
    private readonly IRoleService _roleService;
    private readonly IAuditLogService _auditLogService;

    public GuildService(
        AppDbContext context, 
        IMapper mapper, 
        ILogger<GuildService> logger,
        IChannelService channelService,
        IRoleService roleService,
        IAuditLogService auditLogService)
    {
        _context = context;
        _mapper = mapper;
        _logger = logger;
        _channelService = channelService;
        _roleService = roleService;
        _auditLogService = auditLogService;
    }

    public async Task<GuildResponseDto> CreateGuildAsync(Guid userId, CreateGuildDto dto)
    {
        var guild = new Guild
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            Description = dto.Description,
            IconUrl = dto.IconUrl,
            OwnerId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Guilds.Add(guild);

        // Automatically add the owner as a member with "Owner" role
        var ownerMember = new GuildMember
        {
            GuildId = guild.Id,
            UserId = userId,
            JoinedAt = DateTime.UtcNow
        };

        _context.GuildMembers.Add(ownerMember);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Guild {GuildId} created by user {UserId}", guild.Id, userId);

        // Log audit event
        await _auditLogService.LogActionAsync(
            userId,
            AuditAction.GuildCreated,
            "Guild",
            guild.Id,
            new { Name = guild.Name, Description = guild.Description },
            guild.Id);

        // Create default roles and assign to owner
        try
        {
            await _roleService.CreateDefaultRolesAsync(guild.Id, userId);
            _logger.LogInformation("Default roles created for guild {GuildId}", guild.Id);
        }
        catch (Exception ex)
        {
            // Log but don't fail guild creation if role creation fails
            _logger.LogWarning(ex, "Failed to create default roles for guild {GuildId}", guild.Id);
        }

        // Automatically create default channels
        try
        {
            // Create default text channel
            await _channelService.CreateChannelAsync(guild.Id, userId, new CreateChannelDto
            {
                Name = "general",
                Type = ChannelType.Text,
                Topic = null
            });

            // Create default voice channel
            await _channelService.CreateChannelAsync(guild.Id, userId, new CreateChannelDto
            {
                Name = "Lobby",
                Type = ChannelType.Voice,
                Topic = null
            });

            _logger.LogInformation("Default channels created for guild {GuildId}", guild.Id);
        }
        catch (Exception ex)
        {
            // Log but don't fail guild creation if channel creation fails
            _logger.LogWarning(ex, "Failed to create default channels for guild {GuildId}", guild.Id);
        }

        // Reload with navigation properties
        var createdGuild = await _context.Guilds
            .Include(g => g.Owner)
            .Include(g => g.Members)
            .Include(g => g.Channels)
            .FirstOrDefaultAsync(g => g.Id == guild.Id);

        return _mapper.Map<GuildResponseDto>(createdGuild);
    }

    public async Task<IEnumerable<GuildResponseDto>> GetUserGuildsAsync(Guid userId)
    {
        var guilds = await _context.GuildMembers
            .Where(gm => gm.UserId == userId)
            .Include(gm => gm.Guild)
                .ThenInclude(g => g.Owner)
            .Include(gm => gm.Guild)
                .ThenInclude(g => g.Members)
            .Include(gm => gm.Guild)
                .ThenInclude(g => g.Channels)
            .OrderByDescending(gm => gm.JoinedAt)
            .Select(gm => gm.Guild)
            .Distinct()
            .ToListAsync();

        return _mapper.Map<IEnumerable<GuildResponseDto>>(guilds);
    }

    public async Task<GuildResponseDto?> GetGuildByIdAsync(Guid guildId, Guid userId)
    {
        // Check if user is a member
        var isMember = await _context.GuildMembers
            .AnyAsync(gm => gm.GuildId == guildId && gm.UserId == userId);

        if (!isMember)
        {
            throw new UnauthorizedAccessException("You are not a member of this guild");
        }

        var guild = await _context.Guilds
            .Include(g => g.Owner)
            .Include(g => g.Members)
            .Include(g => g.Channels)
            .FirstOrDefaultAsync(g => g.Id == guildId);

        return guild == null ? null : _mapper.Map<GuildResponseDto>(guild);
    }

    public async Task<GuildResponseDto> UpdateGuildAsync(Guid guildId, Guid userId, UpdateGuildDto dto)
    {
        var guild = await _context.Guilds
            .Include(g => g.Owner)
            .Include(g => g.Members)
            .Include(g => g.Channels)
            .FirstOrDefaultAsync(g => g.Id == guildId);

        if (guild == null)
        {
            throw new KeyNotFoundException("Guild not found");
        }

        // Check if user has permission to manage guild
        var hasPermission = await _context.GuildMemberRoles
            .Where(gmr => gmr.GuildId == guildId && gmr.UserId == userId)
            .Include(gmr => gmr.Role)
            .AnyAsync(gmr => (gmr.Role.Permissions & (long)GuildPermission.ManageGuild) != 0 ||
                             (gmr.Role.Permissions & (long)GuildPermission.Administrator) != 0);

        if (guild.OwnerId != userId && !hasPermission)
        {
            throw new UnauthorizedAccessException("You don't have permission to update this guild");
        }

        guild.Name = dto.Name;
        guild.Description = dto.Description;
        guild.IconUrl = dto.IconUrl;
        guild.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Guild {GuildId} updated by user {UserId}", guildId, userId);

        // Log audit event
        await _auditLogService.LogActionAsync(
            userId,
            AuditAction.GuildUpdated,
            "Guild",
            guildId,
            new { Name = dto.Name, Description = dto.Description, IconUrl = dto.IconUrl },
            guildId);

        return _mapper.Map<GuildResponseDto>(guild);
    }

    public async Task DeleteGuildAsync(Guid guildId, Guid userId)
    {
        var guild = await _context.Guilds
            .FirstOrDefaultAsync(g => g.Id == guildId);

        if (guild == null)
        {
            throw new KeyNotFoundException("Guild not found");
        }

        if (guild.OwnerId != userId)
        {
            throw new UnauthorizedAccessException("Only the guild owner can delete the guild");
        }

        _context.Guilds.Remove(guild);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Guild {GuildId} deleted by user {UserId}", guildId, userId);

        // Log audit event
        await _auditLogService.LogActionAsync(
            userId,
            AuditAction.GuildDeleted,
            "Guild",
            guildId,
            null,
            guildId);
    }

    public async Task<GuildMemberDto> AddMemberAsync(Guid guildId, Guid ownerId, Guid userIdToAdd)
    {
        var guild = await _context.Guilds.FirstOrDefaultAsync(g => g.Id == guildId);

        if (guild == null)
        {
            throw new KeyNotFoundException("Guild not found");
        }

        if (guild.OwnerId != ownerId)
        {
            throw new UnauthorizedAccessException("Only the guild owner can add members");
        }

        var existingMember = await _context.GuildMembers
            .FirstOrDefaultAsync(gm => gm.GuildId == guildId && gm.UserId == userIdToAdd);

        if (existingMember != null)
        {
            throw new InvalidOperationException("User is already a member of this guild");
        }

        var newMember = new GuildMember
        {
            GuildId = guildId,
            UserId = userIdToAdd,
            JoinedAt = DateTime.UtcNow
        };

        _context.GuildMembers.Add(newMember);
        await _context.SaveChangesAsync();

        _logger.LogInformation("User {UserId} added to guild {GuildId}", userIdToAdd, guildId);

        // Assign general role to new member
        try
        {
            await _roleService.AssignGeneralRoleAsync(guildId, userIdToAdd);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to assign general role to user {UserId} in guild {GuildId}", userIdToAdd, guildId);
        }

        // Reload with navigation properties
        var memberWithUser = await _context.GuildMembers
            .Include(gm => gm.User)
            .FirstOrDefaultAsync(gm => gm.GuildId == guildId && gm.UserId == userIdToAdd);

        return _mapper.Map<GuildMemberDto>(memberWithUser);
    }

    public async Task RemoveMemberAsync(Guid guildId, Guid requesterId, Guid userIdToRemove)
    {
        var guild = await _context.Guilds.FirstOrDefaultAsync(g => g.Id == guildId);

        if (guild == null)
        {
            throw new KeyNotFoundException("Guild not found");
        }

        // Owner can remove anyone, or users can remove themselves
        if (guild.OwnerId != requesterId && requesterId != userIdToRemove)
        {
            throw new UnauthorizedAccessException("You don't have permission to remove this member");
        }

        // Prevent owner from removing themselves
        if (guild.OwnerId == userIdToRemove)
        {
            throw new InvalidOperationException("Guild owner cannot leave the guild. Delete the guild instead.");
        }

        var member = await _context.GuildMembers
            .FirstOrDefaultAsync(gm => gm.GuildId == guildId && gm.UserId == userIdToRemove);

        if (member == null)
        {
            throw new KeyNotFoundException("Member not found in this guild");
        }

        _context.GuildMembers.Remove(member);
        await _context.SaveChangesAsync();

        _logger.LogInformation("User {UserId} removed from guild {GuildId}", userIdToRemove, guildId);

        // Log audit event
        await _auditLogService.LogActionAsync(
            requesterId,
            AuditAction.MemberLeft,
            "GuildMember",
            userIdToRemove,
            null,
            guildId);
    }

    public async Task<IEnumerable<GuildMemberDto>> GetGuildMembersAsync(Guid guildId, Guid userId)
    {
        // Check if user is a member
        var isMember = await _context.GuildMembers
            .AnyAsync(gm => gm.GuildId == guildId && gm.UserId == userId);

        if (!isMember)
        {
            throw new UnauthorizedAccessException("You are not a member of this guild");
        }

        var members = await _context.GuildMembers
            .Where(gm => gm.GuildId == guildId)
            .Include(gm => gm.User)
            .ToListAsync();

        return _mapper.Map<IEnumerable<GuildMemberDto>>(members);
    }
}


