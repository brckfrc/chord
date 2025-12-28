using ChordAPI.Models.DTOs;

namespace ChordAPI.Services;

public interface IDirectMessageService
{
    /// <summary>
    /// Get paginated messages from a DM channel
    /// </summary>
    Task<List<DirectMessageDto>> GetMessagesAsync(Guid userId, Guid channelId, int page = 1, int pageSize = 50);

    /// <summary>
    /// Send a new message in a DM channel
    /// </summary>
    Task<DirectMessageDto> SendMessageAsync(Guid userId, Guid channelId, string content);

    /// <summary>
    /// Edit a direct message (only by sender)
    /// </summary>
    Task<DirectMessageDto> EditMessageAsync(Guid userId, Guid messageId, string content);

    /// <summary>
    /// Delete a direct message (soft delete, only by sender)
    /// </summary>
    Task DeleteMessageAsync(Guid userId, Guid messageId);
}

