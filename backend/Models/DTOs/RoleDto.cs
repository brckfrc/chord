namespace ChordAPI.Models.DTOs;

/// <summary>
/// Response DTO for a role.
/// </summary>
public class RoleDto
{
    public Guid Id { get; set; }
    public Guid GuildId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Color { get; set; }
    public int Position { get; set; }
    public long Permissions { get; set; }
    public bool IsSystemRole { get; set; }
    public int MemberCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Request DTO for creating a new role.
/// </summary>
public class CreateRoleDto
{
    public string Name { get; set; } = string.Empty;
    public string? Color { get; set; }
    public long Permissions { get; set; }
}

/// <summary>
/// Request DTO for updating an existing role.
/// </summary>
public class UpdateRoleDto
{
    public string? Name { get; set; }
    public string? Color { get; set; }
    public long? Permissions { get; set; }
}

/// <summary>
/// Request DTO for reordering roles.
/// </summary>
public class ReorderRolesDto
{
    public List<Guid> RoleIds { get; set; } = new();
}



