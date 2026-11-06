using ChordAPI.Models.DTOs;
using ChordAPI.Models.Entities;
using Riok.Mapperly.Abstractions;

namespace ChordAPI.Mappings;

// Entity -> DTO mappings, generated at compile time by Mapperly.
// RequiredMappingStrategy.Target: every DTO property must be mapped or explicitly ignored,
// so a new DTO field can't silently stay empty. Extra entity fields (PasswordHash, ...) are skipped.
// Navigation properties are dereferenced directly: Include them before mapping.
[Mapper(RequiredMappingStrategy = RequiredMappingStrategy.Target)]
public static partial class ChordMapper
{
    public static partial UserDto ToDto(this User user);

    [MapProperty("Members.Count", nameof(GuildResponseDto.MemberCount))]
    [MapProperty("Channels.Count", nameof(GuildResponseDto.ChannelCount))]
    public static partial GuildResponseDto ToDto(this Guild guild);

    // UnreadCount is filled in by the caller.
    [MapperIgnoreTarget(nameof(ChannelResponseDto.UnreadCount))]
    public static partial ChannelResponseDto ToDto(this Channel channel);

    // Role has never been filled from GuildMember (no such column); kept as before.
    [MapperIgnoreTarget(nameof(GuildMemberDto.Role))]
    public static partial GuildMemberDto ToDto(this GuildMember member);

    public static partial MessageResponseDto ToDto(this Message message);

    [MapProperty("Guild.Name", nameof(InviteResponseDto.GuildName))]
    [MapProperty("Guild.IconUrl", nameof(InviteResponseDto.GuildIconUrl))]
    [MapProperty("CreatedByUser.Username", nameof(InviteResponseDto.CreatedByUsername))]
    public static partial InviteResponseDto ToDto(this GuildInvite invite);

    // MemberCount, IsExpired and IsMaxUsesReached are filled in by the caller.
    [MapProperty("Guild.Name", nameof(InviteInfoDto.GuildName))]
    [MapProperty("Guild.IconUrl", nameof(InviteInfoDto.GuildIconUrl))]
    [MapProperty("Guild.Description", nameof(InviteInfoDto.GuildDescription))]
    [MapProperty("CreatedByUser.Username", nameof(InviteInfoDto.CreatedByUsername))]
    [MapperIgnoreTarget(nameof(InviteInfoDto.MemberCount))]
    [MapperIgnoreTarget(nameof(InviteInfoDto.IsExpired))]
    [MapperIgnoreTarget(nameof(InviteInfoDto.IsMaxUsesReached))]
    public static partial InviteInfoDto ToInfoDto(this GuildInvite invite);

    public static partial MessageMentionDto ToDto(this MessageMention mention);
}
