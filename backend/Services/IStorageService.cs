using ChordAPI.Models.DTOs;
using Microsoft.AspNetCore.Http;

namespace ChordAPI.Services;

/// <summary>
/// Interface for file storage operations
/// </summary>
public interface IStorageService
{
    /// <summary>
    /// Uploads a file to storage
    /// </summary>
    /// <param name="file">The file to upload</param>
    /// <param name="userId">ID of the user uploading the file</param>
    /// <returns>Upload response with file metadata</returns>
    Task<UploadResponseDto> UploadFileAsync(IFormFile file, Guid userId);

    /// <summary>
    /// Deletes a file from storage
    /// </summary>
    /// <param name="fileUrl">URL of the file to delete</param>
    Task DeleteFileAsync(string fileUrl);

    /// <summary>
    /// Generates a presigned URL for temporary access
    /// </summary>
    /// <param name="fileUrl">URL of the file</param>
    /// <param name="expiryMinutes">Expiry time in minutes (default: 60)</param>
    /// <returns>Presigned URL</returns>
    Task<string> GeneratePresignedUrlAsync(string fileUrl, int expiryMinutes = 60);
}

