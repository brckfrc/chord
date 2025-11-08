namespace ChordAPI.Models.DTOs;

public class GuildMemberDto
{
    public Guid GuildId { get; set; }
    public Guid UserId { get; set; }
    public DateTime JoinedAt { get; set; }
    public string? Nickname { get; set; }
    public string Role { get; set; } = "Member"; // Owner, Admin, Member

    // User bilgisi
    public UserDto? User { get; set; }
}


