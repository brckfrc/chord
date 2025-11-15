namespace ChordAPI.Models.DTOs;

public class UnreadSummaryDto
{
    public List<UnreadCountDto> Channels { get; set; } = new();
    public int TotalUnreadCount { get; set; }
}

