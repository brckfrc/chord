using System.ComponentModel.DataAnnotations;

namespace ChordAPI.Models.Entities;

public enum ChannelType
{
    Text,
    Voice
}

public class Channel
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid GuildId { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public ChannelType Type { get; set; } = ChannelType.Text;

    [MaxLength(500)]
    public string? Topic { get; set; }

    public int Position { get; set; }

    public DateTime CreatedAt { get; set; }

    // Navigation properties
    public virtual Guild Guild { get; set; } = null!;
    public virtual ICollection<Message> Messages { get; set; } = new List<Message>();
}






