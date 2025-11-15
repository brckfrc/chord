namespace ChordAPI.Models.Entities;

/// <summary>
/// User's online status (similar to Discord)
/// </summary>
public enum UserStatus
{
    /// <summary>
    /// User is online and active
    /// </summary>
    Online = 0,

    /// <summary>
    /// User is away/idle (no activity for a while)
    /// </summary>
    Idle = 1,

    /// <summary>
    /// User does not want to be disturbed
    /// </summary>
    DoNotDisturb = 2,

    /// <summary>
    /// User is offline/invisible (appears offline to others)
    /// </summary>
    Invisible = 3,

    /// <summary>
    /// User is offline (disconnected or manually set to offline)
    /// </summary>
    Offline = 4
}

