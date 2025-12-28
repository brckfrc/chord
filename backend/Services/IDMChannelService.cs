using ChordAPI.Models.DTOs;

namespace ChordAPI.Services;

public interface IDMChannelService
{
    /// <summary>
    /// Get or create a DM channel between two users
    /// User IDs are automatically ordered (smaller ID first) to ensure uniqueness
    /// </summary>
    Task<DirectMessageChannelDto> GetOrCreateDMAsync(Guid userId, Guid otherUserId);

    /// <summary>
    /// Get all DM channels for a user, with unread counts
    /// </summary>
    Task<List<DirectMessageChannelDto>> GetUserDMsAsync(Guid userId);

    /// <summary>
    /// Get a specific DM channel by ID (validates user has access)
    /// </summary>
    Task<DirectMessageChannelDto> GetDMByIdAsync(Guid userId, Guid dmId);
}

