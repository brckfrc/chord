namespace ChordAPI.Models.DTOs;

public class ReactionsGroupedDto
{
    public string Emoji { get; set; } = string.Empty;
    public int Count { get; set; }
    public List<ReactionUserDto> Users { get; set; } = new();
}

public class ReactionUserDto
{
    public Guid UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
}

