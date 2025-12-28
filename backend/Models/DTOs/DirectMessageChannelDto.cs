namespace ChordAPI.Models.DTOs;

/// <summary>
/// DTO for direct message channel data
/// </summary>
public class DirectMessageChannelDto
{
    public Guid Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastMessageAt { get; set; }

    // The other user in this DM (not the current user)
    public UserDto OtherUser { get; set; } = null!;

    // Last message preview (optional, for DM list)
    public DirectMessageDto? LastMessage { get; set; }

    // Unread count for this DM
    public int UnreadCount { get; set; }
}

