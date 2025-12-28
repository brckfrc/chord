using ChordAPI.Models.DTOs;

namespace ChordAPI.Services;

/// <summary>
/// Service for managing voice channel operations and LiveKit integration
/// </summary>
public interface IVoiceService
{
    /// <summary>
    /// Generate a LiveKit access token for a user to join a voice channel
    /// </summary>
    /// <param name="userId">User's ID</param>
    /// <param name="username">User's display name</param>
    /// <param name="channelId">Channel ID to join</param>
    /// <returns>VoiceTokenResponseDto containing the token and connection info</returns>
    Task<VoiceTokenResponseDto> GenerateTokenAsync(Guid userId, string username, Guid channelId);

    /// <summary>
    /// Check if a voice room is currently active
    /// </summary>
    /// <param name="channelId">Channel ID</param>
    /// <returns>True if room has active participants</returns>
    Task<bool> IsRoomActiveAsync(Guid channelId);

    /// <summary>
    /// Get the LiveKit room name for a channel
    /// </summary>
    /// <param name="channelId">Channel ID</param>
    /// <returns>Room name string</returns>
    string GetRoomName(Guid channelId);
}



