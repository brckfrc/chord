using ChordAPI.Models.DTOs;

namespace ChordAPI.Services;

public interface IAuthService
{
    Task<TokenResponseDto> RegisterAsync(RegisterDto dto);
    Task<TokenResponseDto> LoginAsync(LoginDto dto);
    Task<TokenResponseDto> RefreshTokenAsync(string refreshToken);
    Task<UserDto?> GetCurrentUserAsync(Guid userId);
}

