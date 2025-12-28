using ChordAPI.Models.DTOs;
using ChordAPI.Services;
using ChordAPI.Hubs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace ChordAPI.Controllers;

[ApiController]
[Route("api/dms")]
[Authorize]
public class DMController : ControllerBase
{
    private readonly IDMChannelService _dmChannelService;
    private readonly IDirectMessageService _dmMessageService;
    private readonly IHubContext<ChatHub> _chatHub;
    private readonly ILogger<DMController> _logger;

    public DMController(
        IDMChannelService dmChannelService,
        IDirectMessageService dmMessageService,
        IHubContext<ChatHub> chatHub,
        ILogger<DMController> logger)
    {
        _dmChannelService = dmChannelService;
        _dmMessageService = dmMessageService;
        _chatHub = chatHub;
        _logger = logger;
    }

    /// <summary>
    /// Get all DM channels for the current user
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<DirectMessageChannelDto>>> GetUserDMs()
    {
        try
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await _dmChannelService.GetUserDMsAsync(userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get DMs for user {UserId}", User.FindFirstValue(ClaimTypes.NameIdentifier));
            return StatusCode(500, new { message = "Failed to retrieve DMs" });
        }
    }

    /// <summary>
    /// Get a specific DM channel by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<DirectMessageChannelDto>> GetDMById(Guid id)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await _dmChannelService.GetDMByIdAsync(userId, id);
            return Ok(result);
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
    /// Create or get a DM channel with a specific user
    /// </summary>
    [HttpPost("users/{userId}")]
    public async Task<ActionResult<DirectMessageChannelDto>> CreateOrGetDM(Guid userId)
    {
        try
        {
            var currentUserId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await _dmChannelService.GetOrCreateDMAsync(currentUserId, userId);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Get messages from a DM channel
    /// </summary>
    [HttpGet("{id}/messages")]
    public async Task<ActionResult<List<DirectMessageDto>>> GetDMMessages(
        Guid id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await _dmMessageService.GetMessagesAsync(userId, id, page, pageSize);
            return Ok(result);
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
    /// Send a message in a DM channel
    /// </summary>
    [HttpPost("{id}/messages")]
    public async Task<ActionResult<DirectMessageDto>> SendDMMessage(
        Guid id,
        [FromBody] SendDirectMessageDto dto)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await _dmMessageService.SendMessageAsync(userId, id, dto.Content);

            // Broadcast message to DM channel via SignalR (handled in ChatHub)
            await _chatHub.Clients.Group($"dm_{id}")
                .SendAsync("DMReceiveMessage", result);

            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Edit a direct message
    /// </summary>
    [HttpPut("{id}/messages/{messageId}")]
    public async Task<ActionResult<DirectMessageDto>> EditDMMessage(
        Guid id,
        Guid messageId,
        [FromBody] UpdateDirectMessageDto dto)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await _dmMessageService.EditMessageAsync(userId, messageId, dto.Content);

            // Broadcast edit to DM channel via SignalR
            await _chatHub.Clients.Group($"dm_{id}")
                .SendAsync("DMMessageEdited", result);

            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Delete a direct message
    /// </summary>
    [HttpDelete("{id}/messages/{messageId}")]
    public async Task<ActionResult> DeleteDMMessage(Guid id, Guid messageId)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            await _dmMessageService.DeleteMessageAsync(userId, messageId);

            // Broadcast deletion to DM channel via SignalR
            await _chatHub.Clients.Group($"dm_{id}")
                .SendAsync("DMMessageDeleted", new { messageId, channelId = id });

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

