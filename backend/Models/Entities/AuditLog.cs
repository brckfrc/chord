using System.ComponentModel.DataAnnotations;

namespace ChordAPI.Models.Entities;

/// <summary>
/// Audit log entry for tracking important system events
/// </summary>
public class AuditLog
{
    [Key]
    public Guid Id { get; set; }

    /// <summary>
    /// Guild ID if the action is guild-scoped, null for global actions
    /// </summary>
    public Guid? GuildId { get; set; }

    /// <summary>
    /// User who performed the action
    /// </summary>
    [Required]
    public Guid UserId { get; set; }

    /// <summary>
    /// Type of action performed
    /// </summary>
    [Required]
    public AuditAction Action { get; set; }

    /// <summary>
    /// Type of target entity (User, Guild, Channel, Message, etc.)
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string TargetType { get; set; } = string.Empty;

    /// <summary>
    /// ID of the target entity
    /// </summary>
    public Guid? TargetId { get; set; }

    /// <summary>
    /// JSON-serialized changes (for update actions)
    /// </summary>
    public string? Changes { get; set; }

    /// <summary>
    /// IP address of the user
    /// </summary>
    [MaxLength(45)]
    public string? IpAddress { get; set; }

    /// <summary>
    /// User agent string
    /// </summary>
    [MaxLength(500)]
    public string? UserAgent { get; set; }

    /// <summary>
    /// When the action occurred
    /// </summary>
    [Required]
    public DateTime Timestamp { get; set; }

    // Navigation properties
    public virtual User User { get; set; } = null!;
    public virtual Guild? Guild { get; set; }
}
