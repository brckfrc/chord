using System.ComponentModel.DataAnnotations;

namespace ChordAPI.Models.Entities;

public class Message
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid ChannelId { get; set; }

    [Required]
    public Guid AuthorId { get; set; }

    [Required]
    [MaxLength(4000)]
    public string Content { get; set; } = string.Empty;

    public string? Attachments { get; set; } // JSON array: [{url, type, size, name}]

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? DeletedAt { get; set; } // Soft delete

    public bool IsEdited { get; set; }

    // Navigation properties
    public virtual Channel Channel { get; set; } = null!;
    public virtual User Author { get; set; } = null!;
}






