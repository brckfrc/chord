using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ChordAPI.Models.Entities;

/// <summary>
/// Tracks the last read position for a user in a channel (for unread message tracking)
/// </summary>
public class ChannelReadState
{
    [Key, Column(Order = 0)]
    public Guid UserId { get; set; }

    [Key, Column(Order = 1)]
    public Guid ChannelId { get; set; }

    /// <summary>
    /// The ID of the last message the user has read in this channel
    /// </summary>
    public Guid? LastReadMessageId { get; set; }

    /// <summary>
    /// Timestamp when the user last read messages in this channel
    /// </summary>
    public DateTime LastReadAt { get; set; }

    // Navigation properties
    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;

    [ForeignKey(nameof(ChannelId))]
    public virtual Channel Channel { get; set; } = null!;

    [ForeignKey(nameof(LastReadMessageId))]
    public virtual Message? LastReadMessage { get; set; }
}

