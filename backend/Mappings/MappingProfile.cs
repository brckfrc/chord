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
        
        // Add more mappings as needed for Guilds, Channels, Messages, etc.
    }
}

