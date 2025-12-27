namespace ChordAPI.Models.DTOs;

/// <summary>
/// DTO for message attachments
/// </summary>
public class AttachmentDto
{
    /// <summary>
    /// URL of the attachment
    /// </summary>
    public string Url { get; set; } = string.Empty;

    /// <summary>
    /// Type of the attachment: "image", "video", "document"
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
}


