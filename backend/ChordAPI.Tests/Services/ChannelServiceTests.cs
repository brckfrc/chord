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
    private readonly Mock<IAuditLogService> _auditLogServiceMock;
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
        _auditLogServiceMock = new Mock<IAuditLogService>();
        
        // Setup audit log mock
        _auditLogServiceMock.Setup(x => x.LogActionAsync(
            It.IsAny<Guid>(), It.IsAny<AuditAction>(), It.IsAny<string>(),
            It.IsAny<Guid?>(), It.IsAny<object?>(), It.IsAny<Guid?>(),
            It.IsAny<string?>(), It.IsAny<string?>()))
            .Returns(Task.CompletedTask);

        _channelService = new ChannelService(
            _context,
            _mapperMock.Object,
            _loggerMock.Object,
            _permissionServiceMock.Object,
            _auditLogServiceMock.Object
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
    public async Task CreateChannelAsync_GuildNotFound_ThrowsKeyNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var nonExistentGuildId = Guid.NewGuid();
        var createDto = new CreateChannelDto
        {
            Name = "general",
            Type = ChannelType.Text
        };

        // Act & Assert
        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _channelService.CreateChannelAsync(nonExistentGuildId, userId, createDto)
        );
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
    public async Task UpdateChannelAsync_MoveUp_ShiftsChannelsDown()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var guildId = Guid.NewGuid();
        var channel1Id = Guid.NewGuid();
        var channel2Id = Guid.NewGuid();
        var channel3Id = Guid.NewGuid();

        var guild = new Guild
        {
            Id = guildId,
            Name = "Test Guild",
            OwnerId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Guilds.Add(guild);

        // Create 3 channels at positions 0, 1, 2
        var channel1 = new Channel
        {
            Id = channel1Id,
            GuildId = guildId,
            Name = "Channel 1",
            Type = ChannelType.Text,
            Position = 0,
            CreatedAt = DateTime.UtcNow
        };
        var channel2 = new Channel
        {
            Id = channel2Id,
            GuildId = guildId,
            Name = "Channel 2",
            Type = ChannelType.Text,
            Position = 1,
            CreatedAt = DateTime.UtcNow
        };
        var channel3 = new Channel
        {
            Id = channel3Id,
            GuildId = guildId,
            Name = "Channel 3",
            Type = ChannelType.Text,
            Position = 2,
            CreatedAt = DateTime.UtcNow
        };
        _context.Channels.AddRange(channel1, channel2, channel3);
        await _context.SaveChangesAsync();

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
                Position = c.Position,
                CreatedAt = c.CreatedAt
            });

        // Act - Move channel3 from position 2 to position 0
        var updateDto = new UpdateChannelDto
        {
            Name = "Channel 3",
            Position = 0
        };
        await _channelService.UpdateChannelAsync(channel3Id, userId, updateDto);

        // Assert - Channel 1 and 2 should be shifted down
        var updatedChannel1 = await _context.Channels.FindAsync(channel1Id);
        var updatedChannel2 = await _context.Channels.FindAsync(channel2Id);
        var updatedChannel3 = await _context.Channels.FindAsync(channel3Id);
        Assert.Equal(1, updatedChannel1!.Position); // Shifted down
        Assert.Equal(2, updatedChannel2!.Position); // Shifted down
        Assert.Equal(0, updatedChannel3!.Position); // Moved to position 0
    }

    [Fact]
    public async Task UpdateChannelAsync_MoveDown_ShiftsChannelsUp()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var guildId = Guid.NewGuid();
        var channel1Id = Guid.NewGuid();
        var channel2Id = Guid.NewGuid();
        var channel3Id = Guid.NewGuid();

        var guild = new Guild
        {
            Id = guildId,
            Name = "Test Guild",
            OwnerId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Guilds.Add(guild);

        // Create 3 channels at positions 0, 1, 2
        var channel1 = new Channel
        {
            Id = channel1Id,
            GuildId = guildId,
            Name = "Channel 1",
            Type = ChannelType.Text,
            Position = 0,
            CreatedAt = DateTime.UtcNow
        };
        var channel2 = new Channel
        {
            Id = channel2Id,
            GuildId = guildId,
            Name = "Channel 2",
            Type = ChannelType.Text,
            Position = 1,
            CreatedAt = DateTime.UtcNow
        };
        var channel3 = new Channel
        {
            Id = channel3Id,
            GuildId = guildId,
            Name = "Channel 3",
            Type = ChannelType.Text,
            Position = 2,
            CreatedAt = DateTime.UtcNow
        };
        _context.Channels.AddRange(channel1, channel2, channel3);
        await _context.SaveChangesAsync();

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
                Position = c.Position,
                CreatedAt = c.CreatedAt
            });

        // Act - Move channel1 from position 0 to position 2
        var updateDto = new UpdateChannelDto
        {
            Name = "Channel 1",
            Position = 2
        };
        await _channelService.UpdateChannelAsync(channel1Id, userId, updateDto);

        // Assert - Channel 2 and 3 should be shifted up
        var updatedChannel1 = await _context.Channels.FindAsync(channel1Id);
        var updatedChannel2 = await _context.Channels.FindAsync(channel2Id);
        var updatedChannel3 = await _context.Channels.FindAsync(channel3Id);
        Assert.Equal(2, updatedChannel1!.Position); // Moved to position 2
        Assert.Equal(0, updatedChannel2!.Position); // Shifted up
        Assert.Equal(1, updatedChannel3!.Position); // Shifted up
    }

    [Fact]
    public async Task UpdateChannelAsync_SamePosition_NoShift()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var guildId = Guid.NewGuid();
        var channel1Id = Guid.NewGuid();
        var channel2Id = Guid.NewGuid();

        var guild = new Guild
        {
            Id = guildId,
            Name = "Test Guild",
            OwnerId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Guilds.Add(guild);

        var channel1 = new Channel
        {
            Id = channel1Id,
            GuildId = guildId,
            Name = "Channel 1",
            Type = ChannelType.Text,
            Position = 0,
            CreatedAt = DateTime.UtcNow
        };
        var channel2 = new Channel
        {
            Id = channel2Id,
            GuildId = guildId,
            Name = "Channel 2",
            Type = ChannelType.Text,
            Position = 1,
            CreatedAt = DateTime.UtcNow
        };
        _context.Channels.AddRange(channel1, channel2);
        await _context.SaveChangesAsync();

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
                Position = c.Position,
                CreatedAt = c.CreatedAt
            });

        // Act - Update channel1 but keep same position
        var updateDto = new UpdateChannelDto
        {
            Name = "Updated Channel 1",
            Position = 0 // Same position
        };
        await _channelService.UpdateChannelAsync(channel1Id, userId, updateDto);

        // Assert - No position changes
        var updatedChannel1 = await _context.Channels.FindAsync(channel1Id);
        var updatedChannel2 = await _context.Channels.FindAsync(channel2Id);
        Assert.Equal(0, updatedChannel1!.Position); // Same position
        Assert.Equal(1, updatedChannel2!.Position); // Unchanged
        Assert.Equal("Updated Channel 1", updatedChannel1.Name); // Name updated
    }

    [Fact]
    public async Task UpdateChannelAsync_PositionShiftScopedByType()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var guildId = Guid.NewGuid();
        var textChannel1Id = Guid.NewGuid();
        var textChannel2Id = Guid.NewGuid();
        var voiceChannel1Id = Guid.NewGuid();

        var guild = new Guild
        {
            Id = guildId,
            Name = "Test Guild",
            OwnerId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Guilds.Add(guild);

        // Create text channels at positions 0, 1
        var textChannel1 = new Channel
        {
            Id = textChannel1Id,
            GuildId = guildId,
            Name = "Text 1",
            Type = ChannelType.Text,
            Position = 0,
            CreatedAt = DateTime.UtcNow
        };
        var textChannel2 = new Channel
        {
            Id = textChannel2Id,
            GuildId = guildId,
            Name = "Text 2",
            Type = ChannelType.Text,
            Position = 1,
            CreatedAt = DateTime.UtcNow
        };
        // Create voice channel at position 0 (different type)
        var voiceChannel1 = new Channel
        {
            Id = voiceChannel1Id,
            GuildId = guildId,
            Name = "Voice 1",
            Type = ChannelType.Voice,
            Position = 0,
            CreatedAt = DateTime.UtcNow
        };
        _context.Channels.AddRange(textChannel1, textChannel2, voiceChannel1);
        await _context.SaveChangesAsync();

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
                Position = c.Position,
                CreatedAt = c.CreatedAt
            });

        // Act - Move textChannel2 from position 1 to position 0
        var updateDto = new UpdateChannelDto
        {
            Name = "Text 2",
            Position = 0
        };
        await _channelService.UpdateChannelAsync(textChannel2Id, userId, updateDto);

        // Assert - Only text channels affected, voice channel unchanged
        var updatedTextChannel1 = await _context.Channels.FindAsync(textChannel1Id);
        var updatedTextChannel2 = await _context.Channels.FindAsync(textChannel2Id);
        var updatedVoiceChannel1 = await _context.Channels.FindAsync(voiceChannel1Id);
        Assert.Equal(1, updatedTextChannel1!.Position); // Shifted down (text channel)
        Assert.Equal(0, updatedTextChannel2!.Position); // Moved to position 0
        Assert.Equal(0, updatedVoiceChannel1!.Position); // Unchanged (different type)
    }

    [Fact]
    public async Task UpdateChannelAsync_ChannelNotFound_ThrowsKeyNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var nonExistentChannelId = Guid.NewGuid();
        var updateDto = new UpdateChannelDto
        {
            Name = "New Name",
            Position = 0
        };

        // Act & Assert
        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _channelService.UpdateChannelAsync(nonExistentChannelId, userId, updateDto)
        );
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
    public async Task DeleteChannelAsync_ChannelNotFound_ThrowsKeyNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var nonExistentChannelId = Guid.NewGuid();

        // Act & Assert
        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _channelService.DeleteChannelAsync(nonExistentChannelId, userId)
        );
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
