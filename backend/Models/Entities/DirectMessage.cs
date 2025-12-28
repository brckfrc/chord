using System.ComponentModel.DataAnnotations;

namespace ChordAPI.Models.Entities;

/// <summary>
/// Represents a direct message between two users
/// Note: Attachments will be added in a future phase (FAZ 9.5.1)
/// </summary>
public class DirectMessage
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid ChannelId { get; set; }

    [Required]
    public Guid SenderId { get; set; }

    /// <summary>
    /// Message content (text only for now, attachments coming in FAZ 9.5.1)
    /// </summary>
    [Required]
    [MaxLength(2000)]
    public string Content { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }
    public DateTime? EditedAt { get; set; }

    /// <summary>
    /// Soft delete flag - message is hidden but not physically deleted
    /// </summary>
    public bool IsDeleted { get; set; } = false;

    // Navigation properties
    public virtual DirectMessageChannel Channel { get; set; } = null!;
    public virtual User Sender { get; set; } = null!;
}

