using AutoMapper;
using ChordAPI.Data;
using ChordAPI.Models.DTOs;
using ChordAPI.Models.Entities;
using ChordAPI.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace ChordAPI.Tests.Services;

public class ChannelServiceTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Mock<IMapper> _mapperMock;
    private readonly Mock<ILogger<ChannelService>> _loggerMock;
    private readonly Mock<IPermissionService> _permissionServiceMock;
    private readonly ChannelService _channelService;

    public ChannelServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);

        _mapperMock = new Mock<IMapper>();
        _loggerMock = new Mock<ILogger<ChannelService>>();
        _permissionServiceMock = new Mock<IPermissionService>();

        _channelService = new ChannelService(
            _context,
            _mapperMock.Object,
            _loggerMock.Object,
            _permissionServiceMock.Object
        );
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task CreateChannelAsync_ValidTextChannel_CreatesChannel()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var guildId = Guid.NewGuid();
        var guild = new Guild
        {
            Id = guildId,
            Name = "Test Guild",
            OwnerId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Guilds.Add(guild);
        await _context.SaveChangesAsync();

        var createDto = new CreateChannelDto
        {
            Name = "general",
            Type = ChannelType.Text,
            Topic = "General discussion"
        };

        _permissionServiceMock
            .Setup(x => x.CheckPermissionAsync(guildId, userId, GuildPermission.ManageChannels, It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        _mapperMock
            .Setup(x => x.Map<ChannelResponseDto>(It.IsAny<Channel>()))
            .Returns((Channel c) => new ChannelResponseDto
            {
                Id = c.Id,
                GuildId = c.GuildId,
                Name = c.Name,
                Type = c.Type,
                Topic = c.Topic,
                Position = c.Position,
                CreatedAt = c.CreatedAt
            });

        // Act
        var result = await _channelService.CreateChannelAsync(guildId, userId, createDto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("general", result.Name);
        Assert.Equal(ChannelType.Text, result.Type);
        Assert.Equal(0, result.Position); // First channel
        Assert.Equal(1, _context.Channels.Count());
    }

    [Fact]
    public async Task CreateChannelAsync_Unauthorized_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var guildId = Guid.NewGuid();
        var guild = new Guild
        {
            Id = guildId,
            Name = "Test Guild",
            OwnerId = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Guilds.Add(guild);
        await _context.SaveChangesAsync();

        var createDto = new CreateChannelDto
        {
            Name = "general",
            Type = ChannelType.Text
        };

        _permissionServiceMock
            .Setup(x => x.CheckPermissionAsync(guildId, userId, GuildPermission.ManageChannels, It.IsAny<string>()))
            .ThrowsAsync(new UnauthorizedAccessException("You don't have permission to create channels"));

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _channelService.CreateChannelAsync(guildId, userId, createDto)
        );
    }

    [Fact]
    public async Task GetGuildChannelsAsync_GuildWithChannels_ReturnsChannelList()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var guildId = Guid.NewGuid();

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

        var guild = new Guild
        {
            Id = guildId,
            Name = "Test Guild",
            OwnerId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Guilds.Add(guild);

        _context.GuildMembers.Add(new GuildMember
        {
            GuildId = guildId,
            UserId = userId,
            JoinedAt = DateTime.UtcNow
        });

        var channel1 = new Channel
        {
            Id = Guid.NewGuid(),
            GuildId = guildId,
            Name = "general",
            Type = ChannelType.Text,
            Position = 0,
            CreatedAt = DateTime.UtcNow
        };
        var channel2 = new Channel
        {
            Id = Guid.NewGuid(),
            GuildId = guildId,
            Name = "random",
            Type = ChannelType.Text,
            Position = 1,
            CreatedAt = DateTime.UtcNow
        };
        _context.Channels.AddRange(channel1, channel2);
        await _context.SaveChangesAsync();

        _mapperMock
            .Setup(x => x.Map<IEnumerable<ChannelResponseDto>>(It.IsAny<IEnumerable<Channel>>()))
            .Returns((IEnumerable<Channel> channels) => channels.Select(c => new ChannelResponseDto
            {
                Id = c.Id,
                GuildId = c.GuildId,
                Name = c.Name,
                Type = c.Type,
                Position = c.Position,
                CreatedAt = c.CreatedAt
            }));

        // Act
        var result = await _channelService.GetGuildChannelsAsync(guildId, userId);

        // Assert
        Assert.NotNull(result);
        var channels = result.ToList();
        Assert.Equal(2, channels.Count);
        Assert.Contains(channels, c => c.Name == "general");
        Assert.Contains(channels, c => c.Name == "random");
    }

    [Fact]
    public async Task GetGuildChannelsAsync_UnauthorizedUser_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var unauthorizedUserId = Guid.NewGuid();
        var guildId = Guid.NewGuid();

        var guild = new Guild
        {
            Id = guildId,
            Name = "Test Guild",
            OwnerId = ownerId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Guilds.Add(guild);
        _context.GuildMembers.Add(new GuildMember
        {
            GuildId = guildId,
            UserId = ownerId,
            JoinedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _channelService.GetGuildChannelsAsync(guildId, unauthorizedUserId)
        );
    }

    [Fact]
    public async Task GetChannelByIdAsync_ExistingChannel_ReturnsChannel()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var guildId = Guid.NewGuid();
        var channelId = Guid.NewGuid();

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

        var guild = new Guild
        {
            Id = guildId,
            Name = "Test Guild",
            OwnerId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Guilds.Add(guild);

        _context.GuildMembers.Add(new GuildMember
        {
            GuildId = guildId,
            UserId = userId,
            JoinedAt = DateTime.UtcNow
        });

        var channel = new Channel
        {
            Id = channelId,
            GuildId = guildId,
            Name = "general",
            Type = ChannelType.Text,
            Position = 0,
            CreatedAt = DateTime.UtcNow
        };
        _context.Channels.Add(channel);
        await _context.SaveChangesAsync();

        _mapperMock
            .Setup(x => x.Map<ChannelResponseDto>(It.IsAny<Channel>()))
            .Returns((Channel c) => new ChannelResponseDto
            {
                Id = c.Id,
                GuildId = c.GuildId,
                Name = c.Name,
                Type = c.Type,
                Position = c.Position,
                CreatedAt = c.CreatedAt
            });

        // Act
        var result = await _channelService.GetChannelByIdAsync(channelId, userId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(channelId, result.Id);
        Assert.Equal("general", result.Name);
    }

    [Fact]
    public async Task GetChannelByIdAsync_NonExistentChannel_ReturnsNull()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var nonExistentChannelId = Guid.NewGuid();

        // Act
        var result = await _channelService.GetChannelByIdAsync(nonExistentChannelId, userId);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task UpdateChannelAsync_ValidUpdate_UpdatesChannel()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var guildId = Guid.NewGuid();
        var channelId = Guid.NewGuid();

        var guild = new Guild
        {
            Id = guildId,
            Name = "Test Guild",
            OwnerId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Guilds.Add(guild);

        var channel = new Channel
        {
            Id = channelId,
            GuildId = guildId,
            Name = "Old Name",
            Type = ChannelType.Text,
            Topic = "Old Topic",
            Position = 0,
            CreatedAt = DateTime.UtcNow
        };
        _context.Channels.Add(channel);
        await _context.SaveChangesAsync();

        var updateDto = new UpdateChannelDto
        {
            Name = "New Name",
            Topic = "New Topic",
            Position = 0
        };

        _permissionServiceMock
            .Setup(x => x.CheckPermissionAsync(guildId, userId, GuildPermission.ManageChannels, It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        _mapperMock
            .Setup(x => x.Map<ChannelResponseDto>(It.IsAny<Channel>()))
            .Returns((Channel c) => new ChannelResponseDto
            {
                Id = c.Id,
                GuildId = c.GuildId,
                Name = c.Name,
                Type = c.Type,
                Topic = c.Topic,
                Position = c.Position,
                CreatedAt = c.CreatedAt
            });

        // Act
        var result = await _channelService.UpdateChannelAsync(channelId, userId, updateDto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("New Name", result.Name);
        Assert.Equal("New Topic", result.Topic);

        var updatedChannel = await _context.Channels.FindAsync(channelId);
        Assert.Equal("New Name", updatedChannel!.Name);
    }

    [Fact]
    public async Task UpdateChannelAsync_Unauthorized_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var guildId = Guid.NewGuid();
        var channelId = Guid.NewGuid();

        var guild = new Guild
        {
            Id = guildId,
            Name = "Test Guild",
            OwnerId = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Guilds.Add(guild);

        var channel = new Channel
        {
            Id = channelId,
            GuildId = guildId,
            Name = "general",
            Type = ChannelType.Text,
            Position = 0,
            CreatedAt = DateTime.UtcNow
        };
        _context.Channels.Add(channel);
        await _context.SaveChangesAsync();

        var updateDto = new UpdateChannelDto
        {
            Name = "New Name",
            Position = 0
        };

        _permissionServiceMock
            .Setup(x => x.CheckPermissionAsync(guildId, userId, GuildPermission.ManageChannels, It.IsAny<string>()))
            .ThrowsAsync(new UnauthorizedAccessException("You don't have permission to update channels"));

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _channelService.UpdateChannelAsync(channelId, userId, updateDto)
        );
    }

    [Fact]
    public async Task DeleteChannelAsync_ValidDelete_DeletesChannel()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var guildId = Guid.NewGuid();
        var channelId = Guid.NewGuid();

        var guild = new Guild
        {
            Id = guildId,
            Name = "Test Guild",
            OwnerId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Guilds.Add(guild);

        var channel = new Channel
        {
            Id = channelId,
            GuildId = guildId,
            Name = "general",
            Type = ChannelType.Text,
            Position = 0,
            CreatedAt = DateTime.UtcNow
        };
        _context.Channels.Add(channel);
        await _context.SaveChangesAsync();

        _permissionServiceMock
            .Setup(x => x.CheckPermissionAsync(guildId, userId, GuildPermission.ManageChannels, It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        // Act
        await _channelService.DeleteChannelAsync(channelId, userId);

        // Assert
        var deletedChannel = await _context.Channels.FindAsync(channelId);
        Assert.Null(deletedChannel);
    }

    [Fact]
    public async Task DeleteChannelAsync_Unauthorized_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var guildId = Guid.NewGuid();
        var channelId = Guid.NewGuid();

        var guild = new Guild
        {
            Id = guildId,
            Name = "Test Guild",
            OwnerId = Guid.NewGuid(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Guilds.Add(guild);

        var channel = new Channel
        {
            Id = channelId,
            GuildId = guildId,
            Name = "general",
            Type = ChannelType.Text,
            Position = 0,
            CreatedAt = DateTime.UtcNow
        };
        _context.Channels.Add(channel);
        await _context.SaveChangesAsync();

        _permissionServiceMock
            .Setup(x => x.CheckPermissionAsync(guildId, userId, GuildPermission.ManageChannels, It.IsAny<string>()))
            .ThrowsAsync(new UnauthorizedAccessException("You don't have permission to delete channels"));

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _channelService.DeleteChannelAsync(channelId, userId)
        );
    }
}
