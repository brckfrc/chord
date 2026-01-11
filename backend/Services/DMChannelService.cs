using AutoMapper;
using ChordAPI.Data;
using ChordAPI.Models.DTOs;
using ChordAPI.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace ChordAPI.Services;

public class DMChannelService : IDMChannelService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly IDMReadStateService _dmReadStateService;
    private readonly ILogger<DMChannelService> _logger;

    public DMChannelService(
        AppDbContext context,
        IMapper mapper,
        IDMReadStateService dmReadStateService,
        ILogger<DMChannelService> logger)
    {
        _context = context;
        _mapper = mapper;
        _dmReadStateService = dmReadStateService;
        _logger = logger;
    }

    public async Task<DirectMessageChannelDto> GetOrCreateDMAsync(Guid userId, Guid otherUserId)
    {
        if (userId == otherUserId)
        {
            throw new InvalidOperationException("Cannot create DM with yourself");
        }

        // Order the user IDs so User1Id < User2Id (ensures uniqueness)
        var user1Id = userId < otherUserId ? userId : otherUserId;
        var user2Id = userId < otherUserId ? otherUserId : userId;

        // Check if DM channel already exists
        var existingChannel = await _context.DirectMessageChannels
            .Include(dmc => dmc.User1)
            .Include(dmc => dmc.User2)
            .Include(dmc => dmc.Messages.OrderByDescending(m => m.CreatedAt).Take(1))
            .ThenInclude(m => m.Sender)
            .FirstOrDefaultAsync(dmc => dmc.User1Id == user1Id && dmc.User2Id == user2Id);

        if (existingChannel != null)
        {
            return await MapToDtoAsync(existingChannel, userId);
        }

        // Validate both users exist
        var user1Exists = await _context.Users.AnyAsync(u => u.Id == user1Id);
        var user2Exists = await _context.Users.AnyAsync(u => u.Id == user2Id);

        if (!user1Exists || !user2Exists)
        {
            throw new KeyNotFoundException("One or both users not found");
        }

        // Create new DM channel
        var newChannel = new DirectMessageChannel
        {
            Id = Guid.NewGuid(),
            User1Id = user1Id,
            User2Id = user2Id,
            CreatedAt = DateTime.UtcNow
        };

        _context.DirectMessageChannels.Add(newChannel);
        await _context.SaveChangesAsync();

        // Load with user data
        var channelWithUsers = await _context.DirectMessageChannels
            .Include(dmc => dmc.User1)
            .Include(dmc => dmc.User2)
            .FirstAsync(dmc => dmc.Id == newChannel.Id);

        return await MapToDtoAsync(channelWithUsers, userId);
    }

    public async Task<List<DirectMessageChannelDto>> GetUserDMsAsync(Guid userId)
    {
        var channels = await _context.DirectMessageChannels
            .Include(dmc => dmc.User1)
            .Include(dmc => dmc.User2)
            .Include(dmc => dmc.Messages.OrderByDescending(m => m.CreatedAt).Take(1))
            .ThenInclude(m => m.Sender)
            .Where(dmc => dmc.User1Id == userId || dmc.User2Id == userId)
            .OrderByDescending(dmc => dmc.LastMessageAt ?? dmc.CreatedAt)
            .ToListAsync();

        var result = new List<DirectMessageChannelDto>();
        foreach (var channel in channels)
        {
            result.Add(await MapToDtoAsync(channel, userId));
        }

        return result;
    }

    public async Task<DirectMessageChannelDto> GetDMByIdAsync(Guid userId, Guid dmId)
    {
        var channel = await _context.DirectMessageChannels
            .Include(dmc => dmc.User1)
            .Include(dmc => dmc.User2)
            .Include(dmc => dmc.Messages.OrderByDescending(m => m.CreatedAt).Take(1))
            .ThenInclude(m => m.Sender)
            .FirstOrDefaultAsync(dmc => dmc.Id == dmId);

        if (channel == null)
        {
            throw new KeyNotFoundException("DM channel not found");
        }

        // Validate user has access to this DM
        if (channel.User1Id != userId && channel.User2Id != userId)
        {
            throw new UnauthorizedAccessException("You do not have access to this DM channel");
        }

        return await MapToDtoAsync(channel, userId);
    }

    /// <summary>
    /// Maps a DirectMessageChannel to DTO, with the "other user" being the user who is not the current user
    /// Also calculates unread count using read state tracking
    /// </summary>
    private async Task<DirectMessageChannelDto> MapToDtoAsync(DirectMessageChannel channel, Guid currentUserId)
    {
        var otherUser = channel.User1Id == currentUserId ? channel.User2 : channel.User1;

        // Calculate unread count using read state tracking
        int unreadCount = 0;
        try
        {
            var unreadInfo = await _dmReadStateService.GetDMUnreadCountAsync(channel.Id, currentUserId);
            unreadCount = unreadInfo.UnreadCount;
        }
        catch (Exception ex)
        {
            // If read state service fails, fall back to 0 (shouldn't happen, but handle gracefully)
            _logger.LogWarning(ex, "Failed to get unread count for DM channel {ChannelId}, defaulting to 0", channel.Id);
            unreadCount = 0;
        }

        DirectMessageDto? lastMessageDto = null;
        if (channel.Messages.Any())
        {
            var lastMessage = channel.Messages.First();
            if (!lastMessage.IsDeleted)
            {
                lastMessageDto = new DirectMessageDto
                {
                    Id = lastMessage.Id,
                    ChannelId = lastMessage.ChannelId,
                    SenderId = lastMessage.SenderId,
                    Content = lastMessage.Content,
                    CreatedAt = lastMessage.CreatedAt,
                    EditedAt = lastMessage.EditedAt,
                    IsDeleted = lastMessage.IsDeleted,
                    Sender = _mapper.Map<UserDto>(lastMessage.Sender)
                };
            }
        }

        return new DirectMessageChannelDto
        {
            Id = channel.Id,
            CreatedAt = channel.CreatedAt,
            LastMessageAt = channel.LastMessageAt,
            OtherUser = _mapper.Map<UserDto>(otherUser),
            LastMessage = lastMessageDto,
            UnreadCount = unreadCount
        };
    }
}

