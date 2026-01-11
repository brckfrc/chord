using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ChordAPI.Models.Entities;

/// <summary>
/// Tracks the last read position for a user in a direct message channel (for unread message tracking)
/// </summary>
public class DirectMessageReadState
{
    [Key, Column(Order = 0)]
    public Guid UserId { get; set; }

    [Key, Column(Order = 1)]
    public Guid ChannelId { get; set; }

    /// <summary>
    /// The ID of the last message the user has read in this DM channel
    /// </summary>
    public Guid? LastReadMessageId { get; set; }

    /// <summary>
    /// Timestamp when the user last read messages in this DM channel
    /// </summary>
    public DateTime LastReadAt { get; set; }

    // Navigation properties
    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;

    [ForeignKey(nameof(ChannelId))]
    public virtual DirectMessageChannel Channel { get; set; } = null!;

    [ForeignKey(nameof(LastReadMessageId))]
    public virtual DirectMessage? LastReadMessage { get; set; }
}
