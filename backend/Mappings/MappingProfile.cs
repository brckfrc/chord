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
    }
}

