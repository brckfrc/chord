namespace ChordAPI.Models.DTOs;

/// <summary>
/// DTO for file upload responses
/// </summary>
public class UploadResponseDto
{
    /// <summary>
    /// URL of the uploaded file
    /// </summary>
    public string Url { get; set; } = string.Empty;

    /// <summary>
    /// Type of the file: "image", "video", "document"
    /// </summary>
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// File size in bytes
    /// </summary>
    public long Size { get; set; }

    /// <summary>
    /// Original filename
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Duration in seconds (for video files only)
    /// </summary>
    public int? Duration { get; set; }

    /// <summary>
    /// MIME type of the file
    /// </summary>
    public string MimeType { get; set; } = string.Empty;
}

