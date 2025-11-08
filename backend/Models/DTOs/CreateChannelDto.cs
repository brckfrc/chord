using System.ComponentModel.DataAnnotations;
using ChordAPI.Models.Entities;

namespace ChordAPI.Models.DTOs;

/// <summary>
/// DTO for creating a new channel. The channel will be automatically added to the end of the channel list.
/// </summary>
public class CreateChannelDto
{
    [Required]
    [StringLength(100, MinimumLength = 3)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public ChannelType Type { get; set; } = ChannelType.Text;

    [StringLength(500)]
    public string? Topic { get; set; }
}


