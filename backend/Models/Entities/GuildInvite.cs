using System.ComponentModel.DataAnnotations;

namespace ChordAPI.Models.Entities;

public class GuildInvite
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(8)]
    public string Code { get; set; } = string.Empty;

    [Required]
    public Guid GuildId { get; set; }

    [Required]
    public Guid CreatedByUserId { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? ExpiresAt { get; set; }

    public int? MaxUses { get; set; }

    public int Uses { get; set; } = 0;

    public bool IsActive { get; set; } = true; // For revoking invites

    // Navigation properties
    public virtual Guild Guild { get; set; } = null!;
    public virtual User CreatedByUser { get; set; } = null!;
}

