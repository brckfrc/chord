using ChordAPI.Models.DTOs;

namespace ChordAPI.Services;

public interface IInviteService
{
    Task<InviteResponseDto> CreateInviteAsync(Guid guildId, Guid userId, CreateInviteDto dto);
    Task<InviteInfoDto> GetInviteByCodeAsync(string code);
    Task<GuildResponseDto> AcceptInviteAsync(string code, Guid userId);
    Task<IEnumerable<InviteResponseDto>> GetGuildInvitesAsync(Guid guildId, Guid userId);
    Task RevokeInviteAsync(Guid inviteId, Guid userId);
}

