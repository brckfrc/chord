using ChordAPI.Models.DTOs;

namespace ChordAPI.Services;

public interface IReactionService
{
    Task<ReactionResponseDto> AddReactionAsync(Guid messageId, Guid userId, AddReactionDto dto);
    Task RemoveReactionAsync(Guid messageId, Guid userId, string emoji);
    Task<List<ReactionsGroupedDto>> GetMessageReactionsAsync(Guid messageId, Guid userId);
}

