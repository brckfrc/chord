using ChordAPI.Data;
using ChordAPI.Models.DTOs;
using ChordAPI.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace ChordAPI.Services;

public class DMReadStateService : IDMReadStateService
{
    private readonly AppDbContext _context;
    private readonly ILogger<DMReadStateService> _logger;

    public DMReadStateService(AppDbContext context, ILogger<DMReadStateService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task MarkDMAsReadAsync(Guid dmId, Guid userId, Guid? messageId = null)
    {
        // Check if DM channel exists and user has access
        var dmChannel = await _context.DirectMessageChannels
            .FirstOrDefaultAsync(dmc => dmc.Id == dmId);

        if (dmChannel == null)
        {
            throw new KeyNotFoundException("DM channel not found");
        }

        // Check if user is part of this DM channel
        if (dmChannel.User1Id != userId && dmChannel.User2Id != userId)
        {
            throw new UnauthorizedAccessException("You are not part of this DM channel");
        }

        // If messageId is provided, validate it exists in the DM channel
        if (messageId.HasValue)
        {
            var message = await _context.DirectMessages
                .FirstOrDefaultAsync(dm => dm.Id == messageId.Value && dm.ChannelId == dmId && !dm.IsDeleted);

            if (message == null)
            {
                throw new KeyNotFoundException("Message not found");
            }
        }
        else
        {
            // If no messageId provided, get the latest message in the DM channel
            var latestMessage = await _context.DirectMessages
                .Where(dm => dm.ChannelId == dmId && !dm.IsDeleted)
                .OrderByDescending(dm => dm.CreatedAt)
                .FirstOrDefaultAsync();

            if (latestMessage != null)
            {
                messageId = latestMessage.Id;
            }
        }

        // Get or create read state
        var readState = await _context.DirectMessageReadStates
            .FirstOrDefaultAsync(rs => rs.UserId == userId && rs.ChannelId == dmId);

        if (readState == null)
        {
            readState = new DirectMessageReadState
            {
                UserId = userId,
                ChannelId = dmId,
                LastReadMessageId = messageId,
                LastReadAt = DateTime.UtcNow
            };
            _context.DirectMessageReadStates.Add(readState);
        }
        else
        {
            readState.LastReadMessageId = messageId;
            readState.LastReadAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("User {UserId} marked DM channel {DMId} as read (message: {MessageId})",
            userId, dmId, messageId);
    }

    public async Task<UnreadCountDto> GetDMUnreadCountAsync(Guid dmId, Guid userId)
    {
        // Check if DM channel exists and user has access
        var dmChannel = await _context.DirectMessageChannels
            .FirstOrDefaultAsync(dmc => dmc.Id == dmId);

        if (dmChannel == null)
        {
            throw new KeyNotFoundException("DM channel not found");
        }

        // Check if user is part of this DM channel
        if (dmChannel.User1Id != userId && dmChannel.User2Id != userId)
        {
            throw new UnauthorizedAccessException("You are not part of this DM channel");
        }

        // Get the other user's ID (the one who can send messages that would be unread)
        var otherUserId = dmChannel.User1Id == userId ? dmChannel.User2Id : dmChannel.User1Id;

        // Get read state with last read message
        var readState = await _context.DirectMessageReadStates
            .Include(rs => rs.LastReadMessage)
            .FirstOrDefaultAsync(rs => rs.UserId == userId && rs.ChannelId == dmId);

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
                var lastReadMessage = await _context.DirectMessages
                    .FirstOrDefaultAsync(dm => dm.Id == readState.LastReadMessageId.Value);
                lastReadMessageCreatedAt = lastReadMessage?.CreatedAt;
            }
        }

        // Count unread messages (messages from other user created after last read message, or all if never read)
        int unreadCount;
        if (lastReadMessageCreatedAt.HasValue)
        {
            // Count messages from other user created after the last read message
            // Limit to 100 for performance (99+ will show as 99+)
            var unreadMessagesQuery = _context.DirectMessages
                .Where(dm => dm.ChannelId == dmId
                    && !dm.IsDeleted
                    && dm.SenderId == otherUserId
                    && dm.CreatedAt > lastReadMessageCreatedAt.Value);

            var count = await unreadMessagesQuery.CountAsync();
            unreadCount = count > 99 ? 99 : count; // Cap at 99 for performance
        }
        else if (readState?.LastReadAt != null)
        {
            // Fallback: Use LastReadAt if LastReadMessageId is not available
            var unreadMessagesQuery = _context.DirectMessages
                .Where(dm => dm.ChannelId == dmId
                    && !dm.IsDeleted
                    && dm.SenderId == otherUserId
                    && dm.CreatedAt > readState.LastReadAt);

            var count = await unreadMessagesQuery.CountAsync();
            unreadCount = count > 99 ? 99 : count; // Cap at 99 for performance
        }
        else
        {
            // Never read - count all non-deleted messages from other user (capped at 99)
            var totalCount = await _context.DirectMessages
                .Where(dm => dm.ChannelId == dmId && !dm.IsDeleted && dm.SenderId == otherUserId)
                .CountAsync();
            unreadCount = totalCount > 99 ? 99 : totalCount;
        }

        return new UnreadCountDto
        {
            ChannelId = dmId,
            UnreadCount = unreadCount,
            LastReadMessageId = readState?.LastReadMessageId
        };
    }
}
