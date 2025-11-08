using ChordAPI.Models.DTOs;
using ChordAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ChordAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class GuildsController : ControllerBase
{
    private readonly IGuildService _guildService;
    private readonly ILogger<GuildsController> _logger;

    public GuildsController(IGuildService guildService, ILogger<GuildsController> logger)
    {
        _guildService = guildService;
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
    /// Create a new guild
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(GuildResponseDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<GuildResponseDto>> CreateGuild([FromBody] CreateGuildDto dto)
    {
        try
        {
            var userId = GetCurrentUserId();
            var guild = await _guildService.CreateGuildAsync(userId, dto);
            return CreatedAtAction(nameof(GetGuildById), new { id = guild.Id }, guild);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating guild");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Get all guilds for the current user
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<GuildResponseDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<IEnumerable<GuildResponseDto>>> GetUserGuilds()
    {
        try
        {
            var userId = GetCurrentUserId();
            var guilds = await _guildService.GetUserGuildsAsync(userId);
            return Ok(guilds);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user guilds");
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Get guild details by ID
    /// </summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(GuildResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<GuildResponseDto>> GetGuildById(Guid id)
    {
        try
        {
            var userId = GetCurrentUserId();
            var guild = await _guildService.GetGuildByIdAsync(id, userId);
            
            if (guild == null)
            {
                return NotFound(new { message = "Guild not found" });
            }

            return Ok(guild);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting guild {GuildId}", id);
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Update guild (owner only)
    /// </summary>
    [HttpPut("{id}")]
    [ProducesResponseType(typeof(GuildResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<GuildResponseDto>> UpdateGuild(Guid id, [FromBody] UpdateGuildDto dto)
    {
        try
        {
            var userId = GetCurrentUserId();
            var guild = await _guildService.UpdateGuildAsync(id, userId, dto);
            return Ok(guild);
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
            _logger.LogError(ex, "Error updating guild {GuildId}", id);
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Delete guild (owner only)
    /// </summary>
    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> DeleteGuild(Guid id)
    {
        try
        {
            var userId = GetCurrentUserId();
            await _guildService.DeleteGuildAsync(id, userId);
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
            _logger.LogError(ex, "Error deleting guild {GuildId}", id);
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Add a member to the guild (owner only)
    /// </summary>
    [HttpPost("{id}/members")]
    [ProducesResponseType(typeof(GuildMemberDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<GuildMemberDto>> AddMember(Guid id, [FromBody] AddMemberDto dto)
    {
        try
        {
            var userId = GetCurrentUserId();
            var member = await _guildService.AddMemberAsync(id, userId, dto.UserId);
            return CreatedAtAction(nameof(GetGuildMembers), new { id }, member);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding member to guild {GuildId}", id);
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Remove a member from the guild (owner or self)
    /// </summary>
    [HttpDelete("{id}/members/{userId}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> RemoveMember(Guid id, Guid userId)
    {
        try
        {
            var requesterId = GetCurrentUserId();
            await _guildService.RemoveMemberAsync(id, requesterId, userId);
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
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing member from guild {GuildId}", id);
            return BadRequest(new { message = ex.Message });
        }
    }

    /// <summary>
    /// Get all members of a guild
    /// </summary>
    [HttpGet("{id}/members")]
    [ProducesResponseType(typeof(IEnumerable<GuildMemberDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<IEnumerable<GuildMemberDto>>> GetGuildMembers(Guid id)
    {
        try
        {
            var userId = GetCurrentUserId();
            var members = await _guildService.GetGuildMembersAsync(id, userId);
            return Ok(members);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting members for guild {GuildId}", id);
            return BadRequest(new { message = ex.Message });
        }
    }
}

// Helper DTO for adding members
public class AddMemberDto
{
    public Guid UserId { get; set; }
}


