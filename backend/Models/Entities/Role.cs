using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ChordAPI.Models.Entities;

/// <summary>
/// Represents a role within a guild that can be assigned to members.
/// Roles have positions (lower = higher priority) and permissions.
/// </summary>
public class Role
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid GuildId { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Hex color code for the role (e.g., "#FF5733")
    /// </summary>
    [MaxLength(7)]
    public string? Color { get; set; }

    /// <summary>
    /// Role position in the hierarchy. Lower number = higher priority.
    /// 0 is reserved for owner role, 999 for general role.
    /// Custom roles use positions 1-998.
    /// </summary>
    public int Position { get; set; }

    /// <summary>
    /// Bitfield of permissions granted by this role.
    /// </summary>
    public long Permissions { get; set; }

    /// <summary>
    /// System roles (owner, general) cannot be deleted or renamed.
    /// </summary>
    public bool IsSystemRole { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    [ForeignKey("GuildId")]
    public virtual Guild Guild { get; set; } = null!;

    public virtual ICollection<GuildMemberRole> MemberRoles { get; set; } = new List<GuildMemberRole>();

    // Helper constants for system role names
    public const string OwnerRoleName = "owner";
    public const string GeneralRoleName = "general";
    public const int OwnerPosition = 0;
    public const int GeneralPosition = 999;

    /// <summary>
    /// Default permissions for the general role.
    /// </summary>
    public static long DefaultGeneralPermissions =>
        (long)(GuildPermission.SendMessages |
               GuildPermission.ReadMessages |
               GuildPermission.AddReactions |
               GuildPermission.Connect |
               GuildPermission.Speak |
               GuildPermission.CreateInvite);

    /// <summary>
    /// Permissions for the owner role (full administrator access).
    /// </summary>
    public static long OwnerPermissions => (long)GuildPermission.Administrator;
}



