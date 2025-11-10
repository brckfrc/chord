using System.ComponentModel.DataAnnotations;

namespace ChordAPI.Models.DTOs;

/// <summary>
/// DTO for creating a new message in a channel
/// </summary>
public class CreateMessageDto
{
    /// <summary>
    /// Message content (max 4000 characters)
    /// </summary>
    [Required]
    [StringLength(4000, MinimumLength = 1)]
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// Optional attachments (JSON format: [{url, type, size, name, duration}])
    /// </summary>
    [StringLength(8000)]
    public string? Attachments { get; set; }
}

