using System.ComponentModel.DataAnnotations;

namespace ChordAPI.Models.DTOs;

/// <summary>
/// DTO for updating/editing a direct message
/// </summary>
public class UpdateDirectMessageDto
{
    [Required]
    [MaxLength(2000)]
    public string Content { get; set; } = string.Empty;
}

