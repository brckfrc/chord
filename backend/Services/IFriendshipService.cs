using ChordAPI.Models.DTOs;
using ChordAPI.Models.Entities;

namespace ChordAPI.Services;

public interface IFriendshipService
{
    /// <summary>
    /// Send a friend request to a user by username
    /// </summary>
    Task<FriendshipResponseDto> SendFriendRequestAsync(Guid userId, string username);

    /// <summary>
    /// Accept a pending friend request
    /// </summary>
    Task<FriendshipResponseDto> AcceptRequestAsync(Guid userId, Guid requestId);

    /// <summary>
    /// Decline a pending friend request
    /// </summary>
    Task DeclineRequestAsync(Guid userId, Guid requestId);

    /// <summary>
    /// Block a user (creates or updates friendship to Blocked status)
    /// </summary>
    Task<FriendshipResponseDto> BlockUserAsync(Guid userId, Guid targetUserId);

    /// <summary>
    /// Unblock a user (removes the block)
    /// </summary>
    Task UnblockUserAsync(Guid userId, Guid targetUserId);

    /// <summary>
    /// Remove a friend (deletes the friendship)
    /// </summary>
    Task RemoveFriendAsync(Guid userId, Guid friendId);

    /// <summary>
    /// Get all accepted friends for a user
    /// </summary>
    Task<List<FriendshipResponseDto>> GetFriendsAsync(Guid userId);

    /// <summary>
    /// Get all pending friend requests (both sent and received)
    /// </summary>
    Task<List<FriendshipResponseDto>> GetPendingRequestsAsync(Guid userId);

    /// <summary>
    /// Get all blocked users
    /// </summary>
    Task<List<FriendshipResponseDto>> GetBlockedUsersAsync(Guid userId);

    /// <summary>
    /// Check if a user is blocked by or has blocked another user
    /// </summary>
    Task<bool> IsBlockedAsync(Guid userId, Guid otherUserId);
}

