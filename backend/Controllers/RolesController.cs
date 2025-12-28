using ChordAPI.Models.DTOs;
using ChordAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ChordAPI.Controllers;

[ApiController]
[Route("api/guilds/{guildId}/roles")]
[Authorize]
public class RolesController : ControllerBase
{
    private readonly IRoleService _roleService;
    private readonly IGuildService _guildService;
    private readonly ILogger<RolesController> _logger;

    public RolesController(
        IRoleService roleService,
        IGuildService guildService,
        ILogger<RolesController> logger)
    {
        _roleService = roleService;
        _guildService = guildService;
        _logger = logger;
    }

    private Guid GetUserId()
    {
        return Guid.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }

    /// <summary>
    /// Gets all roles for a guild.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(List<RoleDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetGuildRoles(Guid guildId)
    {
        try
        {
            var userId = GetUserId();

            // Verify user is a member of the guild
            var guild = await _guildService.GetGuildByIdAsync(guildId, userId);
            if (guild == null)
            {
                return NotFound("Guild not found");
            }

            var roles = await _roleService.GetGuildRolesAsync(guildId);
            return Ok(roles);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }

    /// <summary>
    /// Creates a new role in a guild.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(RoleDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> CreateRole(Guid guildId, [FromBody] CreateRoleDto dto)
    {
        try
        {
            var userId = GetUserId();
            var role = await _roleService.CreateRoleAsync(guildId, userId, dto);
            return CreatedAtAction(nameof(GetRole), new { guildId, roleId = role.Id }, role);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Gets a specific role.
    /// </summary>
    [HttpGet("{roleId}")]
    [ProducesResponseType(typeof(RoleDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetRole(Guid guildId, Guid roleId)
    {
        var role = await _roleService.GetRoleByIdAsync(roleId);
        if (role == null || role.GuildId != guildId)
        {
            return NotFound("Role not found");
        }

        return Ok(role);
    }

    /// <summary>
    /// Updates a role.
    /// </summary>
    [HttpPut("{roleId}")]
    [ProducesResponseType(typeof(RoleDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateRole(Guid guildId, Guid roleId, [FromBody] UpdateRoleDto dto)
    {
        try
        {
            var userId = GetUserId();

            // Verify role belongs to this guild
            var existingRole = await _roleService.GetRoleByIdAsync(roleId);
            if (existingRole == null || existingRole.GuildId != guildId)
            {
                return NotFound("Role not found");
            }

            var role = await _roleService.UpdateRoleAsync(roleId, userId, dto);
            return Ok(role);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Deletes a role.
    /// </summary>
    [HttpDelete("{roleId}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteRole(Guid guildId, Guid roleId)
    {
        try
        {
            var userId = GetUserId();

            // Verify role belongs to this guild
            var existingRole = await _roleService.GetRoleByIdAsync(roleId);
            if (existingRole == null || existingRole.GuildId != guildId)
            {
                return NotFound("Role not found");
            }

            await _roleService.DeleteRoleAsync(roleId, userId);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Reorders roles within a guild.
    /// </summary>
    [HttpPut("reorder")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> ReorderRoles(Guid guildId, [FromBody] ReorderRolesDto dto)
    {
        try
        {
            var userId = GetUserId();
            await _roleService.ReorderRolesAsync(guildId, userId, dto.RoleIds);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Assigns a role to a member.
    /// </summary>
    [HttpPost("~/api/guilds/{guildId}/members/{userId}/roles/{roleId}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AssignRole(Guid guildId, Guid userId, Guid roleId)
    {
        try
        {
            var requesterId = GetUserId();
            await _roleService.AssignRoleToMemberAsync(guildId, userId, roleId, requesterId);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Removes a role from a member.
    /// </summary>
    [HttpDelete("~/api/guilds/{guildId}/members/{userId}/roles/{roleId}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RemoveRole(Guid guildId, Guid userId, Guid roleId)
    {
        try
        {
            var requesterId = GetUserId();
            await _roleService.RemoveRoleFromMemberAsync(guildId, userId, roleId, requesterId);
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Gets all roles for a specific member.
    /// </summary>
    [HttpGet("~/api/guilds/{guildId}/members/{userId}/roles")]
    [ProducesResponseType(typeof(List<RoleDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMemberRoles(Guid guildId, Guid userId)
    {
        try
        {
            var requesterId = GetUserId();

            // Verify requester is a member of the guild
            var guild = await _guildService.GetGuildByIdAsync(guildId, requesterId);
            if (guild == null)
            {
                return NotFound("Guild not found");
            }

            var roles = await _roleService.GetMemberRolesAsync(guildId, userId);
            return Ok(roles);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
    }
}



