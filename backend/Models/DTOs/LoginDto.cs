using System.ComponentModel.DataAnnotations;

namespace ChordAPI.Models.DTOs;

public class LoginDto
{
    [Required(ErrorMessage = "Email or username is required")]
    public string EmailOrUsername { get; set; } = string.Empty;

    [Required(ErrorMessage = "Password is required")]
    public string Password { get; set; } = string.Empty;
}

