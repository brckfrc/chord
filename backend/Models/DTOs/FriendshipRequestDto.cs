using System.ComponentModel.DataAnnotations;

namespace ChordAPI.Models.DTOs;

/// <summary>
/// DTO for sending a friend request
/// </summary>
public class FriendshipRequestDto
{
    [Required]
    [MaxLength(50)]
    public string Username { get; set; } = string.Empty;
}

