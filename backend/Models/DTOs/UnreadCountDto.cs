namespace ChordAPI.Models.DTOs;

public class UnreadCountDto
{
    public Guid ChannelId { get; set; }
    public int UnreadCount { get; set; }
    /// <summary>
    /// The ID of the last message the user has read in this channel (for "jump to unread" feature)
    /// </summary>
    public Guid? LastReadMessageId { get; set; }
}

