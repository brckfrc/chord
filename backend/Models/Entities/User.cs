using System.ComponentModel.DataAnnotations;

namespace ChordAPI.Models.Entities;

public class User
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string Username { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? DisplayName { get; set; }

    [MaxLength(500)]
    public string? AvatarUrl { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastSeenAt { get; set; }

    // User status
    public UserStatus Status { get; set; } = UserStatus.Offline;
    
    /// <summary>
    /// Custom status message (e.g., "Playing games", "Working on project")
    /// </summary>
    [MaxLength(100)]
    public string? CustomStatus { get; set; }

    // Refresh token management
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpiresAt { get; set; }

    // Navigation properties
    public virtual ICollection<GuildMember> GuildMemberships { get; set; } = new List<GuildMember>();
    public virtual ICollection<Message> Messages { get; set; } = new List<Message>();
}






