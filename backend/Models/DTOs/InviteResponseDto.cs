namespace ChordAPI.Models.DTOs;

public class InviteResponseDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public Guid GuildId { get; set; }
    public string GuildName { get; set; } = string.Empty;
    public string? GuildIconUrl { get; set; }
    public Guid CreatedByUserId { get; set; }
    public string CreatedByUsername { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public int? MaxUses { get; set; }
    public int Uses { get; set; }
    public bool IsActive { get; set; }
}

