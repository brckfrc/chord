using ChordAPI.Models.DTOs;

namespace ChordAPI.Services;

public interface IDMReadStateService
{
    /// <summary>
    /// Mark a DM channel as read (update last read position)
    /// </summary>
    Task MarkDMAsReadAsync(Guid dmId, Guid userId, Guid? messageId = null);

    /// <summary>
    /// Get unread message count for a specific DM channel
    /// </summary>
    Task<UnreadCountDto> GetDMUnreadCountAsync(Guid dmId, Guid userId);
}
