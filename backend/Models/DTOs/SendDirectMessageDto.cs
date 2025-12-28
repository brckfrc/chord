using System.ComponentModel.DataAnnotations;

namespace ChordAPI.Models.DTOs;

/// <summary>
/// DTO for sending a direct message
/// </summary>
public class SendDirectMessageDto
{
    [Required]
    [MaxLength(2000)]
    public string Content { get; set; } = string.Empty;
}

