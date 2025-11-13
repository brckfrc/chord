using AutoMapper;
using ChordAPI.Data;
using ChordAPI.Models.DTOs;
using ChordAPI.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace ChordAPI.Services;

public class ReactionService : IReactionService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly ILogger<ReactionService> _logger;

    public ReactionService(AppDbContext context, IMapper mapper, ILogger<ReactionService> logger)
    {
        _context = context;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<ReactionResponseDto> AddReactionAsync(Guid messageId, Guid userId, AddReactionDto dto)
    {
        // Check if message exists and user has access
        var message = await _context.Messages
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

        // Check if reaction already exists
        var existingReaction = await _context.MessageReactions
            .FirstOrDefaultAsync(r => r.MessageId == messageId && r.UserId == userId && r.Emoji == dto.Emoji);

        if (existingReaction != null)
        {
            // Return existing reaction (idempotent)
            var user = await _context.Users.FindAsync(userId);
            return new ReactionResponseDto
            {
                Id = existingReaction.Id,
                MessageId = messageId,
                UserId = userId,
                Username = user?.Username ?? "Unknown",
                DisplayName = user?.DisplayName,
                Emoji = dto.Emoji,
                CreatedAt = existingReaction.CreatedAt
            };
        }

        // Create new reaction
        var reaction = new MessageReaction
        {
            Id = Guid.NewGuid(),
            MessageId = messageId,
            UserId = userId,
            Emoji = dto.Emoji,
            CreatedAt = DateTime.UtcNow
        };

        _context.MessageReactions.Add(reaction);
        await _context.SaveChangesAsync();

        _logger.LogInformation("User {UserId} added reaction {Emoji} to message {MessageId}",
            userId, dto.Emoji, messageId);

        // Load user for response
        var reactionUser = await _context.Users.FindAsync(userId);
        return new ReactionResponseDto
        {
            Id = reaction.Id,
            MessageId = messageId,
            UserId = userId,
            Username = reactionUser?.Username ?? "Unknown",
            DisplayName = reactionUser?.DisplayName,
            Emoji = dto.Emoji,
            CreatedAt = reaction.CreatedAt
        };
    }

    public async Task RemoveReactionAsync(Guid messageId, Guid userId, string emoji)
    {
        var reaction = await _context.MessageReactions
            .Include(r => r.Message)
                .ThenInclude(m => m.Channel)
                    .ThenInclude(c => c.Guild)
                        .ThenInclude(g => g.Members)
            .FirstOrDefaultAsync(r => r.MessageId == messageId && r.UserId == userId && r.Emoji == emoji);

        if (reaction == null)
        {
            throw new KeyNotFoundException("Reaction not found");
        }

        // Check if user is a member of the guild
        var isMember = reaction.Message.Channel.Guild.Members.Any(m => m.UserId == userId);
        if (!isMember)
        {
            throw new UnauthorizedAccessException("You are not a member of this guild");
        }

        _context.MessageReactions.Remove(reaction);
        await _context.SaveChangesAsync();

        _logger.LogInformation("User {UserId} removed reaction {Emoji} from message {MessageId}",
            userId, emoji, messageId);
    }

    public async Task<List<ReactionsGroupedDto>> GetMessageReactionsAsync(Guid messageId, Guid userId)
    {
        // Check if message exists and user has access
        var message = await _context.Messages
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

        // Get all reactions for this message, grouped by emoji
        var reactions = await _context.MessageReactions
            .Include(r => r.User)
            .Where(r => r.MessageId == messageId)
            .ToListAsync();

        var grouped = reactions
            .GroupBy(r => r.Emoji)
            .Select(g => new ReactionsGroupedDto
            {
                Emoji = g.Key,
                Count = g.Count(),
                Users = g.Select(r => new ReactionUserDto
                {
                    UserId = r.UserId,
                    Username = r.User.Username,
                    DisplayName = r.User.DisplayName
                }).ToList()
            })
            .OrderBy(g => g.Emoji)
            .ToList();

        return grouped;
    }
}

