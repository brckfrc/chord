using AutoMapper;
using ChordAPI.Data;
using ChordAPI.Models.DTOs;
using ChordAPI.Models.Entities;
using ChordAPI.Services;
using ChordAPI.Hubs;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace ChordAPI.Tests.Services;

public class AuthServiceTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Mock<IJwtService> _jwtServiceMock;
    private readonly Mock<IMapper> _mapperMock;
    private readonly Mock<IHubContext<PresenceHub>> _presenceHubMock;
    private readonly Mock<ILogger<AuthService>> _loggerMock;
    private readonly AuthService _authService;

    public AuthServiceTests()
    {
        // Setup InMemory database
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);

        // Setup mocks
        _jwtServiceMock = new Mock<IJwtService>();
        _mapperMock = new Mock<IMapper>();
        _presenceHubMock = new Mock<IHubContext<PresenceHub>>();
        _loggerMock = new Mock<ILogger<AuthService>>();

        // Create service
        _authService = new AuthService(
            _context,
            _jwtServiceMock.Object,
            _mapperMock.Object,
            _presenceHubMock.Object,
            _loggerMock.Object
        );
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task RegisterAsync_ValidUser_ReturnsTokenResponse()
    {
        // Arrange
        var registerDto = new RegisterDto
        {
            Username = "testuser",
            Email = "test@example.com",
            Password = "Test123!@#",
            DisplayName = "Test User"
        };

        var expectedToken = "fake-jwt-token";
        var expectedRefreshToken = "fake-refresh-token";

        _jwtServiceMock
            .Setup(x => x.GenerateAccessToken(It.IsAny<User>()))
            .Returns(expectedToken);

        _jwtServiceMock
            .Setup(x => x.GenerateRefreshToken())
            .Returns(expectedRefreshToken);

        _mapperMock
            .Setup(x => x.Map<UserDto>(It.IsAny<User>()))
            .Returns(new UserDto
            {
                Id = Guid.NewGuid(),
                Username = registerDto.Username,
                Email = registerDto.Email,
                DisplayName = registerDto.DisplayName,
                CreatedAt = DateTime.UtcNow
            });

        // Act
        var result = await _authService.RegisterAsync(registerDto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(expectedToken, result.AccessToken);
        Assert.Equal(expectedRefreshToken, result.RefreshToken);
        Assert.NotNull(result.User);
        Assert.Equal(registerDto.Username, result.User.Username);
        Assert.Equal(registerDto.Email, result.User.Email);

        // Verify user was added to database
        var userInDb = await _context.Users
            .FirstOrDefaultAsync(u => u.Username == registerDto.Username);
        Assert.NotNull(userInDb);
        Assert.True(BCrypt.Net.BCrypt.Verify(registerDto.Password, userInDb.PasswordHash));
    }

    [Fact]
    public async Task RegisterAsync_DuplicateUsername_ThrowsInvalidOperationException()
    {
        // Arrange
        var existingUser = new User
        {
            Id = Guid.NewGuid(),
            Username = "existinguser",
            Email = "existing@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password"),
            DisplayName = "Existing User",
            CreatedAt = DateTime.UtcNow
        };
        _context.Users.Add(existingUser);
        await _context.SaveChangesAsync();

        var registerDto = new RegisterDto
        {
            Username = "existinguser", // Duplicate
            Email = "new@example.com",
            Password = "Test123!@#",
            DisplayName = "New User"
        };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _authService.RegisterAsync(registerDto)
        );
    }

    [Fact]
    public async Task RegisterAsync_DuplicateEmail_ThrowsInvalidOperationException()
    {
        // Arrange
        var existingUser = new User
        {
            Id = Guid.NewGuid(),
            Username = "existinguser",
            Email = "existing@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password"),
            DisplayName = "Existing User",
            CreatedAt = DateTime.UtcNow
        };
        _context.Users.Add(existingUser);
        await _context.SaveChangesAsync();

        var registerDto = new RegisterDto
        {
            Username = "newuser",
            Email = "existing@example.com", // Duplicate
            Password = "Test123!@#",
            DisplayName = "New User"
        };

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _authService.RegisterAsync(registerDto)
        );
    }

    [Fact]
    public async Task LoginAsync_ValidCredentials_ReturnsTokenResponse()
    {
        // Arrange
        var password = "Test123!@#";
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = "testuser",
            Email = "test@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            DisplayName = "Test User",
            CreatedAt = DateTime.UtcNow
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var loginDto = new LoginDto
        {
            EmailOrUsername = "testuser",
            Password = password
        };

        var expectedToken = "fake-jwt-token";
        var expectedRefreshToken = "fake-refresh-token";

        _jwtServiceMock
            .Setup(x => x.GenerateAccessToken(It.IsAny<User>()))
            .Returns(expectedToken);

        _jwtServiceMock
            .Setup(x => x.GenerateRefreshToken())
            .Returns(expectedRefreshToken);

        _mapperMock
            .Setup(x => x.Map<UserDto>(It.IsAny<User>()))
            .Returns(new UserDto
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                DisplayName = user.DisplayName,
                CreatedAt = user.CreatedAt
            });

        // Act
        var result = await _authService.LoginAsync(loginDto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(expectedToken, result.AccessToken);
        Assert.Equal(expectedRefreshToken, result.RefreshToken);
        Assert.NotNull(result.User);

        // Verify LastSeenAt was updated
        var updatedUser = await _context.Users.FindAsync(user.Id);
        Assert.NotNull(updatedUser!.LastSeenAt);
    }

    [Fact]
    public async Task LoginAsync_InvalidUsername_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var loginDto = new LoginDto
        {
            EmailOrUsername = "nonexistent",
            Password = "Test123!@#"
        };

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _authService.LoginAsync(loginDto)
        );
    }

    [Fact]
    public async Task LoginAsync_InvalidPassword_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = "testuser",
            Email = "test@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("CorrectPassword123!"),
            DisplayName = "Test User",
            CreatedAt = DateTime.UtcNow
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var loginDto = new LoginDto
        {
            EmailOrUsername = "testuser",
            Password = "WrongPassword123!" // Wrong password
        };

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _authService.LoginAsync(loginDto)
        );
    }

    [Fact]
    public async Task RefreshTokenAsync_ValidToken_ReturnsNewTokenResponse()
    {
        // Arrange
        var refreshToken = "valid-refresh-token";
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = "testuser",
            Email = "test@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password"),
            DisplayName = "Test User",
            RefreshToken = refreshToken,
            RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var expectedToken = "new-jwt-token";
        var expectedRefreshToken = "new-refresh-token";

        _jwtServiceMock
            .Setup(x => x.GenerateAccessToken(It.IsAny<User>()))
            .Returns(expectedToken);

        _jwtServiceMock
            .Setup(x => x.GenerateRefreshToken())
            .Returns(expectedRefreshToken);

        _mapperMock
            .Setup(x => x.Map<UserDto>(It.IsAny<User>()))
            .Returns(new UserDto
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                DisplayName = user.DisplayName,
                CreatedAt = user.CreatedAt
            });

        // Act
        var result = await _authService.RefreshTokenAsync(refreshToken);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(expectedToken, result.AccessToken);
        Assert.Equal(expectedRefreshToken, result.RefreshToken);

        // Verify refresh token was updated in database
        var updatedUser = await _context.Users.FindAsync(user.Id);
        Assert.Equal(expectedRefreshToken, updatedUser!.RefreshToken);
    }

    [Fact]
    public async Task RefreshTokenAsync_NullToken_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        string? nullToken = null;

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _authService.RefreshTokenAsync(nullToken!)
        );
    }

    [Fact]
    public async Task RefreshTokenAsync_EmptyToken_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var emptyToken = "";

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _authService.RefreshTokenAsync(emptyToken)
        );
    }

    [Fact]
    public async Task RefreshTokenAsync_InvalidToken_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var invalidToken = "invalid-token";

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _authService.RefreshTokenAsync(invalidToken)
        );
    }

    [Fact]
    public async Task RefreshTokenAsync_ExpiredToken_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var refreshToken = "expired-refresh-token";
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = "testuser",
            Email = "test@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password"),
            DisplayName = "Test User",
            RefreshToken = refreshToken,
            RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(-1), // Expired
            CreatedAt = DateTime.UtcNow
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _authService.RefreshTokenAsync(refreshToken)
        );
    }

    [Fact]
    public async Task GetCurrentUserAsync_ValidUserId_ReturnsUserDto()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            Username = "testuser",
            Email = "test@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password"),
            DisplayName = "Test User",
            CreatedAt = DateTime.UtcNow
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var expectedUserDto = new UserDto
        {
            Id = userId,
            Username = user.Username,
            Email = user.Email,
            DisplayName = user.DisplayName,
            CreatedAt = user.CreatedAt
        };

        _mapperMock
            .Setup(x => x.Map<UserDto>(It.IsAny<User>()))
            .Returns(expectedUserDto);

        // Act
        var result = await _authService.GetCurrentUserAsync(userId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(userId, result.Id);
        Assert.Equal(user.Username, result.Username);
        Assert.Equal(user.Email, result.Email);

        // Verify LastSeenAt was updated
        var updatedUser = await _context.Users.FindAsync(userId);
        Assert.NotNull(updatedUser!.LastSeenAt);
    }

    [Fact]
    public async Task GetCurrentUserAsync_InvalidUserId_ReturnsNull()
    {
        // Arrange
        var nonExistentUserId = Guid.NewGuid();

        // Act
        var result = await _authService.GetCurrentUserAsync(nonExistentUserId);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateStatusAsync_ValidUpdate_ReturnsUpdatedUserDto()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            Username = "testuser",
            Email = "test@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password"),
            DisplayName = "Test User",
            Status = UserStatus.Offline,
            CreatedAt = DateTime.UtcNow
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        var updateDto = new UpdateStatusDto
        {
            Status = UserStatus.Online,
            CustomStatus = "Working on tests"
        };

        // Mock SignalR hub clients
        var mockClients = new Mock<IHubClients>();
        var mockClientProxy = new Mock<IClientProxy>();
        mockClients.Setup(c => c.All).Returns(mockClientProxy.Object);
        _presenceHubMock.Setup(h => h.Clients).Returns(mockClients.Object);

        _mapperMock
            .Setup(x => x.Map<UserDto>(It.IsAny<User>()))
            .Returns(new UserDto
            {
                Id = userId,
                Username = user.Username,
                Email = user.Email,
                DisplayName = user.DisplayName,
                Status = updateDto.Status,
                CustomStatus = updateDto.CustomStatus,
                CreatedAt = user.CreatedAt
            });

        // Act
        var result = await _authService.UpdateStatusAsync(userId, updateDto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(updateDto.Status, result.Status);
        Assert.Equal(updateDto.CustomStatus, result.CustomStatus);

        // Verify database was updated
        var updatedUser = await _context.Users.FindAsync(userId);
        Assert.Equal(updateDto.Status, updatedUser!.Status);
        Assert.Equal(updateDto.CustomStatus, updatedUser.CustomStatus);
    }

    [Fact]
    public async Task UpdateStatusAsync_InvalidUserId_ThrowsKeyNotFoundException()
    {
        // Arrange
        var nonExistentUserId = Guid.NewGuid();
        var updateDto = new UpdateStatusDto
        {
            Status = UserStatus.Online,
            CustomStatus = "Test"
        };

        // Act & Assert
        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _authService.UpdateStatusAsync(nonExistentUserId, updateDto)
        );
    }

}

