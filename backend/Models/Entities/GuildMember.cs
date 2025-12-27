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

    // Navigation properties
    public virtual Guild Guild { get; set; } = null!;
    public virtual User User { get; set; } = null!;

    // Many-to-many relationship with roles
    public virtual ICollection<GuildMemberRole> MemberRoles { get; set; } = new List<GuildMemberRole>();
}






