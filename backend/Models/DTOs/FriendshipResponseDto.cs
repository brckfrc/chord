using ChordAPI.Models.Entities;

namespace ChordAPI.Models.DTOs;

/// <summary>
/// DTO for friendship data
/// </summary>
public class FriendshipResponseDto
{
    public Guid Id { get; set; }
    public Guid RequesterId { get; set; }
    public Guid AddresseeId { get; set; }
    public FriendshipStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? AcceptedAt { get; set; }

    // User information for the other party (not the current user)
    public UserDto OtherUser { get; set; } = null!;
}

