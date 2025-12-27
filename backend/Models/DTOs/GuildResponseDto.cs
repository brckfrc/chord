namespace ChordAPI.Models.DTOs;

public class GuildResponseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? IconUrl { get; set; }
    public Guid OwnerId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Owner bilgisi
    public UserDto? Owner { get; set; }

    // Member count
    public int MemberCount { get; set; }

    // Channel count
    public int ChannelCount { get; set; }
}


