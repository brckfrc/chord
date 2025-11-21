namespace ChordAPI.Models.DTOs;

/// <summary>
/// DTO for message mention response
/// </summary>
public class MessageMentionDto
{
    public Guid Id { get; set; }
    public Guid MessageId { get; set; }
    public Guid MentionedUserId { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
    
    /// <summary>
    /// The message that contains the mention
    /// </summary>
    public MessageResponseDto Message { get; set; } = null!;
    
    /// <summary>
    /// The user who was mentioned
    /// </summary>
    public UserDto MentionedUser { get; set; } = null!;
}

