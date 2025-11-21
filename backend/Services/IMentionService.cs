using ChordAPI.Models.DTOs;

namespace ChordAPI.Services;

public interface IMentionService
{
    Task<IEnumerable<MessageMentionDto>> GetUserMentionsAsync(Guid userId, bool unreadOnly = false);
    Task<IEnumerable<MessageMentionDto>> GetMentionsByMessageIdAsync(Guid messageId);
    Task MarkMentionAsReadAsync(Guid mentionId, Guid userId);
    Task<int> MarkAllMentionsAsReadAsync(Guid userId, Guid? guildId = null);
    Task<int> GetUnreadMentionCountAsync(Guid userId);
}

