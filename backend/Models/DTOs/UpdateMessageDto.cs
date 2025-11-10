using System.ComponentModel.DataAnnotations;

namespace ChordAPI.Models.DTOs;

/// <summary>
/// DTO for updating an existing message
/// </summary>
public class UpdateMessageDto
{
    /// <summary>
    /// Updated message content (max 4000 characters)
    /// </summary>
    [Required]
    [StringLength(4000, MinimumLength = 1)]
    public string Content { get; set; } = string.Empty;
}

