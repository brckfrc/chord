using ChordAPI.Models.DTOs;
using Microsoft.AspNetCore.Http;
using Minio;
using Minio.DataModel.Args;

namespace ChordAPI.Services;

/// <summary>
/// MinIO-based storage service implementation
/// </summary>
public class StorageService : IStorageService
{
    private readonly IMinioClient _minioClient;
    private readonly ILogger<StorageService> _logger;
    private readonly string _bucketName;
    private readonly string _publicEndpoint;

    // File size limits
    private const long MaxFileSizeBytes = 25 * 1024 * 1024; // 25MB
    private const int MaxVideoDurationSeconds = 120; // 2 minutes

    // Allowed MIME types
    private static readonly HashSet<string> AllowedImageTypes = new()
    {
        "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"
    };

    private static readonly HashSet<string> AllowedVideoTypes = new()
    {
        "video/mp4", "video/webm", "video/quicktime"
    };

    private static readonly HashSet<string> AllowedDocumentTypes = new()
    {
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain",
        "text/csv",
        "application/zip",
        "application/x-rar-compressed"
    };

    public StorageService(IMinioClient minioClient, IConfiguration configuration, ILogger<StorageService> logger)
    {
        _minioClient = minioClient;
        _logger = logger;
        _bucketName = configuration["Minio:BucketName"] ?? "chord-uploads";
        _publicEndpoint = configuration["Minio:PublicEndpoint"] ?? "http://localhost:9000";
    }

    public async Task<UploadResponseDto> UploadFileAsync(IFormFile file, Guid userId)
    {
        // Validate file size
        if (file.Length > MaxFileSizeBytes)
        {
            throw new ArgumentException($"File size exceeds maximum limit of {MaxFileSizeBytes / (1024 * 1024)}MB");
        }

        // Validate and determine file type
        var mimeType = file.ContentType.ToLowerInvariant();
        var fileType = DetermineFileType(mimeType);

        if (string.IsNullOrEmpty(fileType))
        {
            throw new ArgumentException($"File type '{mimeType}' is not supported");
        }

        // Ensure bucket exists
        await EnsureBucketExistsAsync();

        // Generate unique file path
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var objectName = $"{userId}/{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}{extension}";

        // Upload to MinIO
        using var stream = file.OpenReadStream();
        var putObjectArgs = new PutObjectArgs()
            .WithBucket(_bucketName)
            .WithObject(objectName)
            .WithStreamData(stream)
            .WithObjectSize(file.Length)
            .WithContentType(mimeType);

        await _minioClient.PutObjectAsync(putObjectArgs);

        _logger.LogInformation("File uploaded: {ObjectName} by user {UserId}", objectName, userId);

        // Build public URL
        var url = $"{_publicEndpoint}/{_bucketName}/{objectName}";

        return new UploadResponseDto
        {
            Url = url,
            Type = fileType,
            Size = file.Length,
            Name = file.FileName,
            MimeType = mimeType,
            Duration = null // Video duration extraction can be added later
        };
    }

    public async Task DeleteFileAsync(string fileUrl)
    {
        try
        {
            var objectName = ExtractObjectNameFromUrl(fileUrl);
            if (string.IsNullOrEmpty(objectName))
            {
                _logger.LogWarning("Could not extract object name from URL: {FileUrl}", fileUrl);
                return;
            }

            var removeObjectArgs = new RemoveObjectArgs()
                .WithBucket(_bucketName)
                .WithObject(objectName);

            await _minioClient.RemoveObjectAsync(removeObjectArgs);
            _logger.LogInformation("File deleted: {ObjectName}", objectName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting file: {FileUrl}", fileUrl);
            throw;
        }
    }

    public async Task<string> GeneratePresignedUrlAsync(string fileUrl, int expiryMinutes = 60)
    {
        var objectName = ExtractObjectNameFromUrl(fileUrl);
        if (string.IsNullOrEmpty(objectName))
        {
            throw new ArgumentException("Invalid file URL");
        }

        var presignedGetObjectArgs = new PresignedGetObjectArgs()
            .WithBucket(_bucketName)
            .WithObject(objectName)
            .WithExpiry(expiryMinutes * 60);

        var presignedUrl = await _minioClient.PresignedGetObjectAsync(presignedGetObjectArgs);
        return presignedUrl;
    }

    private string? DetermineFileType(string mimeType)
    {
        if (AllowedImageTypes.Contains(mimeType))
            return "image";
        if (AllowedVideoTypes.Contains(mimeType))
            return "video";
        if (AllowedDocumentTypes.Contains(mimeType))
            return "document";
        return null;
    }

    private async Task EnsureBucketExistsAsync()
    {
        var bucketExistsArgs = new BucketExistsArgs().WithBucket(_bucketName);
        var exists = await _minioClient.BucketExistsAsync(bucketExistsArgs);

        if (!exists)
        {
            var makeBucketArgs = new MakeBucketArgs().WithBucket(_bucketName);
            await _minioClient.MakeBucketAsync(makeBucketArgs);

            // Set bucket policy for public read access
            var policy = $@"{{
                ""Version"": ""2012-10-17"",
                ""Statement"": [
                    {{
                        ""Effect"": ""Allow"",
                        ""Principal"": {{""AWS"": [""*""]}},
                        ""Action"": [""s3:GetObject""],
                        ""Resource"": [""arn:aws:s3:::{_bucketName}/*""]
                    }}
                ]
            }}";

            var setPolicyArgs = new SetPolicyArgs()
                .WithBucket(_bucketName)
                .WithPolicy(policy);

            await _minioClient.SetPolicyAsync(setPolicyArgs);
            _logger.LogInformation("Created bucket: {BucketName} with public read policy", _bucketName);
        }
    }

    private string? ExtractObjectNameFromUrl(string fileUrl)
    {
        // URL format: http://localhost:9000/chord-uploads/userId/timestamp-guid.ext
        var bucketPath = $"/{_bucketName}/";
        var index = fileUrl.IndexOf(bucketPath);
        if (index < 0) return null;

        return fileUrl.Substring(index + bucketPath.Length);
    }
}

