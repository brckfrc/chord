using System.ComponentModel.DataAnnotations;

namespace ChordAPI.Models.DTOs;

public class UpdateGuildDto
{
    [Required]
    [StringLength(100, MinimumLength = 3)]
    public string Name { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Description { get; set; }

    [StringLength(500)]
    [Url]
    public string? IconUrl { get; set; }
}


