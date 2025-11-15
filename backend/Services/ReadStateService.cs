using ChordAPI.Data;
using ChordAPI.Models.DTOs;
using ChordAPI.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace ChordAPI.Services;

public class ReadStateService : IReadStateService
{
    private readonly AppDbContext _context;
    private readonly ILogger<ReadStateService> _logger;

    public ReadStateService(AppDbContext context, ILogger<ReadStateService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task MarkChannelAsReadAsync(Guid channelId, Guid userId, Guid? messageId = null)
    {
        // Check if channel exists and user has access
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

        // If messageId is provided, validate it exists in the channel
        if (messageId.HasValue)
        {
            var message = await _context.Messages
                .FirstOrDefaultAsync(m => m.Id == messageId.Value && m.ChannelId == channelId && m.DeletedAt == null);

            if (message == null)
            {
                throw new KeyNotFoundException("Message not found");
            }
        }
        else
        {
            // If no messageId provided, get the latest message in the channel
            var latestMessage = await _context.Messages
                .Where(m => m.ChannelId == channelId && m.DeletedAt == null)
                .OrderByDescending(m => m.CreatedAt)
                .FirstOrDefaultAsync();

            if (latestMessage != null)
            {
                messageId = latestMessage.Id;
            }
        }

        // Get or create read state
        var readState = await _context.ChannelReadStates
            .FirstOrDefaultAsync(rs => rs.UserId == userId && rs.ChannelId == channelId);

        if (readState == null)
        {
            readState = new ChannelReadState
            {
                UserId = userId,
                ChannelId = channelId,
                LastReadMessageId = messageId,
                LastReadAt = DateTime.UtcNow
            };
            _context.ChannelReadStates.Add(readState);
        }
        else
        {
            readState.LastReadMessageId = messageId;
            readState.LastReadAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("User {UserId} marked channel {ChannelId} as read (message: {MessageId})",
            userId, channelId, messageId);
    }

    public async Task<UnreadCountDto> GetUnreadCountAsync(Guid channelId, Guid userId)
    {
        // Check if channel exists and user has access
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

        // Get read state with last read message
        var readState = await _context.ChannelReadStates
            .Include(rs => rs.LastReadMessage)
            .FirstOrDefaultAsync(rs => rs.UserId == userId && rs.ChannelId == channelId);

        DateTime? lastReadMessageCreatedAt = null;

        // If LastReadMessageId exists, use that message's CreatedAt time
        if (readState?.LastReadMessageId != null)
        {
            if (readState.LastReadMessage != null)
            {
                lastReadMessageCreatedAt = readState.LastReadMessage.CreatedAt;
            }
            else
            {
                // Navigation property not loaded, fetch the message
                var lastReadMessage = await _context.Messages
                    .FirstOrDefaultAsync(m => m.Id == readState.LastReadMessageId.Value);
                lastReadMessageCreatedAt = lastReadMessage?.CreatedAt;
            }
        }

        // Count unread messages (messages created after last read message, or all if never read)
        int unreadCount;
        if (lastReadMessageCreatedAt.HasValue)
        {
            // Count messages created after the last read message
            // Limit to 100 for performance (99+ will show as 99+)
            var unreadMessagesQuery = _context.Messages
                .Where(m => m.ChannelId == channelId 
                    && m.DeletedAt == null 
                    && m.CreatedAt > lastReadMessageCreatedAt.Value);

            var count = await unreadMessagesQuery.CountAsync();
            unreadCount = count > 99 ? 99 : count; // Cap at 99 for performance
        }
        else if (readState?.LastReadAt != null)
        {
            // Fallback: Use LastReadAt if LastReadMessageId is not available
            var unreadMessagesQuery = _context.Messages
                .Where(m => m.ChannelId == channelId 
                    && m.DeletedAt == null 
                    && m.CreatedAt > readState.LastReadAt);

            var count = await unreadMessagesQuery.CountAsync();
            unreadCount = count > 99 ? 99 : count; // Cap at 99 for performance
        }
        else
        {
            // Never read - count all non-deleted messages (capped at 99)
            var totalCount = await _context.Messages
                .Where(m => m.ChannelId == channelId && m.DeletedAt == null)
                .CountAsync();
            unreadCount = totalCount > 99 ? 99 : totalCount;
        }

        return new UnreadCountDto
        {
            ChannelId = channelId,
            UnreadCount = unreadCount,
            LastReadMessageId = readState?.LastReadMessageId
        };
    }

    public async Task<UnreadSummaryDto> GetUnreadSummaryAsync(Guid userId)
    {
        // Get all channels the user has access to (via guild membership)
        var userGuilds = await _context.GuildMembers
            .Where(gm => gm.UserId == userId)
            .Select(gm => gm.GuildId)
            .ToListAsync();

        var accessibleChannels = await _context.Channels
            .Where(c => userGuilds.Contains(c.GuildId))
            .Select(c => c.Id)
            .ToListAsync();

        // Get all read states for this user with last read messages
        var readStates = await _context.ChannelReadStates
            .Include(rs => rs.LastReadMessage)
            .Where(rs => rs.UserId == userId && accessibleChannels.Contains(rs.ChannelId))
            .ToDictionaryAsync(rs => rs.ChannelId);

        var unreadChannels = new List<UnreadCountDto>();

        foreach (var channelId in accessibleChannels)
        {
            var readState = readStates.GetValueOrDefault(channelId);
            DateTime? lastReadMessageCreatedAt = null;

            // If LastReadMessageId exists, use that message's CreatedAt time
            if (readState?.LastReadMessageId != null)
            {
                if (readState.LastReadMessage != null)
                {
                    lastReadMessageCreatedAt = readState.LastReadMessage.CreatedAt;
                }
                else
                {
                    // Navigation property not loaded, fetch the message
                    var lastReadMessage = await _context.Messages
                        .FirstOrDefaultAsync(m => m.Id == readState.LastReadMessageId.Value);
                    lastReadMessageCreatedAt = lastReadMessage?.CreatedAt;
                }
            }

            int unreadCount;
            if (lastReadMessageCreatedAt.HasValue)
            {
                // Count messages created after the last read message (capped at 99)
                var count = await _context.Messages
                    .Where(m => m.ChannelId == channelId 
                        && m.DeletedAt == null 
                        && m.CreatedAt > lastReadMessageCreatedAt.Value)
                    .CountAsync();
                unreadCount = count > 99 ? 99 : count; // Cap at 99 for performance
            }
            else if (readState?.LastReadAt != null)
            {
                // Fallback: Use LastReadAt if LastReadMessageId is not available
                var count = await _context.Messages
                    .Where(m => m.ChannelId == channelId 
                        && m.DeletedAt == null 
                        && m.CreatedAt > readState.LastReadAt)
                    .CountAsync();
                unreadCount = count > 99 ? 99 : count; // Cap at 99 for performance
            }
            else
            {
                // Never read - count all non-deleted messages (capped at 99)
                var totalCount = await _context.Messages
                    .Where(m => m.ChannelId == channelId && m.DeletedAt == null)
                    .CountAsync();
                unreadCount = totalCount > 99 ? 99 : totalCount;
            }

            if (unreadCount > 0)
            {
                unreadChannels.Add(new UnreadCountDto
                {
                    ChannelId = channelId,
                    UnreadCount = unreadCount,
                    LastReadMessageId = readState?.LastReadMessageId
                });
            }
        }

        return new UnreadSummaryDto
        {
            Channels = unreadChannels,
            TotalUnreadCount = unreadChannels.Sum(c => c.UnreadCount)
        };
    }
}

