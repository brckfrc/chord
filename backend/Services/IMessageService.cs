using ChordAPI.Models.DTOs;

namespace ChordAPI.Services;

public interface IMessageService
{
    Task<MessageResponseDto> CreateMessageAsync(Guid channelId, Guid userId, CreateMessageDto dto);
    Task<PaginatedMessagesDto> GetChannelMessagesAsync(Guid channelId, Guid userId, int page = 1, int pageSize = 50);
    Task<MessageResponseDto> GetMessageByIdAsync(Guid messageId, Guid userId);
    Task<MessageResponseDto> UpdateMessageAsync(Guid messageId, Guid userId, UpdateMessageDto dto);
    Task DeleteMessageAsync(Guid messageId, Guid userId);
}

