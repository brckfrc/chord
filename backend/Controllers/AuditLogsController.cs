using System.Security.Claims;
using ChordAPI.Models.DTOs;
using ChordAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChordAPI.Controllers;

[ApiController]
[Route("api/guilds/{guildId}/audit-logs")]
[Authorize]
public class AuditLogsController : ControllerBase
{
    private readonly IAuditLogService _auditLogService;
    private readonly ILogger<AuditLogsController> _logger;

    public AuditLogsController(
        IAuditLogService auditLogService,
        ILogger<AuditLogsController> logger)
    {
        _auditLogService = auditLogService;
        _logger = logger;
    }

    /// <summary>
    /// Get audit logs for a guild (owner only)
    /// </summary>
    /// <param name="guildId">Guild ID</param>
    /// <param name="limit">Maximum number of logs to return (default: 50, max: 100)</param>
    /// <param name="page">Page number (1-indexed)</param>
    /// <returns>Paginated audit logs</returns>
    [HttpGet]
    public async Task<ActionResult<PaginatedAuditLogsDto>> GetGuildAuditLogs(
        Guid guildId,
        [FromQuery] int limit = 50,
        [FromQuery] int page = 1)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;

            if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid token" });
            }

            // Validate pagination parameters
            if (limit < 1 || limit > 100)
            {
                return BadRequest("Limit must be between 1 and 100");
            }

            if (page < 1)
            {
                return BadRequest("Page must be at least 1");
            }

            var logs = await _auditLogService.GetGuildAuditLogsAsync(guildId, userId, limit, page);
            return Ok(logs);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching audit logs for guild {GuildId}", guildId);
            return StatusCode(500, "Internal server error");
        }
    }
}
