using ChordAPI.Models.DTOs;
using ChordAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ChordAPI.Controllers;

[ApiController]
[Route("api/guilds/{guildId}/[controller]")]
[Authorize]
public class ChannelsController : ControllerBase
{
    private readonly IChannelService _channelService;
    private readonly ILogger<ChannelsController> _logger;

    public ChannelsController(IChannelService channelService, ILogger<ChannelsController> logger)
    {
        _channelService = channelService;
        _logger = logger;
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim))
        {
            throw new UnauthorizedAccessException("User not authenticated");
        }
        return Guid.Parse(userIdClaim);
    }

    /// <summary>
    /// Create a new channel in a guild (owner only)
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ChannelResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ChannelResponseDto>> CreateChannel(Guid guildId, [FromBody] CreateChannelDto dto)
    {
        try
        {
            var userId = GetCurrentUserId();
            var channel = await _channelService.CreateChannelAsync(guildId, userId, dto);
            return CreatedAtAction(nameof(GetChannelById), new { guildId, id = channel.Id }, channel);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating channel in guild {GuildId}", guildId);
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Get all channels in a guild
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<ChannelResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<IEnumerable<ChannelResponseDto>>> GetGuildChannels(Guid guildId)
    {
        try
        {
            var userId = GetCurrentUserId();
            var channels = await _channelService.GetGuildChannelsAsync(guildId, userId);
            return Ok(channels);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting channels for guild {GuildId}", guildId);
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Get channel details by ID
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(ChannelResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ChannelResponseDto>> GetChannelById(Guid guildId, Guid id)
    {
        try
        {
            var userId = GetCurrentUserId();
            var channel = await _channelService.GetChannelByIdAsync(id, userId);

            if (channel == null)
            {
                return NotFound(new { message = "Channel not found" });
            }

            // Verify channel belongs to the specified guild
            if (channel.GuildId != guildId)
            {
                return BadRequest(new { message = "Channel does not belong to this guild" });
            }

            return Ok(channel);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting channel {ChannelId}", id);
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Update channel (owner only)
    /// </summary>
    [HttpPut("{id}")]
    [ProducesResponseType(typeof(ChannelResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ChannelResponseDto>> UpdateChannel(Guid guildId, Guid id, [FromBody] UpdateChannelDto dto)
    {
        try
        {
            var userId = GetCurrentUserId();
            var channel = await _channelService.UpdateChannelAsync(id, userId, dto);

            // Verify channel belongs to the specified guild
            if (channel.GuildId != guildId)
            {
                return BadRequest(new { message = "Channel does not belong to this guild" });
            }

            return Ok(channel);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating channel {ChannelId}", id);
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Delete channel (owner only)
    /// </summary>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> DeleteChannel(Guid guildId, Guid id)
    {
        try
        {
            var userId = GetCurrentUserId();
            
            // First verify channel belongs to guild
            var channel = await _channelService.GetChannelByIdAsync(id, userId);
            if (channel == null)
            {
                return NotFound(new { message = "Channel not found" });
            }

            if (channel.GuildId != guildId)
            {
                return BadRequest(new { message = "Channel does not belong to this guild" });
            }

            await _channelService.DeleteChannelAsync(id, userId);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting channel {ChannelId}", id);
            return BadRequest(new { message = ex.Message });
        }
    }
}

