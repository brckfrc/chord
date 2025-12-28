using ChordAPI.Models.DTOs;
using ChordAPI.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace ChordAPI.Tests.Services;

public class VoiceServiceTests
{
    private readonly Mock<IConfiguration> _configMock;
    private readonly Mock<ILogger<VoiceService>> _loggerMock;
    private readonly VoiceService _voiceService;

    public VoiceServiceTests()
    {
        _configMock = new Mock<IConfiguration>();
        _loggerMock = new Mock<ILogger<VoiceService>>();

        // Setup configuration
        // API secret must be at least 256 bits (32 bytes) for LiveKit
        _configMock.Setup(c => c["LiveKit:ApiKey"]).Returns("testkey");
        _configMock.Setup(c => c["LiveKit:ApiSecret"]).Returns("testsecret_this_is_definitely_more_than_32_characters_long");
        _configMock.Setup(c => c["LiveKit:Url"]).Returns("ws://localhost:7880");

        _voiceService = new VoiceService(_configMock.Object, _loggerMock.Object);
    }

    [Fact]
    public async Task GenerateTokenAsync_ValidInput_ReturnsToken()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var username = "testuser";
        var channelId = Guid.NewGuid();

        // Act
        var result = await _voiceService.GenerateTokenAsync(userId, username, channelId);

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.Token);
        Assert.NotEmpty(result.Token);
        Assert.Equal("ws://localhost:7880", result.Url);
        Assert.Equal($"voice_{channelId}", result.RoomName);
    }

    [Fact]
    public async Task GenerateTokenAsync_CreatesValidJWT()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var username = "testuser";
        var channelId = Guid.NewGuid();

        // Act
        var result = await _voiceService.GenerateTokenAsync(userId, username, channelId);

        // Assert
        // JWT tokens have 3 parts separated by dots
        var parts = result.Token.Split('.');
        Assert.Equal(3, parts.Length);
        
        // Each part should be non-empty
        Assert.All(parts, part => Assert.NotEmpty(part));
    }

    [Fact]
    public async Task GenerateTokenAsync_DifferentUsers_GeneratesDifferentTokens()
    {
        // Arrange
        var userId1 = Guid.NewGuid();
        var userId2 = Guid.NewGuid();
        var channelId = Guid.NewGuid();

        // Act
        var result1 = await _voiceService.GenerateTokenAsync(userId1, "user1", channelId);
        var result2 = await _voiceService.GenerateTokenAsync(userId2, "user2", channelId);

        // Assert
        Assert.NotEqual(result1.Token, result2.Token);
        Assert.Equal(result1.RoomName, result2.RoomName); // Same room
    }

    [Fact]
    public async Task GenerateTokenAsync_DifferentChannels_GeneratesDifferentRooms()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var channelId1 = Guid.NewGuid();
        var channelId2 = Guid.NewGuid();

        // Act
        var result1 = await _voiceService.GenerateTokenAsync(userId, "user", channelId1);
        var result2 = await _voiceService.GenerateTokenAsync(userId, "user", channelId2);

        // Assert
        Assert.NotEqual(result1.RoomName, result2.RoomName);
        Assert.Equal($"voice_{channelId1}", result1.RoomName);
        Assert.Equal($"voice_{channelId2}", result2.RoomName);
    }

    [Fact]
    public void GetRoomName_ChannelId_ReturnsFormattedName()
    {
        // Arrange
        var channelId = Guid.NewGuid();

        // Act
        var result = _voiceService.GetRoomName(channelId);

        // Assert
        Assert.Equal($"voice_{channelId}", result);
    }

    [Fact]
    public void GetRoomName_DifferentChannelIds_ReturnsDifferentNames()
    {
        // Arrange
        var channelId1 = Guid.NewGuid();
        var channelId2 = Guid.NewGuid();

        // Act
        var result1 = _voiceService.GetRoomName(channelId1);
        var result2 = _voiceService.GetRoomName(channelId2);

        // Assert
        Assert.NotEqual(result1, result2);
    }

    [Fact]
    public async Task IsRoomActiveAsync_CurrentlyReturnsFalse()
    {
        // Arrange
        var channelId = Guid.NewGuid();

        // Act
        var result = await _voiceService.IsRoomActiveAsync(channelId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task GenerateTokenAsync_UsesConfigurationValues()
    {
        // Arrange
        var configMock = new Mock<IConfiguration>();
        var loggerMock = new Mock<ILogger<VoiceService>>();
        
        configMock.Setup(c => c["LiveKit:ApiKey"]).Returns("customkey");
        configMock.Setup(c => c["LiveKit:ApiSecret"]).Returns("customsecret_this_is_definitely_more_than_32_characters");
        configMock.Setup(c => c["LiveKit:Url"]).Returns("wss://custom.livekit.cloud");
        
        var service = new VoiceService(configMock.Object, loggerMock.Object);
        
        var userId = Guid.NewGuid();
        var channelId = Guid.NewGuid();

        // Act
        var result = await service.GenerateTokenAsync(userId, "testuser", channelId);

        // Assert
        Assert.Equal("wss://custom.livekit.cloud", result.Url);
        Assert.NotNull(result.Token);
    }
}
