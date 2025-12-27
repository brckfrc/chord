using ChordAPI.Models.DTOs;
using ChordAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace ChordAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UploadController : ControllerBase
{
    private readonly IStorageService _storageService;
    private readonly ILogger<UploadController> _logger;

    public UploadController(IStorageService storageService, ILogger<UploadController> logger)
    {
        _storageService = storageService;
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
}

