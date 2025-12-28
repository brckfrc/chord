namespace ChordAPI.Models.DTOs;

/// <summary>
/// Request DTO for getting a voice channel token
/// </summary>
public class VoiceTokenRequestDto
{
    public Guid ChannelId { get; set; }
}

/// <summary>
/// Response DTO for voice token generation
/// </summary>
public class VoiceTokenResponseDto
{
    public string Token { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string RoomName { get; set; } = string.Empty;
}



