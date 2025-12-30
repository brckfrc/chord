using ChordAPI.Models.DTOs;
using Livekit.Server.Sdk.Dotnet;

namespace ChordAPI.Services;

/// <summary>
/// Service for managing voice channel operations and LiveKit integration
/// </summary>
public class VoiceService : IVoiceService
{
    private readonly string _apiKey;
    private readonly string _apiSecret;
    private readonly string _liveKitUrl;
    private readonly string _liveKitPublicUrl;
    private readonly ILogger<VoiceService> _logger;

    public VoiceService(IConfiguration configuration, ILogger<VoiceService> logger)
    {
        _apiKey = configuration["LiveKit:ApiKey"] ?? "devkey";
        _apiSecret = configuration["LiveKit:ApiSecret"] ?? "secret";
        _liveKitUrl = configuration["LiveKit:Url"] ?? "ws://localhost:7880";
        // Public URL for frontend (should be the reverse proxy path)
        _liveKitPublicUrl = configuration["LiveKit:PublicUrl"] ?? _liveKitUrl;
        _logger = logger;
    }

    /// <inheritdoc />
    public Task<VoiceTokenResponseDto> GenerateTokenAsync(Guid userId, string username, Guid channelId)
    {
        var roomName = GetRoomName(channelId);

        try
        {
            // Create access token with grants
            var token = new AccessToken(_apiKey, _apiSecret)
                .WithIdentity(userId.ToString())
                .WithName(username)
                .WithGrants(new VideoGrants
                {
                    RoomJoin = true,
                    Room = roomName,
                    CanPublish = true,
                    CanSubscribe = true,
                    CanPublishData = true
                })
                .WithTtl(TimeSpan.FromHours(24)); // Token valid for 24 hours

            var jwt = token.ToJwt();

            _logger.LogInformation(
                "Generated LiveKit token for user {UserId} ({Username}) in room {RoomName}",
                userId, username, roomName);

            return Task.FromResult(new VoiceTokenResponseDto
            {
                Token = jwt,
                Url = _liveKitPublicUrl, // Use public URL for frontend
                RoomName = roomName
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate LiveKit token for user {UserId}", userId);
            throw new InvalidOperationException("Failed to generate voice token", ex);
        }
    }

    /// <inheritdoc />
    public Task<bool> IsRoomActiveAsync(Guid channelId)
    {
        // TODO: Query LiveKit API to check if room has participants
        // For now, return false - frontend will track room state
        return Task.FromResult(false);
    }

    /// <inheritdoc />
    public string GetRoomName(Guid channelId)
    {
        return $"voice_{channelId}";
    }
}



