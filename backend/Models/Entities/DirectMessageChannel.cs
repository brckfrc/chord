using System.ComponentModel.DataAnnotations;

namespace ChordAPI.Models.Entities;

/// <summary>
/// Represents a direct message channel between two users
/// User1Id and User2Id are ordered such that User1Id < User2Id to ensure uniqueness
/// </summary>
public class DirectMessageChannel
{
    [Key]
    public Guid Id { get; set; }

    /// <summary>
    /// First user ID (always the smaller GUID)
    /// </summary>
    [Required]
    public Guid User1Id { get; set; }

    /// <summary>
    /// Second user ID (always the larger GUID)
    /// </summary>
    [Required]
    public Guid User2Id { get; set; }

    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Timestamp of the last message sent in this channel
    /// </summary>
    public DateTime? LastMessageAt { get; set; }

    // Navigation properties
    public virtual User User1 { get; set; } = null!;
    public virtual User User2 { get; set; } = null!;
    public virtual ICollection<DirectMessage> Messages { get; set; } = new List<DirectMessage>();
}

