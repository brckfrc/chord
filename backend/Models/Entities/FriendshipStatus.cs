namespace ChordAPI.Models.Entities;

/// <summary>
/// Represents the status of a friendship relationship
/// </summary>
public enum FriendshipStatus
{
    /// <summary>
    /// Friend request pending acceptance
    /// </summary>
    Pending = 0,
    
    /// <summary>
    /// Friend request accepted, users are friends
    /// </summary>
    Accepted = 1,
    
    /// <summary>
    /// User is blocked
    /// </summary>
    Blocked = 2
}

