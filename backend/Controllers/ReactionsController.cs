using ChordAPI.Models.DTOs;
using ChordAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ChordAPI.Controllers;

[ApiController]
[Route("api/messages/{messageId}/[controller]")]
[Authorize]
public class ReactionsController : ControllerBase
{
    private readonly IReactionService _reactionService;
    private readonly ILogger<ReactionsController> _logger;

    public ReactionsController(IReactionService reactionService, ILogger<ReactionsController> logger)
    {
        _reactionService = reactionService;
        _logger = logger;
    }

    /// <summary>
    /// Get all reactions for a message, grouped by emoji
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<ReactionsGroupedDto>>> GetMessageReactions(Guid messageId)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var reactions = await _reactionService.GetMessageReactionsAsync(messageId, userId);
            return Ok(reactions);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    /// <summary>
    /// Add a reaction to a message
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ReactionResponseDto>> AddReaction(
        Guid messageId,
        [FromBody] AddReactionDto dto)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var reaction = await _reactionService.AddReactionAsync(messageId, userId, dto);
            return CreatedAtAction(
                nameof(GetMessageReactions),
                new { messageId = messageId },
                reaction);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }

    /// <summary>
    /// Remove a reaction from a message
    /// </summary>
    [HttpDelete("{emoji}")]
    public async Task<IActionResult> RemoveReaction(Guid messageId, string emoji)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            await _reactionService.RemoveReactionAsync(messageId, userId, emoji);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
    }
}

