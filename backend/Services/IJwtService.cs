using ChordAPI.Models.Entities;

namespace ChordAPI.Services;

public interface IJwtService
{
    string GenerateAccessToken(User user);
    string GenerateRefreshToken();
    Guid? ValidateToken(string token);
}

