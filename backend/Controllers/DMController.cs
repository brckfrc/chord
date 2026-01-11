using ChordAPI.Models.DTOs;
using ChordAPI.Services;
using ChordAPI.Hubs;
using ChordAPI.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace ChordAPI.Controllers;

[ApiController]
[Route("api/dms")]
[Authorize]
public class DMController : ControllerBase
{
    private readonly IDMChannelService _dmChannelService;
    private readonly IDirectMessageService _dmMessageService;
    private readonly IDMReadStateService _dmReadStateService;
    private readonly IHubContext<ChatHub> _chatHub;
    private readonly AppDbContext _context;
    private readonly ILogger<DMController> _logger;

    public DMController(
        IDMChannelService dmChannelService,
        IDirectMessageService dmMessageService,
        IDMReadStateService dmReadStateService,
        IHubContext<ChatHub> chatHub,
        AppDbContext context,
        ILogger<DMController> logger)
    {
        _dmChannelService = dmChannelService;
        _dmMessageService = dmMessageService;
        _dmReadStateService = dmReadStateService;
        _chatHub = chatHub;
        _context = context;
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

            // Get DM channel entity to find the other user's ID
            var dmChannel = await _context.DirectMessageChannels
                .FirstOrDefaultAsync(dmc => dmc.Id == id);

            if (dmChannel == null)
            {
                throw new KeyNotFoundException("DM channel not found");
            }

            var otherUserId = dmChannel.User1Id == userId ? dmChannel.User2Id : dmChannel.User1Id;

            // Broadcast message to both users via SignalR using Clients.User()
            // Send to sender (userId) and receiver (otherUserId)
            await _chatHub.Clients.User(userId.ToString())
                .SendAsync("DMReceiveMessage", result);
            await _chatHub.Clients.User(otherUserId.ToString())
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

    /// <summary>
    /// Mark a DM channel as read (update last read position)
    /// </summary>
    [HttpPost("{id}/mark-read")]
    public async Task<IActionResult> MarkDMAsRead(
        Guid id,
        [FromQuery] Guid? messageId = null)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            await _dmReadStateService.MarkDMAsReadAsync(id, userId, messageId);

            // Get DM channel entity to find the other user's ID
            var dmChannel = await _context.DirectMessageChannels
                .FirstOrDefaultAsync(dmc => dmc.Id == id);

            if (dmChannel != null)
            {
                var otherUserId = dmChannel.User1Id == userId ? dmChannel.User2Id : dmChannel.User1Id;

                // Get unread count for the current user (who marked it as read) - should be 0 after marking
                var currentUserUnreadInfo = await _dmReadStateService.GetDMUnreadCountAsync(id, userId);

                // Notify the current user about their own unread count change (for real-time UI update)
                await _chatHub.Clients.User(userId.ToString())
                    .SendAsync("DMMarkAsRead", new
                    {
                        dmChannelId = id,
                        lastReadMessageId = messageId,
                        unreadCount = currentUserUnreadInfo.UnreadCount
                    });

                // Also notify the other user (so they know this user has read the messages)
                // Get their unread count (which doesn't change, but we send it for consistency)
                var otherUserUnreadInfo = await _dmReadStateService.GetDMUnreadCountAsync(id, otherUserId);
                await _chatHub.Clients.User(otherUserId.ToString())
                    .SendAsync("DMMarkAsRead", new
                    {
                        dmChannelId = id,
                        lastReadMessageId = messageId,
                        unreadCount = otherUserUnreadInfo.UnreadCount
                    });
            }

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

