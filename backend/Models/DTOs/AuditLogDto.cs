using ChordAPI.Models.Entities;

namespace ChordAPI.Models.DTOs;

/// <summary>
/// DTO for audit log responses
/// </summary>
public class AuditLogDto
{
    public Guid Id { get; set; }
    public Guid? GuildId { get; set; }
    public Guid UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public AuditAction Action { get; set; }
    public string ActionName { get; set; } = string.Empty;
    public string TargetType { get; set; } = string.Empty;
    public Guid? TargetId { get; set; }
    public string? Changes { get; set; }
    public string? IpAddress { get; set; }
    public DateTime Timestamp { get; set; }
}
