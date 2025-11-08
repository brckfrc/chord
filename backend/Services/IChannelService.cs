using ChordAPI.Models.DTOs;

namespace ChordAPI.Services;

public interface IChannelService
{
    Task<ChannelResponseDto> CreateChannelAsync(Guid guildId, Guid userId, CreateChannelDto dto);
    Task<IEnumerable<ChannelResponseDto>> GetGuildChannelsAsync(Guid guildId, Guid userId);
    Task<ChannelResponseDto?> GetChannelByIdAsync(Guid channelId, Guid userId);
    Task<ChannelResponseDto> UpdateChannelAsync(Guid channelId, Guid userId, UpdateChannelDto dto);
    Task DeleteChannelAsync(Guid channelId, Guid userId);
}

