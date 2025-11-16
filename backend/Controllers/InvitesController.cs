using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using ChordAPI.Models.DTOs;
using ChordAPI.Services;

namespace ChordAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InvitesController : ControllerBase
{
    private readonly IInviteService _inviteService;
    private readonly ILogger<InvitesController> _logger;

    public InvitesController(IInviteService inviteService, ILogger<InvitesController> logger)
    {
        _inviteService = inviteService;
        _logger = logger;
    }

    private Guid GetUserId()
    {
        return Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }

    /// <summary>
    /// Create a new invite for a guild
    /// </summary>
    [HttpPost("guilds/{guildId}")]
    public async Task<ActionResult<InviteResponseDto>> CreateInvite(Guid guildId, [FromBody] CreateInviteDto dto)
    {
        try
        {
            var userId = GetUserId();
            var invite = await _inviteService.CreateInviteAsync(guildId, userId, dto);
            return Ok(invite);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating invite for guild {GuildId}", guildId);
            return StatusCode(500, "An error occurred while creating the invite");
        }
    }

    /// <summary>
    /// Get invite information by code (public endpoint - no auth required)
    /// </summary>
    [HttpGet("{code}")]
    [AllowAnonymous]
    public async Task<ActionResult<InviteInfoDto>> GetInviteByCode(string code)
    {
        try
        {
            var invite = await _inviteService.GetInviteByCodeAsync(code);
            return Ok(invite);
        }
        catch (KeyNotFoundException)
        {
            return NotFound("Invite not found");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting invite by code {Code}", code);
            return StatusCode(500, "An error occurred while getting the invite");
        }
    }

    /// <summary>
    /// Accept an invite and join the guild
    /// </summary>
    [HttpPost("{code}/accept")]
    public async Task<ActionResult<GuildResponseDto>> AcceptInvite(string code)
    {
        try
        {
            var userId = GetUserId();
            var guild = await _inviteService.AcceptInviteAsync(code, userId);
            return Ok(guild);
        }
        catch (KeyNotFoundException)
        {
            return NotFound("Invite not found");
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error accepting invite {Code}", code);
            return StatusCode(500, "An error occurred while accepting the invite");
        }
    }

    /// <summary>
    /// Get all invites for a guild
    /// </summary>
    [HttpGet("guilds/{guildId}")]
    public async Task<ActionResult<IEnumerable<InviteResponseDto>>> GetGuildInvites(Guid guildId)
    {
        try
        {
            var userId = GetUserId();
            var invites = await _inviteService.GetGuildInvitesAsync(guildId, userId);
            return Ok(invites);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting invites for guild {GuildId}", guildId);
            return StatusCode(500, "An error occurred while getting the invites");
        }
    }

    /// <summary>
    /// Revoke an invite
    /// </summary>
    [HttpDelete("{inviteId}")]
    public async Task<ActionResult> RevokeInvite(Guid inviteId)
    {
        try
        {
            var userId = GetUserId();
            await _inviteService.RevokeInviteAsync(inviteId, userId);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound("Invite not found");
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error revoking invite {InviteId}", inviteId);
            return StatusCode(500, "An error occurred while revoking the invite");
        }
    }
}

