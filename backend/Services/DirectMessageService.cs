using AutoMapper;
using ChordAPI.Data;
using ChordAPI.Models.DTOs;
using ChordAPI.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace ChordAPI.Services;

public class DirectMessageService : IDirectMessageService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly ILogger<DirectMessageService> _logger;
    private readonly IFriendshipService _friendshipService;

    public DirectMessageService(
        AppDbContext context,
        IMapper mapper,
        ILogger<DirectMessageService> logger,
        IFriendshipService friendshipService)
    {
        _context = context;
        _mapper = mapper;
        _logger = logger;
        _friendshipService = friendshipService;
    }

    public async Task<List<DirectMessageDto>> GetMessagesAsync(Guid userId, Guid channelId, int page = 1, int pageSize = 50)
    {
        // Validate channel exists and user has access
        var channel = await _context.DirectMessageChannels
            .FirstOrDefaultAsync(dmc => dmc.Id == channelId);

        if (channel == null)
        {
            throw new KeyNotFoundException("DM channel not found");
        }

        if (channel.User1Id != userId && channel.User2Id != userId)
        {
            throw new UnauthorizedAccessException("You do not have access to this DM channel");
        }

        // Get messages with pagination
        var messages = await _context.DirectMessages
            .Include(dm => dm.Sender)
            .Where(dm => dm.ChannelId == channelId && !dm.IsDeleted)
            .OrderByDescending(dm => dm.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        // Reverse to get chronological order
        messages.Reverse();

        return messages.Select(dm => new DirectMessageDto
        {
            Id = dm.Id,
            ChannelId = dm.ChannelId,
            SenderId = dm.SenderId,
            Content = dm.Content,
            CreatedAt = dm.CreatedAt,
            EditedAt = dm.EditedAt,
            IsDeleted = dm.IsDeleted,
            Sender = _mapper.Map<UserDto>(dm.Sender)
        }).ToList();
    }

    public async Task<DirectMessageDto> SendMessageAsync(Guid userId, Guid channelId, string content)
    {
        // Validate channel exists and user has access
        var channel = await _context.DirectMessageChannels
            .FirstOrDefaultAsync(dmc => dmc.Id == channelId);

        if (channel == null)
        {
            throw new KeyNotFoundException("DM channel not found");
        }

        if (channel.User1Id != userId && channel.User2Id != userId)
        {
            throw new UnauthorizedAccessException("You do not have access to this DM channel");
        }

        // Get the other user's ID
        var otherUserId = channel.User1Id == userId ? channel.User2Id : channel.User1Id;

        // Check if sender is blocked by recipient or vice versa
        var isBlocked = await _friendshipService.IsBlockedAsync(userId, otherUserId);
        if (isBlocked)
        {
            throw new UnauthorizedAccessException("Cannot send message to this user");
        }

        // Validate content
        if (string.IsNullOrWhiteSpace(content) || content.Length > 2000)
        {
            throw new ArgumentException("Message content must be between 1 and 2000 characters");
        }

        // Create message
        var message = new DirectMessage
        {
            Id = Guid.NewGuid(),
            ChannelId = channelId,
            SenderId = userId,
            Content = content.Trim(),
            CreatedAt = DateTime.UtcNow
        };

        _context.DirectMessages.Add(message);

        // Update channel's LastMessageAt
        channel.LastMessageAt = message.CreatedAt;

        await _context.SaveChangesAsync();

        // Load sender data
        var messageWithSender = await _context.DirectMessages
            .Include(dm => dm.Sender)
            .FirstAsync(dm => dm.Id == message.Id);

        return new DirectMessageDto
        {
            Id = messageWithSender.Id,
            ChannelId = messageWithSender.ChannelId,
            SenderId = messageWithSender.SenderId,
            Content = messageWithSender.Content,
            CreatedAt = messageWithSender.CreatedAt,
            EditedAt = messageWithSender.EditedAt,
            IsDeleted = messageWithSender.IsDeleted,
            Sender = _mapper.Map<UserDto>(messageWithSender.Sender)
        };
    }

    public async Task<DirectMessageDto> EditMessageAsync(Guid userId, Guid messageId, string content)
    {
        var message = await _context.DirectMessages
            .Include(dm => dm.Sender)
            .Include(dm => dm.Channel)
            .FirstOrDefaultAsync(dm => dm.Id == messageId);

        if (message == null || message.IsDeleted)
        {
            throw new KeyNotFoundException("Message not found");
        }

        // Only sender can edit
        if (message.SenderId != userId)
        {
            throw new UnauthorizedAccessException("You can only edit your own messages");
        }

        // Validate user still has access to channel
        if (message.Channel.User1Id != userId && message.Channel.User2Id != userId)
        {
            throw new UnauthorizedAccessException("You do not have access to this DM channel");
        }

        // Validate content
        if (string.IsNullOrWhiteSpace(content) || content.Length > 2000)
        {
            throw new ArgumentException("Message content must be between 1 and 2000 characters");
        }

        message.Content = content.Trim();
        message.EditedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return new DirectMessageDto
        {
            Id = message.Id,
            ChannelId = message.ChannelId,
            SenderId = message.SenderId,
            Content = message.Content,
            CreatedAt = message.CreatedAt,
            EditedAt = message.EditedAt,
            IsDeleted = message.IsDeleted,
            Sender = _mapper.Map<UserDto>(message.Sender)
        };
    }

    public async Task DeleteMessageAsync(Guid userId, Guid messageId)
    {
        var message = await _context.DirectMessages
            .Include(dm => dm.Channel)
            .FirstOrDefaultAsync(dm => dm.Id == messageId);

        if (message == null || message.IsDeleted)
        {
            throw new KeyNotFoundException("Message not found");
        }

        // Only sender can delete
        if (message.SenderId != userId)
        {
            throw new UnauthorizedAccessException("You can only delete your own messages");
        }

        // Validate user still has access to channel
        if (message.Channel.User1Id != userId && message.Channel.User2Id != userId)
        {
            throw new UnauthorizedAccessException("You do not have access to this DM channel");
        }

        // Soft delete
        message.IsDeleted = true;

        await _context.SaveChangesAsync();
    }
}

