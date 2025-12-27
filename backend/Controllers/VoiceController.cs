using ChordAPI.Models.DTOs;
using ChordAPI.Models.Entities;
using ChordAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ChordAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class VoiceController : ControllerBase
{
    private readonly IVoiceService _voiceService;
    private readonly IChannelService _channelService;
    private readonly ILogger<VoiceController> _logger;

    public VoiceController(
        IVoiceService voiceService,
        IChannelService channelService,
        ILogger<VoiceController> logger)
    {
        _voiceService = voiceService;
        _channelService = channelService;
        _logger = logger;
    }

    private Guid GetUserId()
    {
        return Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }

    private string GetUsername()
    {
        return User.FindFirstValue(ClaimTypes.Name)
            ?? User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.UniqueName)
            ?? "Unknown";
    }

    /// <summary>
    /// Get a LiveKit token for joining a voice channel
    /// </summary>
    /// <param name="dto">Channel ID to join</param>
    /// <returns>Token and connection information</returns>
    [HttpPost("token")]
    [ProducesResponseType(typeof(VoiceTokenResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<VoiceTokenResponseDto>> GetVoiceToken([FromBody] VoiceTokenRequestDto dto)
    {
        var userId = GetUserId();
        var username = GetUsername();

        try
        {
            // Verify channel exists and user has access
            var channel = await _channelService.GetChannelByIdAsync(dto.ChannelId, userId);
            
            if (channel == null)
            {
                return NotFound(new { message = "Channel not found" });
            }

            // Check if it's a voice channel
            if (channel.Type != ChannelType.Voice)
            {
                return BadRequest(new { message = "This is not a voice channel" });
            }

            // Generate token
            var token = await _voiceService.GenerateTokenAsync(userId, username, dto.ChannelId);

            _logger.LogInformation(
                "User {UserId} requested voice token for channel {ChannelId}",
                userId, dto.ChannelId);

            return Ok(token);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate voice token for user {UserId}", userId);
            return StatusCode(500, new { message = "Failed to generate voice token" });
        }
    }

    /// <summary>
    /// Get voice room status (for debugging)
    /// </summary>
    /// <param name="channelId">Channel ID</param>
    /// <returns>Room status</returns>
    [HttpGet("room/{channelId}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> GetRoomStatus(Guid channelId)
    {
        var userId = GetUserId();

        try
        {
            // Verify channel exists and user has access
            var channel = await _channelService.GetChannelByIdAsync(channelId, userId);
            
            if (channel == null)
            {
                return NotFound(new { message = "Channel not found" });
            }

            var isActive = await _voiceService.IsRoomActiveAsync(channelId);
            var roomName = _voiceService.GetRoomName(channelId);

            return Ok(new
            {
                channelId,
                roomName,
                isActive
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get room status for channel {ChannelId}", channelId);
            return StatusCode(500, new { message = "Failed to get room status" });
        }
    }
}

