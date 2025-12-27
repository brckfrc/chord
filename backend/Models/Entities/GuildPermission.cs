namespace ChordAPI.Models.Entities;

/// <summary>
/// Bitfield-based permissions for guild roles.
/// Each permission is a bit flag that can be combined with others.
/// </summary>
[Flags]
public enum GuildPermission : long
{
    None = 0,

    // Administrative permissions
    Administrator = 1L << 0,      // Full access, bypasses all permission checks
    ManageGuild = 1L << 1,        // Edit guild settings (name, icon, etc.)
    ManageChannels = 1L << 2,     // Create, edit, delete channels
    ManageRoles = 1L << 3,        // Create, edit, delete roles below own highest role
    ManageMessages = 1L << 4,     // Delete any message, pin/unpin messages

    // Member management
    KickMembers = 1L << 5,        // Kick members from the guild
    BanMembers = 1L << 6,         // Ban members from the guild

    // Text channel permissions
    SendMessages = 1L << 7,       // Send messages in text channels
    ReadMessages = 1L << 8,       // View messages in text channels
    MentionEveryone = 1L << 9,    // Use @everyone and @here mentions
    AddReactions = 1L << 10,      // Add reactions to messages

    // Voice channel permissions
    Connect = 1L << 11,           // Connect to voice channels
    Speak = 1L << 12,             // Speak in voice channels
    MuteMembers = 1L << 13,       // Server mute other members in voice
    DeafenMembers = 1L << 14,     // Server deafen other members in voice
    MoveMembers = 1L << 15,       // Move members between voice channels

    // Invite permissions
    CreateInvite = 1L << 16,      // Create guild invites

    // Common permission combinations
    AllText = SendMessages | ReadMessages | AddReactions,
    AllVoice = Connect | Speak,
    AllBasic = AllText | AllVoice | CreateInvite,
    All = Administrator // Administrator grants all permissions
}


