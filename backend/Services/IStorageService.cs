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

    /// <summary>
    /// Uploads raw bytes to storage with a specific object name
    /// </summary>
    /// <param name="data">Byte array to upload</param>
    /// <param name="objectName">Object name/path in storage</param>
    /// <param name="contentType">MIME type of the content</param>
    /// <returns>Public URL of the uploaded file</returns>
    Task<string> UploadBytesAsync(byte[] data, string objectName, string contentType);
}

