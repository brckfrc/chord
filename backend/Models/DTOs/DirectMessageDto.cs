namespace ChordAPI.Models.DTOs;

/// <summary>
/// DTO for direct message data
/// </summary>
public class DirectMessageDto
{
    public Guid Id { get; set; }
    public Guid ChannelId { get; set; }
    public Guid SenderId { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? EditedAt { get; set; }
    public bool IsDeleted { get; set; }

    // Sender information
    public UserDto Sender { get; set; } = null!;
}

