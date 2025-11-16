namespace ChordAPI.Models.DTOs;

public class CreateInviteDto
{
    public DateTime? ExpiresAt { get; set; }
    public int? MaxUses { get; set; }
}

