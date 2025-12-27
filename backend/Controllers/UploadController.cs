using ChordAPI.Data;
using ChordAPI.Models.DTOs;
using ChordAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace ChordAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UploadController : ControllerBase
{
    private readonly IStorageService _storageService;
    private readonly IImageService _imageService;
    private readonly AppDbContext _context;
    private readonly ILogger<UploadController> _logger;

    private const int MaxAvatarSizeBytes = 8 * 1024 * 1024; // 8MB

    public UploadController(
        IStorageService storageService,
        IImageService imageService,
        AppDbContext context,
        ILogger<UploadController> logger)
    {
        _storageService = storageService;
        _imageService = imageService;
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Upload a file (image, video, or document)
    /// </summary>
    /// <param name="file">The file to upload (max 25MB, videos max 2 minutes)</param>
    /// <returns>Upload response with file metadata and URL</returns>
    [HttpPost]
    [ProducesResponseType(typeof(UploadResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status413PayloadTooLarge)]
    [RequestSizeLimit(26_214_400)] // 25MB + some buffer
    public async Task<ActionResult<UploadResponseDto>> UploadFile(IFormFile file)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;

            if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid token" });
            }

            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file provided" });
            }

            var result = await _storageService.UploadFileAsync(file, userId);

            _logger.LogInformation(
                "File uploaded successfully: {FileName} ({Size} bytes) by user {UserId}",
                file.FileName,
                file.Length,
                userId
            );

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "File upload validation failed");
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading file");
            return StatusCode(500, new { message = "An error occurred while uploading the file" });
        }
    }

    /// <summary>
    /// Delete an uploaded file
    /// </summary>
    /// <param name="fileUrl">URL of the file to delete</param>
    [HttpDelete]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> DeleteFile([FromQuery] string fileUrl)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;

            if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid token" });
            }

            if (string.IsNullOrEmpty(fileUrl))
            {
                return BadRequest(new { message = "File URL is required" });
            }

            // Verify the file belongs to the user (URL contains userId)
            if (!fileUrl.Contains(userId.ToString()))
            {
                return Unauthorized(new { message = "You can only delete your own files" });
            }

            await _storageService.DeleteFileAsync(fileUrl);

            _logger.LogInformation("File deleted: {FileUrl} by user {UserId}", fileUrl, userId);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting file: {FileUrl}", fileUrl);
            return StatusCode(500, new { message = "An error occurred while deleting the file" });
        }
    }

    /// <summary>
    /// Upload user avatar
    /// </summary>
    /// <param name="file">Image file (jpg, png, gif, webp - max 8MB)</param>
    /// <returns>Avatar URL</returns>
    [HttpPost("avatar")]
    [ProducesResponseType(typeof(AvatarUploadResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [RequestSizeLimit(MaxAvatarSizeBytes + 1024)]
    public async Task<ActionResult<AvatarUploadResponseDto>> UploadAvatar(IFormFile file)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;

            if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid token" });
            }

            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file provided" });
            }

            if (file.Length > MaxAvatarSizeBytes)
            {
                return BadRequest(new { message = "File size exceeds 8MB limit" });
            }

            if (!_imageService.IsValidImageFormat(file.ContentType))
            {
                return BadRequest(new { message = "Invalid image format. Supported: jpg, png, gif, webp" });
            }

            // Process image (resize, crop, convert to WebP)
            using var inputStream = file.OpenReadStream();
            var processedImage = await _imageService.ProcessAvatarAsync(inputStream);

            // Upload to MinIO
            var objectName = $"avatars/{userId}.webp";
            var avatarUrl = await _storageService.UploadBytesAsync(processedImage, objectName, "image/webp");

            // Update user's avatar URL in database
            var user = await _context.Users.FindAsync(userId);
            if (user != null)
            {
                user.AvatarUrl = avatarUrl;
                await _context.SaveChangesAsync();
            }

            _logger.LogInformation("Avatar uploaded for user {UserId}", userId);

            return Ok(new AvatarUploadResponseDto { AvatarUrl = avatarUrl });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading avatar");
            return StatusCode(500, new { message = "An error occurred while uploading the avatar" });
        }
    }

    /// <summary>
    /// Upload guild icon
    /// </summary>
    /// <param name="guildId">Guild ID</param>
    /// <param name="file">Image file (jpg, png, gif, webp - max 8MB)</param>
    /// <returns>Icon URL</returns>
    [HttpPost("guild/{guildId}/icon")]
    [ProducesResponseType(typeof(AvatarUploadResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [RequestSizeLimit(MaxAvatarSizeBytes + 1024)]
    public async Task<ActionResult<AvatarUploadResponseDto>> UploadGuildIcon(Guid guildId, IFormFile file)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;

            if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "Invalid token" });
            }

            // Check if guild exists
            var guild = await _context.Guilds.FindAsync(guildId);
            if (guild == null)
            {
                return NotFound(new { message = "Guild not found" });
            }

            // Check if user is owner or has ManageGuild permission
            if (guild.OwnerId != userId)
            {
                // TODO: Add permission check for ManageGuild
                return Forbid();
            }

            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file provided" });
            }

            if (file.Length > MaxAvatarSizeBytes)
            {
                return BadRequest(new { message = "File size exceeds 8MB limit" });
            }

            if (!_imageService.IsValidImageFormat(file.ContentType))
            {
                return BadRequest(new { message = "Invalid image format. Supported: jpg, png, gif, webp" });
            }

            // Process image (resize, crop, convert to WebP)
            using var inputStream = file.OpenReadStream();
            var processedImage = await _imageService.ProcessAvatarAsync(inputStream);

            // Upload to MinIO
            var objectName = $"guilds/{guildId}/icon.webp";
            var iconUrl = await _storageService.UploadBytesAsync(processedImage, objectName, "image/webp");

            // Update guild's icon URL in database
            guild.IconUrl = iconUrl;
            guild.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Icon uploaded for guild {GuildId} by user {UserId}", guildId, userId);

            return Ok(new AvatarUploadResponseDto { AvatarUrl = iconUrl });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error uploading guild icon for {GuildId}", guildId);
            return StatusCode(500, new { message = "An error occurred while uploading the icon" });
        }
    }
}

