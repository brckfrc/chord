using AutoMapper;
using ChordAPI.Data;
using ChordAPI.Models.DTOs;
using Microsoft.EntityFrameworkCore;

namespace ChordAPI.Services;

public class MentionService : IMentionService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly ILogger<MentionService> _logger;

    public MentionService(AppDbContext context, IMapper mapper, ILogger<MentionService> logger)
    {
        _context = context;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<IEnumerable<MessageMentionDto>> GetUserMentionsAsync(Guid userId, bool unreadOnly = false)
    {
        var query = _context.MessageMentions
            .Where(mm => mm.MentionedUserId == userId)
            .Include(mm => mm.Message)
                .ThenInclude(m => m.Author)
            .Include(mm => mm.Message)
                .ThenInclude(m => m.Channel)
            .Include(mm => mm.MentionedUser)
            .AsQueryable();

        if (unreadOnly)
        {
            query = query.Where(mm => !mm.IsRead);
        }

        var mentions = await query
            .OrderByDescending(mm => mm.CreatedAt)
            .ToListAsync();

        return _mapper.Map<IEnumerable<MessageMentionDto>>(mentions);
    }

    public async Task<IEnumerable<MessageMentionDto>> GetMentionsByMessageIdAsync(Guid messageId)
    {
        var mentions = await _context.MessageMentions
            .Where(mm => mm.MessageId == messageId)
            .Include(mm => mm.Message)
                .ThenInclude(m => m.Author)
            .Include(mm => mm.Message)
                .ThenInclude(m => m.Channel)
            .Include(mm => mm.MentionedUser)
            .ToListAsync();

        return _mapper.Map<IEnumerable<MessageMentionDto>>(mentions);
    }

    public async Task MarkMentionAsReadAsync(Guid mentionId, Guid userId)
    {
        var mention = await _context.MessageMentions
            .FirstOrDefaultAsync(mm => mm.Id == mentionId && mm.MentionedUserId == userId);

        if (mention == null)
        {
            throw new KeyNotFoundException("Mention not found");
        }

        if (mention.IsRead)
        {
            return; // Already read
        }

        mention.IsRead = true;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Mention {MentionId} marked as read by user {UserId}", mentionId, userId);
    }

    public async Task<int> MarkAllMentionsAsReadAsync(Guid userId, Guid? guildId = null)
    {
        IQueryable<Models.Entities.MessageMention> query = _context.MessageMentions
            .Include(mm => mm.Message)
                .ThenInclude(m => m.Channel)
            .Where(mm => mm.MentionedUserId == userId && !mm.IsRead);

        // If guildId is provided, filter by channels in that guild
        if (guildId.HasValue)
        {
            query = query.Where(mm => mm.Message.Channel.GuildId == guildId.Value);
        }

        var unreadMentions = await query.ToListAsync();
        var count = unreadMentions.Count;

        if (count > 0)
        {
            foreach (var mention in unreadMentions)
            {
                mention.IsRead = true;
            }
            await _context.SaveChangesAsync();
            _logger.LogInformation("Marked {Count} mentions as read for user {UserId} (Guild: {GuildId})", count, userId, guildId);
        }

        return count;
    }

    public async Task<int> GetUnreadMentionCountAsync(Guid userId)
    {
        return await _context.MessageMentions
            .CountAsync(mm => mm.MentionedUserId == userId && !mm.IsRead);
    }
}

