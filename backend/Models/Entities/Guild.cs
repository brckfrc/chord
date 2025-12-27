using System.ComponentModel.DataAnnotations;

namespace ChordAPI.Models.Entities;

public class Guild
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    [MaxLength(500)]
    public string? IconUrl { get; set; }

    [Required]
    public Guid OwnerId { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation properties
    public virtual User Owner { get; set; } = null!;
    public virtual ICollection<GuildMember> Members { get; set; } = new List<GuildMember>();
    public virtual ICollection<Channel> Channels { get; set; } = new List<Channel>();
    public virtual ICollection<Role> Roles { get; set; } = new List<Role>();
}






