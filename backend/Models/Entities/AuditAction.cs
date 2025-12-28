namespace ChordAPI.Models.Entities;

/// <summary>
/// Audit action types for tracking system events
/// </summary>
public enum AuditAction
{
    // Auth (1-9)
    UserRegistered = 1,
    UserLogin = 2,
    UserLogout = 3,
    
    // Guild (10-19)
    GuildCreated = 10,
    GuildUpdated = 11,
    GuildDeleted = 12,
    
    // Members (20-29)
    MemberJoined = 20,
    MemberLeft = 21,
    MemberKicked = 22,
    MemberBanned = 23,
    
    // Channels (30-39)
    ChannelCreated = 30,
    ChannelUpdated = 31,
    ChannelDeleted = 32,
    
    // Messages (40-49)
    MessageSent = 40,
    MessageEdited = 41,
    MessageDeleted = 42,
    MessagePinned = 43,
    MessageUnpinned = 44,
    
    // Roles (50-59)
    RoleCreated = 50,
    RoleUpdated = 51,
    RoleDeleted = 52,
    RoleAssigned = 53,
    RoleRemoved = 54,
    
    // Invites (60-69)
    InviteCreated = 60,
    InviteUsed = 61,
    InviteRevoked = 62,
    
    // Voice (70-79)
    VoiceJoined = 70,
    VoiceLeft = 71,
    
    // DM & Friends (80-89)
    FriendRequestSent = 80,
    FriendRequestAccepted = 81,
    FriendRequestDeclined = 82,
    FriendRemoved = 83,
    UserBlocked = 84,
    UserUnblocked = 85
}
