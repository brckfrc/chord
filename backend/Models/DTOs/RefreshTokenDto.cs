using System.ComponentModel.DataAnnotations;

namespace ChordAPI.Models.DTOs;

public class RefreshTokenDto
{
    [Required(ErrorMessage = "Refresh token is required")]
    public string RefreshToken { get; set; } = string.Empty;
}

