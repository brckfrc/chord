using ChordAPI.Models.DTOs;
using ChordAPI.Services;
using ChordAPI.Hubs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace ChordAPI.Controllers;

[ApiController]
[Route("api/channels/{channelId}/[controller]")]
[Authorize]
public class MessagesController : ControllerBase
{
    private readonly IMessageService _messageService;
    private readonly IReadStateService _readStateService;
    private readonly IHubContext<ChatHub> _hubContext;
    private readonly ILogger<MessagesController> _logger;

    public MessagesController(
        IMessageService messageService,
        IReadStateService readStateService,
        IHubContext<ChatHub> hubContext,
        ILogger<MessagesController> logger)
    {
        _messageService = messageService;
        _readStateService = readStateService;
        _hubContext = hubContext;
        _logger = logger;
    }

    /// <summary>
    /// Get paginated messages from a channel
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<PaginatedMessagesDto>> GetChannelMessages(
        Guid channelId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await _messageService.GetChannelMessagesAsync(channelId, userId, page, pageSize);
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
    /// Get a specific message by ID
    /// </summary>
    [HttpGet("{messageId}")]
    public async Task<ActionResult<MessageResponseDto>> GetMessage(Guid channelId, Guid messageId)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var message = await _messageService.GetMessageByIdAsync(messageId, userId);
            return Ok(message);
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
    /// Create a new message in a channel
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<MessageResponseDto>> CreateMessage(
        Guid channelId,
        [FromBody] CreateMessageDto dto)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var message = await _messageService.CreateMessageAsync(channelId, userId, dto);

            // Auto-mark channel as read for the sender (optional feature)
            try
            {
                await _readStateService.MarkChannelAsReadAsync(channelId, userId, message.Id);
            }
            catch (Exception ex)
            {
                // Log but don't fail the message send if read state update fails
                _logger.LogWarning(ex, "Failed to auto-update read state for user {UserId} in channel {ChannelId}",
                    userId, channelId);
            }

            // Broadcast to all users in the channel via SignalR
            await _hubContext.Clients.Group(channelId.ToString()).SendAsync("ReceiveMessage", message);

            _logger.LogInformation("User {UserId} sent message {MessageId} to channel {ChannelId} via REST API",
                userId, message.Id, channelId);

            return CreatedAtAction(
                nameof(GetMessage),
                new { channelId = channelId, messageId = message.Id },
                message);
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
    /// Update an existing message
    /// </summary>
    [HttpPut("{messageId}")]
    public async Task<ActionResult<MessageResponseDto>> UpdateMessage(
        Guid channelId,
        Guid messageId,
        [FromBody] UpdateMessageDto dto)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var message = await _messageService.UpdateMessageAsync(messageId, userId, dto);

            // Broadcast edit to all users in the channel via SignalR
            await _hubContext.Clients.Group(channelId.ToString()).SendAsync("MessageEdited", message);

            _logger.LogInformation("User {UserId} edited message {MessageId} in channel {ChannelId} via REST API",
                userId, messageId, channelId);

            return Ok(message);
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
    /// Delete a message (soft delete)
    /// </summary>
    [HttpDelete("{messageId}")]
    public async Task<IActionResult> DeleteMessage(Guid channelId, Guid messageId)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            await _messageService.DeleteMessageAsync(messageId, userId);

            // Broadcast deletion to all users in the channel via SignalR
            await _hubContext.Clients.Group(channelId.ToString()).SendAsync("MessageDeleted", messageId.ToString());

            _logger.LogInformation("User {UserId} deleted message {MessageId} in channel {ChannelId} via REST API",
                userId, messageId, channelId);

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
    /// Pin a message in a channel (guild owner only)
    /// </summary>
    [HttpPost("{messageId}/pin")]
    public async Task<ActionResult<MessageResponseDto>> PinMessage(Guid channelId, Guid messageId)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var message = await _messageService.PinMessageAsync(channelId, messageId, userId);
            return Ok(message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Unpin a message from a channel (guild owner only)
    /// </summary>
    [HttpDelete("{messageId}/pin")]
    public async Task<IActionResult> UnpinMessage(Guid channelId, Guid messageId)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            await _messageService.UnpinMessageAsync(channelId, messageId, userId);
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
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Get all pinned messages in a channel
    /// </summary>
    [HttpGet("pins")]
    public async Task<ActionResult<List<MessageResponseDto>>> GetPinnedMessages(Guid channelId)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var pinnedMessages = await _messageService.GetPinnedMessagesAsync(channelId, userId);
            return Ok(pinnedMessages);
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
    /// Mark a channel as read (update last read position)
    /// </summary>
    [HttpPost("mark-read")]
    public async Task<IActionResult> MarkChannelAsRead(
        Guid channelId,
        [FromQuery] Guid? messageId = null)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            await _readStateService.MarkChannelAsReadAsync(channelId, userId, messageId);
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
    /// Get unread message count for a channel
    /// </summary>
    [HttpGet("unread-count")]
    public async Task<ActionResult<UnreadCountDto>> GetUnreadCount(Guid channelId)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var unreadCount = await _readStateService.GetUnreadCountAsync(channelId, userId);
            return Ok(unreadCount);
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
    /// Get the last read message ID for a channel (for "jump to unread" feature)
    /// </summary>
    [HttpGet("last-read")]
    public async Task<ActionResult<object>> GetLastReadMessage(Guid channelId)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var unreadInfo = await _readStateService.GetUnreadCountAsync(channelId, userId);
            
            return Ok(new
            {
                channelId = channelId,
                lastReadMessageId = unreadInfo.LastReadMessageId,
                unreadCount = unreadInfo.UnreadCount
            });
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

