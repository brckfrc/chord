using System.ComponentModel.DataAnnotations;

namespace ChordAPI.Models.Entities;

/// <summary>
/// Represents a friendship relationship or request between two users
/// </summary>
public class Friendship
{
    [Key]
    public Guid Id { get; set; }

    /// <summary>
    /// User who sent the friend request
    /// </summary>
    [Required]
    public Guid RequesterId { get; set; }

    /// <summary>
    /// User who received the friend request
    /// </summary>
    [Required]
    public Guid AddresseeId { get; set; }

    /// <summary>
    /// Current status of the friendship
    /// </summary>
    public FriendshipStatus Status { get; set; } = FriendshipStatus.Pending;

    public DateTime CreatedAt { get; set; }
    public DateTime? AcceptedAt { get; set; }

    // Navigation properties
    public virtual User Requester { get; set; } = null!;
    public virtual User Addressee { get; set; } = null!;
}

