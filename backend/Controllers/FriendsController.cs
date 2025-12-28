using ChordAPI.Models.DTOs;
using ChordAPI.Services;
using ChordAPI.Hubs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace ChordAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class FriendsController : ControllerBase
{
    private readonly IFriendshipService _friendshipService;
    private readonly IHubContext<PresenceHub> _presenceHub;
    private readonly ILogger<FriendsController> _logger;

    public FriendsController(
        IFriendshipService friendshipService,
        IHubContext<PresenceHub> presenceHub,
        ILogger<FriendsController> logger)
    {
        _friendshipService = friendshipService;
        _presenceHub = presenceHub;
        _logger = logger;
    }

    /// <summary>
    /// Send a friend request by username
    /// </summary>
    [HttpPost("request")]
    public async Task<ActionResult<FriendshipResponseDto>> SendFriendRequest([FromBody] FriendshipRequestDto dto)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await _friendshipService.SendFriendRequestAsync(userId, dto.Username);

            // Notify the addressee via SignalR (will be implemented in PresenceHub)
            await _presenceHub.Clients.User(result.AddresseeId.ToString())
                .SendAsync("FriendRequestReceived", result);

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
    /// Get all accepted friends
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<FriendshipResponseDto>>> GetFriends()
    {
        try
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await _friendshipService.GetFriendsAsync(userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get friends for user {UserId}", User.FindFirstValue(ClaimTypes.NameIdentifier));
            return StatusCode(500, new { message = "Failed to retrieve friends" });
        }
    }

    /// <summary>
    /// Get all pending friend requests (both sent and received)
    /// </summary>
    [HttpGet("pending")]
    public async Task<ActionResult<List<FriendshipResponseDto>>> GetPendingRequests()
    {
        try
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await _friendshipService.GetPendingRequestsAsync(userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get pending requests for user {UserId}", User.FindFirstValue(ClaimTypes.NameIdentifier));
            return StatusCode(500, new { message = "Failed to retrieve pending requests" });
        }
    }

    /// <summary>
    /// Get all blocked users
    /// </summary>
    [HttpGet("blocked")]
    public async Task<ActionResult<List<FriendshipResponseDto>>> GetBlockedUsers()
    {
        try
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await _friendshipService.GetBlockedUsersAsync(userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get blocked users for user {UserId}", User.FindFirstValue(ClaimTypes.NameIdentifier));
            return StatusCode(500, new { message = "Failed to retrieve blocked users" });
        }
    }

    /// <summary>
    /// Accept a pending friend request
    /// </summary>
    [HttpPost("{id}/accept")]
    public async Task<ActionResult<FriendshipResponseDto>> AcceptRequest(Guid id)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await _friendshipService.AcceptRequestAsync(userId, id);

            // Notify the requester via SignalR
            await _presenceHub.Clients.User(result.RequesterId.ToString())
                .SendAsync("FriendRequestAccepted", result);

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
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Decline a pending friend request
    /// </summary>
    [HttpPost("{id}/decline")]
    public async Task<ActionResult> DeclineRequest(Guid id)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            await _friendshipService.DeclineRequestAsync(userId, id);
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
    /// Block a user
    /// </summary>
    [HttpPost("{userId}/block")]
    public async Task<ActionResult<FriendshipResponseDto>> BlockUser(Guid userId)
    {
        try
        {
            var currentUserId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            var result = await _friendshipService.BlockUserAsync(currentUserId, userId);
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
    /// Unblock a user
    /// </summary>
    [HttpDelete("{userId}/block")]
    public async Task<ActionResult> UnblockUser(Guid userId)
    {
        try
        {
            var currentUserId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            await _friendshipService.UnblockUserAsync(currentUserId, userId);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Remove a friend
    /// </summary>
    [HttpDelete("{friendId}")]
    public async Task<ActionResult> RemoveFriend(Guid friendId)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            await _friendshipService.RemoveFriendAsync(userId, friendId);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }
}

