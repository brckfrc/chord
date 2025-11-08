using System.ComponentModel.DataAnnotations;

namespace ChordAPI.Models.DTOs;

public class UpdateChannelDto
{
    [Required]
    [StringLength(100, MinimumLength = 3)]
    public string Name { get; set; } = string.Empty;

    [StringLength(500)]
    public string? Topic { get; set; }

    /// <summary>
    /// Position of the channel in the list. When changed, other channels are automatically reordered.
    /// </summary>
    public int Position { get; set; }
}


