namespace ChordAPI.Models.DTOs;

/// <summary>
/// Response DTO for joining a voice channel via SignalR
/// </summary>
public class VoiceJoinResponseDto
{
    public bool Success { get; set; }
    public string? Error { get; set; }
    public string ChannelId { get; set; } = string.Empty;
    
    // LiveKit connection info
    public string? LiveKitToken { get; set; }
    public string? LiveKitUrl { get; set; }
    public string? RoomName { get; set; }
    
    // Current users in the voice channel
    public List<VoiceUserDto> VoiceUsers { get; set; } = new();
}

/// <summary>
/// DTO representing a user in a voice channel
/// </summary>
public class VoiceUserDto
{
    public string UserId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public bool IsMuted { get; set; }
    public bool IsDeafened { get; set; }
    public bool IsSpeaking { get; set; }
    public bool IsVideoEnabled { get; set; }
}


