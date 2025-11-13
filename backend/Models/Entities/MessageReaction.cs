using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ChordAPI.Models.Entities;

public class MessageReaction
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid MessageId { get; set; }

    [Required]
    public Guid UserId { get; set; }

    [Required]
    [MaxLength(50)] // Emoji veya custom emoji ID (örn: "👍", "custom:123")
    public string Emoji { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    // Navigation properties
    [ForeignKey(nameof(MessageId))]
    public virtual Message Message { get; set; } = null!;

    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;
}

