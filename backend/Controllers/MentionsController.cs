using ChordAPI.Models.DTOs;
using ChordAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ChordAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MentionsController : ControllerBase
{
    private readonly IMentionService _mentionService;
    private readonly ILogger<MentionsController> _logger;

    public MentionsController(IMentionService mentionService, ILogger<MentionsController> logger)
    {
        _mentionService = mentionService;
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
    /// Get all mentions for the current user
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<MessageMentionDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IEnumerable<MessageMentionDto>>> GetUserMentions([FromQuery] bool unreadOnly = false)
    {
        try
        {
            var userId = GetCurrentUserId();
            var mentions = await _mentionService.GetUserMentionsAsync(userId, unreadOnly);
            return Ok(mentions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user mentions");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Get unread mention count for the current user
    /// </summary>
    [HttpGet("unread-count")]
    [ProducesResponseType(typeof(int), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<int>> GetUnreadMentionCount()
    {
        try
        {
            var userId = GetCurrentUserId();
            var count = await _mentionService.GetUnreadMentionCountAsync(userId);
            return Ok(new { count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting unread mention count");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Mark a mention as read
    /// </summary>
    [HttpPatch("{id}/mark-read")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> MarkMentionAsRead(Guid id)
    {
        try
        {
            var userId = GetCurrentUserId();
            await _mentionService.MarkMentionAsReadAsync(id, userId);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking mention as read");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Mark all mentions as read for the current user (optionally filtered by guild)
    /// </summary>
    [HttpPatch("mark-all-read")]
    [ProducesResponseType(typeof(int), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<int>> MarkAllMentionsAsRead([FromQuery] Guid? guildId = null)
    {
        try
        {
            var userId = GetCurrentUserId();
            var count = await _mentionService.MarkAllMentionsAsReadAsync(userId, guildId);
            return Ok(new { count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking all mentions as read");
            return BadRequest(new { message = ex.Message });
        }
    }
}

