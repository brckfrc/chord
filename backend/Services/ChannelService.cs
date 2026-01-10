using AutoMapper;
using ChordAPI.Data;
using ChordAPI.Models.DTOs;
using ChordAPI.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace ChordAPI.Services;

public class ChannelService : IChannelService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly ILogger<ChannelService> _logger;
    private readonly IPermissionService _permissionService;
    private readonly IAuditLogService _auditLogService;

    public ChannelService(
        AppDbContext context,
        IMapper mapper,
        ILogger<ChannelService> logger,
        IPermissionService permissionService,
        IAuditLogService auditLogService)
    {
        _context = context;
        _mapper = mapper;
        _logger = logger;
        _permissionService = permissionService;
        _auditLogService = auditLogService;
    }

    public async Task<ChannelResponseDto> CreateChannelAsync(Guid guildId, Guid userId, CreateChannelDto dto)
    {
        // Check if guild exists
        var guild = await _context.Guilds.FirstOrDefaultAsync(g => g.Id == guildId);
        if (guild == null)
        {
            throw new KeyNotFoundException("Guild not found");
        }

        // Check if user has permission to manage channels
        await _permissionService.CheckPermissionAsync(guildId, userId, GuildPermission.ManageChannels,
            "You don't have permission to create channels");

        // Auto-calculate position: Always append to the end (scoped by type)
        var maxPosition = await _context.Channels
            .Where(c => c.GuildId == guildId && c.Type == dto.Type)
            .MaxAsync(c => (int?)c.Position);

        int position = (maxPosition ?? -1) + 1;

        _logger.LogDebug("Auto-assigned position {Position} for new {Type} channel in guild {GuildId}",
            position, dto.Type, guildId);

        var channel = new Channel
        {
            Id = Guid.NewGuid(),
            GuildId = guildId,
            Name = dto.Name,
            Type = dto.Type,
            Topic = dto.Topic,
            Position = position,
            CreatedAt = DateTime.UtcNow
        };

        _context.Channels.Add(channel);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Channel {ChannelId} created in guild {GuildId} by user {UserId} at position {Position}",
            channel.Id, guildId, userId, position);

        // Log audit event
        await _auditLogService.LogActionAsync(
            userId,
            AuditAction.ChannelCreated,
            "Channel",
            channel.Id,
            new { Name = channel.Name, Type = channel.Type.ToString(), Topic = channel.Topic },
            guildId);

        return _mapper.Map<ChannelResponseDto>(channel);
    }

    public async Task<IEnumerable<ChannelResponseDto>> GetGuildChannelsAsync(Guid guildId, Guid userId)
    {
        // Check if user is a member of the guild
        var isMember = await _context.GuildMembers
            .AnyAsync(gm => gm.GuildId == guildId && gm.UserId == userId);

        if (!isMember)
        {
            throw new UnauthorizedAccessException("You are not a member of this guild");
        }

        var channels = await _context.Channels
            .Where(c => c.GuildId == guildId)
            .OrderBy(c => c.Position)
            .ThenBy(c => c.CreatedAt)
            .ToListAsync();

        return _mapper.Map<IEnumerable<ChannelResponseDto>>(channels);
    }

    public async Task<ChannelResponseDto?> GetChannelByIdAsync(Guid channelId, Guid userId)
    {
        var channel = await _context.Channels
            .FirstOrDefaultAsync(c => c.Id == channelId);

        if (channel == null)
        {
            return null;
        }

        // Check if user is a member of the guild
        var isMember = await _context.GuildMembers
            .AnyAsync(gm => gm.GuildId == channel.GuildId && gm.UserId == userId);

        if (!isMember)
        {
            throw new UnauthorizedAccessException("You are not a member of this guild");
        }

        return _mapper.Map<ChannelResponseDto>(channel);
    }

    public async Task<ChannelResponseDto> UpdateChannelAsync(Guid channelId, Guid userId, UpdateChannelDto dto)
    {
        var channel = await _context.Channels
            .Include(c => c.Guild)
            .FirstOrDefaultAsync(c => c.Id == channelId);

        if (channel == null)
        {
            throw new KeyNotFoundException("Channel not found");
        }

        // Check if user has permission to manage channels
        await _permissionService.CheckPermissionAsync(channel.GuildId, userId, GuildPermission.ManageChannels,
            "You don't have permission to update channels");

        var oldPosition = channel.Position;
        var newPosition = dto.Position;

        // Position shifting logic (Type-aware reordering)
        if (oldPosition != newPosition)
        {
            // Get all other channels in the same guild with the same type
            var guildChannels = await _context.Channels
                .Where(c => c.GuildId == channel.GuildId && c.Id != channelId && c.Type == channel.Type)
                .ToListAsync();

            if (newPosition < oldPosition)
            {
                // Moving up (e.g., position 3 → 1)
                // Shift channels between newPosition and oldPosition down by 1
                foreach (var ch in guildChannels.Where(c => c.Position >= newPosition && c.Position < oldPosition))
                {
                    ch.Position++;
                }
                _logger.LogDebug("Shifted {Count} {Type} channels down (positions {NewPos}-{OldPos}) in guild {GuildId}",
                    guildChannels.Count(c => c.Position >= newPosition && c.Position <= oldPosition),
                    channel.Type, newPosition, oldPosition - 1, channel.GuildId);
            }
            else if (newPosition > oldPosition)
            {
                // Moving down (e.g., position 1 → 3)
                // Shift channels between oldPosition and newPosition up by 1
                foreach (var ch in guildChannels.Where(c => c.Position > oldPosition && c.Position <= newPosition))
                {
                    ch.Position--;
                }
                _logger.LogDebug("Shifted {Count} {Type} channels up (positions {OldPos}-{NewPos}) in guild {GuildId}",
                    guildChannels.Count(c => c.Position > oldPosition && c.Position <= newPosition),
                    channel.Type, oldPosition + 1, newPosition, channel.GuildId);
            }

            _logger.LogInformation("Channel {ChannelId} position changed from {OldPos} to {NewPos} in guild {GuildId}",
                channelId, oldPosition, newPosition, channel.GuildId);
        }

        channel.Name = dto.Name;
        channel.Topic = dto.Topic;
        channel.Position = newPosition;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Channel {ChannelId} updated by user {UserId}", channelId, userId);

        // Log audit event
        await _auditLogService.LogActionAsync(
            userId,
            AuditAction.ChannelUpdated,
            "Channel",
            channelId,
            new { Name = dto.Name, Topic = dto.Topic, Position = newPosition },
            channel.GuildId);

        return _mapper.Map<ChannelResponseDto>(channel);
    }

    public async Task DeleteChannelAsync(Guid channelId, Guid userId)
    {
        var channel = await _context.Channels
            .Include(c => c.Guild)
            .FirstOrDefaultAsync(c => c.Id == channelId);

        if (channel == null)
        {
            throw new KeyNotFoundException("Channel not found");
        }

        // Check if user has permission to manage channels
        await _permissionService.CheckPermissionAsync(channel.GuildId, userId, GuildPermission.ManageChannels,
            "You don't have permission to delete channels");

        var deletedPosition = channel.Position;
        var channelType = channel.Type;
        var guildId = channel.GuildId;

        _context.Channels.Remove(channel);

        // Position shifting logic: Shift all channels after the deleted one up by 1 (same type only)
        var channelsToShift = await _context.Channels
            .Where(c => c.GuildId == guildId && c.Position > deletedPosition && c.Type == channelType)
            .ToListAsync();

        foreach (var ch in channelsToShift)
        {
            ch.Position--;
        }

        if (channelsToShift.Any())
        {
            _logger.LogDebug("Shifted {Count} {Type} channels up after deleting channel at position {Position} in guild {GuildId}",
                channelsToShift.Count, channelType, deletedPosition, guildId);
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("Channel {ChannelId} ({Type}) deleted by user {UserId} from position {Position}",
            channelId, channelType, userId, deletedPosition);

        // Log audit event
        await _auditLogService.LogActionAsync(
            userId,
            AuditAction.ChannelDeleted,
            "Channel",
            channelId,
            null,
            guildId);
    }
}

