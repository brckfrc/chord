using AutoMapper;
using ChordAPI.Data;
using ChordAPI.Models.DTOs;
using ChordAPI.Models.Entities;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ChordAPI.Hubs;

namespace ChordAPI.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly IJwtService _jwtService;
    private readonly IMapper _mapper;
    private readonly IHubContext<PresenceHub> _presenceHub;
    private readonly ILogger<AuthService> _logger;

    public AuthService(
        AppDbContext context,
        IJwtService jwtService,
        IMapper mapper,
        IHubContext<PresenceHub> presenceHub,
        ILogger<AuthService> logger)
    {
        _context = context;
        _jwtService = jwtService;
        _mapper = mapper;
        _presenceHub = presenceHub;
        _logger = logger;
    }

    public async Task<TokenResponseDto> RegisterAsync(RegisterDto dto)
    {
        // Check if username already exists
        if (await _context.Users.AnyAsync(u => u.Username.ToLower() == dto.Username.ToLower()))
        {
            throw new InvalidOperationException("Username already exists");
        }

        // Check if email already exists
        if (await _context.Users.AnyAsync(u => u.Email.ToLower() == dto.Email.ToLower()))
        {
            throw new InvalidOperationException("Email already exists");
        }

        // Hash password
        var passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

        // Create user
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = dto.Username,
            Email = dto.Email.ToLower(),
            PasswordHash = passwordHash,
            DisplayName = dto.DisplayName ?? dto.Username,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        _logger.LogInformation("New user registered: {Username} ({UserId})", user.Username, user.Id);

        // Generate tokens
        return await GenerateTokenResponseAsync(user);
    }

    public async Task<TokenResponseDto> LoginAsync(LoginDto dto)
    {
        // Find user by email or username
        var user = await _context.Users
            .FirstOrDefaultAsync(u => 
                u.Email.ToLower() == dto.EmailOrUsername.ToLower() || 
                u.Username.ToLower() == dto.EmailOrUsername.ToLower());

        if (user == null)
        {
            throw new UnauthorizedAccessException("Invalid credentials");
        }

        // Verify password
        if (!BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Invalid credentials");
        }

        // Update last seen
        user.LastSeenAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        _logger.LogInformation("User logged in: {Username} ({UserId})", user.Username, user.Id);

        // Generate tokens
        return await GenerateTokenResponseAsync(user);
    }

    public async Task<TokenResponseDto> RefreshTokenAsync(string refreshToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            throw new UnauthorizedAccessException("Invalid refresh token");
        }

        // Find user with this refresh token
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.RefreshToken == refreshToken);

        if (user == null)
        {
            throw new UnauthorizedAccessException("Invalid refresh token");
        }

        // Check if refresh token is expired
        if (user.RefreshTokenExpiresAt == null || user.RefreshTokenExpiresAt < DateTime.UtcNow)
        {
            throw new UnauthorizedAccessException("Refresh token expired");
        }

        _logger.LogInformation("Token refreshed for user: {Username} ({UserId})", user.Username, user.Id);

        // Generate new tokens
        return await GenerateTokenResponseAsync(user);
    }

    public async Task<UserDto?> GetCurrentUserAsync(Guid userId)
    {
        var user = await _context.Users.FindAsync(userId);
        
        if (user == null)
        {
            return null;
        }

        // Update last seen
        user.LastSeenAt = DateTime.UtcNow;
        
        // If status is Offline, set to Online (user is accessing the app)
        // Otherwise, keep the current status (Online, Idle, DoNotDisturb, or Invisible)
        // This preserves user's previous status choice (Idle, DND, etc.) when reconnecting
        if (user.Status == UserStatus.Offline)
        {
            user.Status = UserStatus.Online;
        }
        // If status is already Online, Idle, DoNotDisturb, or Invisible, keep it as is
        
        await _context.SaveChangesAsync();

        return _mapper.Map<UserDto>(user);
    }

    public async Task<UserDto> UpdateStatusAsync(Guid userId, UpdateStatusDto dto)
    {
        var user = await _context.Users.FindAsync(userId);
        
        if (user == null)
        {
            throw new KeyNotFoundException("User not found");
        }

        user.Status = dto.Status;
        user.CustomStatus = dto.CustomStatus;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        _logger.LogInformation("User {UserId} updated status to {Status} with custom status: {CustomStatus}",
            userId, dto.Status, dto.CustomStatus);

        // Broadcast status change via SignalR
        await _presenceHub.Clients.All.SendAsync("UserStatusChanged", new
        {
            userId = userId.ToString(),
            status = (int)dto.Status,
            customStatus = dto.CustomStatus
        });

        return _mapper.Map<UserDto>(user);
    }

    private async Task<TokenResponseDto> GenerateTokenResponseAsync(User user)
    {
        var accessToken = _jwtService.GenerateAccessToken(user);
        var refreshToken = _jwtService.GenerateRefreshToken();

        var expiryMinutes = int.Parse(Environment.GetEnvironmentVariable("JWT_EXPIRY_MINUTES") ?? "60");
        var refreshExpiryDays = int.Parse(Environment.GetEnvironmentVariable("JWT_REFRESH_TOKEN_EXPIRY_DAYS") ?? "7");

        // Save refresh token to database
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(refreshExpiryDays);
        await _context.SaveChangesAsync();

        return new TokenResponseDto
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            ExpiresAt = DateTime.UtcNow.AddMinutes(expiryMinutes),
            User = _mapper.Map<UserDto>(user)
        };
    }
}

