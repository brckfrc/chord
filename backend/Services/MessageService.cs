using AutoMapper;
using ChordAPI.Data;
using ChordAPI.Models.DTOs;
using ChordAPI.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace ChordAPI.Services;

public class MessageService : IMessageService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly ILogger<MessageService> _logger;

    public MessageService(AppDbContext context, IMapper mapper, ILogger<MessageService> logger)
    {
        _context = context;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<MessageResponseDto> CreateMessageAsync(Guid channelId, Guid userId, CreateMessageDto dto)
    {
        // Check if channel exists
        var channel = await _context.Channels
            .Include(c => c.Guild)
            .ThenInclude(g => g.Members)
            .FirstOrDefaultAsync(c => c.Id == channelId);

        if (channel == null)
        {
            throw new KeyNotFoundException("Channel not found");
        }

        // Check if user is a member of the guild
        var isMember = channel.Guild.Members.Any(m => m.UserId == userId);
        if (!isMember)
        {
            throw new UnauthorizedAccessException("You are not a member of this guild");
        }

        var message = new Message
        {
            Id = Guid.NewGuid(),
            ChannelId = channelId,
            AuthorId = userId,
            Content = dto.Content,
            Attachments = dto.Attachments,
            CreatedAt = DateTime.UtcNow,
            IsEdited = false
        };

        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Message {MessageId} created in channel {ChannelId} by user {UserId}",
            message.Id, channelId, userId);

        // Load author information
        var messageWithAuthor = await _context.Messages
            .Include(m => m.Author)
            .FirstAsync(m => m.Id == message.Id);

        return _mapper.Map<MessageResponseDto>(messageWithAuthor);
    }

    public async Task<PaginatedMessagesDto> GetChannelMessagesAsync(Guid channelId, Guid userId, int page = 1, int pageSize = 50)
    {
        // Validate page and pageSize
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 100) pageSize = 50;

        // Check if channel exists
        var channel = await _context.Channels
            .Include(c => c.Guild)
            .ThenInclude(g => g.Members)
            .FirstOrDefaultAsync(c => c.Id == channelId);

        if (channel == null)
        {
            throw new KeyNotFoundException("Channel not found");
        }

        // Check if user is a member of the guild
        var isMember = channel.Guild.Members.Any(m => m.UserId == userId);
        if (!isMember)
        {
            throw new UnauthorizedAccessException("You are not a member of this guild");
        }

        // Get total count (excluding soft deleted messages)
        var totalCount = await _context.Messages
            .Where(m => m.ChannelId == channelId && m.DeletedAt == null)
            .CountAsync();

        // Get paginated messages (ordered by CreatedAt descending - newest first)
        var messages = await _context.Messages
            .Include(m => m.Author)
            .Where(m => m.ChannelId == channelId && m.DeletedAt == null)
            .OrderByDescending(m => m.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var messageDtos = _mapper.Map<List<MessageResponseDto>>(messages);

        return new PaginatedMessagesDto
        {
            Messages = messageDtos,
            TotalCount = totalCount,
            PageSize = pageSize,
            CurrentPage = page,
            HasMore = (page * pageSize) < totalCount
        };
    }

    public async Task<MessageResponseDto> GetMessageByIdAsync(Guid messageId, Guid userId)
    {
        var message = await _context.Messages
            .Include(m => m.Author)
            .Include(m => m.Channel)
            .ThenInclude(c => c.Guild)
            .ThenInclude(g => g.Members)
            .FirstOrDefaultAsync(m => m.Id == messageId && m.DeletedAt == null);

        if (message == null)
        {
            throw new KeyNotFoundException("Message not found");
        }

        // Check if user is a member of the guild
        var isMember = message.Channel.Guild.Members.Any(m => m.UserId == userId);
        if (!isMember)
        {
            throw new UnauthorizedAccessException("You are not a member of this guild");
        }

        return _mapper.Map<MessageResponseDto>(message);
    }

    public async Task<MessageResponseDto> UpdateMessageAsync(Guid messageId, Guid userId, UpdateMessageDto dto)
    {
        var message = await _context.Messages
            .Include(m => m.Author)
            .FirstOrDefaultAsync(m => m.Id == messageId && m.DeletedAt == null);

        if (message == null)
        {
            throw new KeyNotFoundException("Message not found");
        }

        // Check if user is the author
        if (message.AuthorId != userId)
        {
            throw new UnauthorizedAccessException("Only the message author can edit this message");
        }

        message.Content = dto.Content;
        message.UpdatedAt = DateTime.UtcNow;
        message.IsEdited = true;

        await _context.SaveChangesAsync();

        _logger.LogInformation("Message {MessageId} updated by user {UserId}", messageId, userId);

        return _mapper.Map<MessageResponseDto>(message);
    }

    public async Task DeleteMessageAsync(Guid messageId, Guid userId)
    {
        var message = await _context.Messages
            .Include(m => m.Channel)
            .ThenInclude(c => c.Guild)
            .FirstOrDefaultAsync(m => m.Id == messageId && m.DeletedAt == null);

        if (message == null)
        {
            throw new KeyNotFoundException("Message not found");
        }

        // Check if user is the author or guild owner
        var isAuthor = message.AuthorId == userId;
        var isGuildOwner = message.Channel.Guild.OwnerId == userId;

        if (!isAuthor && !isGuildOwner)
        {
            throw new UnauthorizedAccessException("Only the message author or guild owner can delete this message");
        }

        // Soft delete
        message.DeletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Message {MessageId} deleted by user {UserId}", messageId, userId);
    }
}

