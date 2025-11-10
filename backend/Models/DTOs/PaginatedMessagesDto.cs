namespace ChordAPI.Models.DTOs;

/// <summary>
/// DTO for paginated message responses
/// </summary>
public class PaginatedMessagesDto
{
    public IEnumerable<MessageResponseDto> Messages { get; set; } = new List<MessageResponseDto>();
    public int TotalCount { get; set; }
    public int PageSize { get; set; }
    public int CurrentPage { get; set; }
    public bool HasMore { get; set; }
}

