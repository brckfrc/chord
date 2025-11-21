using System.ComponentModel.DataAnnotations;

namespace ChordAPI.Models.Entities;

public class MessageMention
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid MessageId { get; set; }

    [Required]
    public Guid MentionedUserId { get; set; }

    public bool IsRead { get; set; } = false;

    public DateTime CreatedAt { get; set; }

    // Navigation properties
    public virtual Message Message { get; set; } = null!;
    public virtual User MentionedUser { get; set; } = null!;
}

