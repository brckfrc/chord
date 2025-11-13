using System.ComponentModel.DataAnnotations;

namespace ChordAPI.Models.DTOs;

public class AddReactionDto
{
    [Required]
    [MaxLength(50)]
    public string Emoji { get; set; } = string.Empty;
}

