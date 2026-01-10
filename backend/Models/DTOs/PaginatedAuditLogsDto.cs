namespace ChordAPI.Models.DTOs;

/// <summary>
/// DTO for paginated audit log responses
/// </summary>
public class PaginatedAuditLogsDto
{
    public IEnumerable<AuditLogDto> Logs { get; set; } = new List<AuditLogDto>();
    public int TotalCount { get; set; }
    public int PageSize { get; set; }
    public int CurrentPage { get; set; }
    public bool HasMore { get; set; }
}
