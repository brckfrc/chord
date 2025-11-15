namespace ChordAPI.Models.DTOs;

/// <summary>
/// DTO for message responses
/// </summary>
public class MessageResponseDto
{
    public Guid Id { get; set; }
    public Guid ChannelId { get; set; }
    public Guid AuthorId { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? Attachments { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool IsEdited { get; set; }
    
    // Pin fields
    public bool IsPinned { get; set; }
    public DateTime? PinnedAt { get; set; }
    public Guid? PinnedByUserId { get; set; }
    
    /// <summary>
    /// Author information (nested)
    /// </summary>
    public UserDto Author { get; set; } = null!;
}

