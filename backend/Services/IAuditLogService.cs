using ChordAPI.Models.DTOs;
using ChordAPI.Models.Entities;

namespace ChordAPI.Services;

/// <summary>
/// Service for managing audit log operations
/// </summary>
public interface IAuditLogService
{
    /// <summary>
    /// Log an action to the audit log
    /// </summary>
    Task LogActionAsync(
        Guid userId,
        AuditAction action,
        string targetType,
        Guid? targetId = null,
        object? changes = null,
        Guid? guildId = null,
        string? ipAddress = null,
        string? userAgent = null);

    /// <summary>
    /// Get audit logs for a specific guild
    /// </summary>
    /// <param name="guildId">Guild ID</param>
    /// <param name="requesterId">User requesting the logs</param>
    /// <param name="limit">Maximum number of logs to return</param>
    /// <param name="page">Page number (1-indexed)</param>
    /// <returns>Paginated audit logs</returns>
    Task<PaginatedAuditLogsDto> GetGuildAuditLogsAsync(
        Guid guildId,
        Guid requesterId,
        int limit = 50,
        int page = 1);
}
