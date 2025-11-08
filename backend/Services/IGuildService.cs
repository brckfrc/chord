using ChordAPI.Models.DTOs;

namespace ChordAPI.Services;

public interface IGuildService
{
    Task<GuildResponseDto> CreateGuildAsync(Guid userId, CreateGuildDto dto);
    Task<IEnumerable<GuildResponseDto>> GetUserGuildsAsync(Guid userId);
    Task<GuildResponseDto?> GetGuildByIdAsync(Guid guildId, Guid userId);
    Task<GuildResponseDto> UpdateGuildAsync(Guid guildId, Guid userId, UpdateGuildDto dto);
    Task DeleteGuildAsync(Guid guildId, Guid userId);
    
    // Member management
    Task<GuildMemberDto> AddMemberAsync(Guid guildId, Guid ownerId, Guid userIdToAdd);
    Task RemoveMemberAsync(Guid guildId, Guid requesterId, Guid userIdToRemove);
    Task<IEnumerable<GuildMemberDto>> GetGuildMembersAsync(Guid guildId, Guid userId);
}


