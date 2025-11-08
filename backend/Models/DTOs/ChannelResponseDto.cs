using ChordAPI.Models.Entities;

namespace ChordAPI.Models.DTOs;

public class ChannelResponseDto
{
    public Guid Id { get; set; }
    public Guid GuildId { get; set; }
    public string Name { get; set; } = string.Empty;
    public ChannelType Type { get; set; }
    public string? Topic { get; set; }
    public int Position { get; set; }
    public DateTime CreatedAt { get; set; }
}


