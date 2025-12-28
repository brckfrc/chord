using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ChordAPI.Models.Entities;

/// <summary>
/// Join table for many-to-many relationship between GuildMember and Role.
/// A member can have multiple roles, and a role can be assigned to multiple members.
/// </summary>
public class GuildMemberRole
{
    [Required]
    public Guid GuildId { get; set; }

    [Required]
    public Guid UserId { get; set; }

    [Required]
    public Guid RoleId { get; set; }

    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public virtual GuildMember GuildMember { get; set; } = null!;

    [ForeignKey("RoleId")]
    public virtual Role Role { get; set; } = null!;
}



