using AutoMapper;
using ChordAPI.Models.DTOs;
using ChordAPI.Models.Entities;

namespace ChordAPI.Mappings;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        // User mappings
        CreateMap<User, UserDto>();

        // Guild mappings
        CreateMap<Guild, GuildResponseDto>()
            .ForMember(dest => dest.MemberCount, opt => opt.MapFrom(src => src.Members.Count))
            .ForMember(dest => dest.ChannelCount, opt => opt.MapFrom(src => src.Channels.Count));

        // Channel mappings
        CreateMap<Channel, ChannelResponseDto>();

        // GuildMember mappings
        CreateMap<GuildMember, GuildMemberDto>();

        // Message mappings
        CreateMap<Message, MessageResponseDto>();

        // Reaction mappings
        CreateMap<MessageReaction, ReactionResponseDto>()
            .ForMember(dest => dest.Username, opt => opt.MapFrom(src => src.User.Username))
            .ForMember(dest => dest.DisplayName, opt => opt.MapFrom(src => src.User.DisplayName));

        // GuildInvite mappings
        CreateMap<GuildInvite, InviteResponseDto>()
            .ForMember(dest => dest.GuildName, opt => opt.MapFrom(src => src.Guild.Name))
            .ForMember(dest => dest.GuildIconUrl, opt => opt.MapFrom(src => src.Guild.IconUrl))
            .ForMember(dest => dest.CreatedByUsername, opt => opt.MapFrom(src => src.CreatedByUser.Username));

        CreateMap<GuildInvite, InviteInfoDto>()
            .ForMember(dest => dest.GuildName, opt => opt.MapFrom(src => src.Guild.Name))
            .ForMember(dest => dest.GuildIconUrl, opt => opt.MapFrom(src => src.Guild.IconUrl))
            .ForMember(dest => dest.GuildDescription, opt => opt.MapFrom(src => src.Guild.Description))
            .ForMember(dest => dest.CreatedByUsername, opt => opt.MapFrom(src => src.CreatedByUser.Username))
            .ForMember(dest => dest.MemberCount, opt => opt.Ignore())
            .ForMember(dest => dest.IsExpired, opt => opt.Ignore())
            .ForMember(dest => dest.IsMaxUsesReached, opt => opt.Ignore());

        // MessageMention mappings
        CreateMap<Models.Entities.MessageMention, MessageMentionDto>();
    }
}

