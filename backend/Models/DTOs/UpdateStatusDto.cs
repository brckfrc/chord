using ChordAPI.Models.Entities;
using System.ComponentModel.DataAnnotations;

namespace ChordAPI.Models.DTOs;

public class UpdateStatusDto
{
    /// <summary>
    /// User's online status
    /// </summary>
    [Required]
    public UserStatus Status { get; set; }

    /// <summary>
    /// Custom status message (optional, max 100 characters)
    /// </summary>
    [MaxLength(100)]
    public string? CustomStatus { get; set; }
}

