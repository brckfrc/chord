using ChordAPI.Models.DTOs;

namespace ChordAPI.Services;

public interface IReadStateService
{
    /// <summary>
    /// Mark a channel as read (update last read position)
    /// </summary>
    Task MarkChannelAsReadAsync(Guid channelId, Guid userId, Guid? messageId = null);

    /// <summary>
    /// Get unread message count for a specific channel
    /// </summary>
    Task<UnreadCountDto> GetUnreadCountAsync(Guid channelId, Guid userId);

    /// <summary>
    /// Get unread summary for all channels the user has access to
    /// </summary>
    Task<UnreadSummaryDto> GetUnreadSummaryAsync(Guid userId);
}

