using System.ComponentModel.DataAnnotations;

namespace ChordAPI.Models.Entities;

public class GuildMember
{
    [Required]
    public Guid GuildId { get; set; }

    [Required]
    public Guid UserId { get; set; }

    public DateTime JoinedAt { get; set; }

    [MaxLength(50)]
    public string? Nickname { get; set; }

    [MaxLength(20)]
    public string Role { get; set; } = "Member"; // Owner, Admin, Member

    // Navigation properties
    public virtual Guild Guild { get; set; } = null!;
    public virtual User User { get; set; } = null!;
}






