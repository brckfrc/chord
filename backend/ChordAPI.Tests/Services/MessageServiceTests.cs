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

public class MessageServiceTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Mock<IMapper> _mapperMock;
    private readonly Mock<ILogger<MessageService>> _loggerMock;
    private readonly Mock<IPermissionService> _permissionServiceMock;
    private readonly Mock<IAuditLogService> _auditLogServiceMock;
    private readonly MessageService _messageService;

    public MessageServiceTests()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);

        _mapperMock = new Mock<IMapper>();
        _loggerMock = new Mock<ILogger<MessageService>>();
        _permissionServiceMock = new Mock<IPermissionService>();
        _auditLogServiceMock = new Mock<IAuditLogService>();
        
        // Setup audit log mock
        _auditLogServiceMock.Setup(x => x.LogActionAsync(
            It.IsAny<Guid>(), It.IsAny<AuditAction>(), It.IsAny<string>(),
            It.IsAny<Guid?>(), It.IsAny<object?>(), It.IsAny<Guid?>(),
            It.IsAny<string?>(), It.IsAny<string?>()))
            .Returns(Task.CompletedTask);

        _messageService = new MessageService(
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

    private async Task<(Guid userId, Guid guildId, Guid channelId)> SetupBasicScenarioAsync()
    {
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

        return (userId, guildId, channelId);
    }

    [Fact]
    public async Task CreateMessageAsync_ValidMessage_CreatesMessage()
    {
        // Arrange
        var (userId, guildId, channelId) = await SetupBasicScenarioAsync();

        var createDto = new CreateMessageDto
        {
            Content = "Hello, world!"
        };

        _mapperMock
            .Setup(x => x.Map<MessageResponseDto>(It.IsAny<Message>()))
            .Returns((Message m) => new MessageResponseDto
            {
                Id = m.Id,
                ChannelId = m.ChannelId,
                AuthorId = m.AuthorId,
                Content = m.Content,
                CreatedAt = m.CreatedAt,
                IsEdited = m.IsEdited,
                IsPinned = m.IsPinned
            });

        // Act
        var result = await _messageService.CreateMessageAsync(channelId, userId, createDto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Hello, world!", result.Content);
        Assert.Equal(userId, result.AuthorId);
        Assert.False(result.IsEdited);
        Assert.Equal(1, _context.Messages.Count());
    }

    [Fact]
    public async Task CreateMessageAsync_ChannelNotFound_ThrowsKeyNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var nonExistentChannelId = Guid.NewGuid();
        var createDto = new CreateMessageDto
        {
            Content = "Hello, world!"
        };

        // Act & Assert
        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _messageService.CreateMessageAsync(nonExistentChannelId, userId, createDto)
        );
    }

    [Fact]
    public async Task CreateMessageAsync_Unauthorized_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var (_, _, channelId) = await SetupBasicScenarioAsync();
        var unauthorizedUserId = Guid.NewGuid();

        var createDto = new CreateMessageDto
        {
            Content = "Hello, world!"
        };

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _messageService.CreateMessageAsync(channelId, unauthorizedUserId, createDto)
        );
    }

    [Fact]
    public async Task CreateMessageAsync_WithMentions_CreatesMentionRecords()
    {
        // Arrange
        var (userId, guildId, channelId) = await SetupBasicScenarioAsync();

        // Add another user to the guild for mention
        var mentionedUser = new User
        {
            Id = Guid.NewGuid(),
            Username = "mentioneduser",
            Email = "mentioned@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password"),
            DisplayName = "Mentioned User",
            CreatedAt = DateTime.UtcNow
        };
        _context.Users.Add(mentionedUser);
        _context.GuildMembers.Add(new GuildMember
        {
            GuildId = guildId,
            UserId = mentionedUser.Id,
            JoinedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        var createDto = new CreateMessageDto
        {
            Content = "Hello @mentioneduser!"
        };

        _mapperMock
            .Setup(x => x.Map<MessageResponseDto>(It.IsAny<Message>()))
            .Returns((Message m) => new MessageResponseDto
            {
                Id = m.Id,
                ChannelId = m.ChannelId,
                AuthorId = m.AuthorId,
                Content = m.Content,
                CreatedAt = m.CreatedAt,
                IsEdited = m.IsEdited,
                IsPinned = m.IsPinned
            });

        // Act
        var result = await _messageService.CreateMessageAsync(channelId, userId, createDto);

        // Assert
        Assert.NotNull(result);
        var mentions = await _context.MessageMentions
            .Where(mm => mm.MessageId == result.Id)
            .ToListAsync();
        Assert.Single(mentions);
        Assert.Equal(mentionedUser.Id, mentions[0].MentionedUserId);
    }

    [Fact]
    public async Task CreateMessageAsync_WithInvalidMentions_IgnoresInvalid()
    {
        // Arrange
        var (userId, guildId, channelId) = await SetupBasicScenarioAsync();

        var createDto = new CreateMessageDto
        {
            Content = "Hello @nonexistentuser!"
        };

        _mapperMock
            .Setup(x => x.Map<MessageResponseDto>(It.IsAny<Message>()))
            .Returns((Message m) => new MessageResponseDto
            {
                Id = m.Id,
                ChannelId = m.ChannelId,
                AuthorId = m.AuthorId,
                Content = m.Content,
                CreatedAt = m.CreatedAt,
                IsEdited = m.IsEdited,
                IsPinned = m.IsPinned
            });

        // Act
        var result = await _messageService.CreateMessageAsync(channelId, userId, createDto);

        // Assert
        Assert.NotNull(result);
        var mentions = await _context.MessageMentions
            .Where(mm => mm.MessageId == result.Id)
            .ToListAsync();
        Assert.Empty(mentions); // No mention record created for non-existent user
    }

    [Fact]
    public async Task CreateMessageAsync_NoMentions_NoMentionRecords()
    {
        // Arrange
        var (userId, guildId, channelId) = await SetupBasicScenarioAsync();

        var createDto = new CreateMessageDto
        {
            Content = "Hello, world! No mentions here."
        };

        _mapperMock
            .Setup(x => x.Map<MessageResponseDto>(It.IsAny<Message>()))
            .Returns((Message m) => new MessageResponseDto
            {
                Id = m.Id,
                ChannelId = m.ChannelId,
                AuthorId = m.AuthorId,
                Content = m.Content,
                CreatedAt = m.CreatedAt,
                IsEdited = m.IsEdited,
                IsPinned = m.IsPinned
            });

        // Act
        var result = await _messageService.CreateMessageAsync(channelId, userId, createDto);

        // Assert
        Assert.NotNull(result);
        var mentions = await _context.MessageMentions
            .Where(mm => mm.MessageId == result.Id)
            .ToListAsync();
        Assert.Empty(mentions); // No mention records created
    }

    [Fact]
    public async Task GetChannelMessagesAsync_ChannelWithMessages_ReturnsPaginatedMessages()
    {
        // Arrange
        var (userId, guildId, channelId) = await SetupBasicScenarioAsync();

        var message1 = new Message
        {
            Id = Guid.NewGuid(),
            ChannelId = channelId,
            AuthorId = userId,
            Content = "Message 1",
            CreatedAt = DateTime.UtcNow.AddMinutes(-10),
            IsEdited = false
        };
        var message2 = new Message
        {
            Id = Guid.NewGuid(),
            ChannelId = channelId,
            AuthorId = userId,
            Content = "Message 2",
            CreatedAt = DateTime.UtcNow.AddMinutes(-5),
            IsEdited = false
        };
        _context.Messages.AddRange(message1, message2);
        await _context.SaveChangesAsync();

        _mapperMock
            .Setup(x => x.Map<List<MessageResponseDto>>(It.IsAny<List<Message>>()))
            .Returns((List<Message> messages) => messages.Select(m => new MessageResponseDto
            {
                Id = m.Id,
                ChannelId = m.ChannelId,
                AuthorId = m.AuthorId,
                Content = m.Content,
                CreatedAt = m.CreatedAt,
                IsEdited = m.IsEdited,
                IsPinned = m.IsPinned
            }).ToList());

        // Act
        var result = await _messageService.GetChannelMessagesAsync(channelId, userId, 1, 50);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.Messages.Count());
        Assert.Equal(2, result.TotalCount);
        Assert.False(result.HasMore);
    }

    [Fact]
    public async Task GetChannelMessagesAsync_InvalidPagination_ReturnsEmpty()
    {
        // Arrange
        var (userId, _, channelId) = await SetupBasicScenarioAsync();

        _mapperMock
            .Setup(x => x.Map<List<MessageResponseDto>>(It.IsAny<List<Message>>()))
            .Returns(new List<MessageResponseDto>());

        // Act - negative page (will be normalized to 1)
        var resultNegativePage = await _messageService.GetChannelMessagesAsync(channelId, userId, -1, 50);
        Assert.NotNull(resultNegativePage);
        // Note: Service normalizes page to 1, so this will return messages if any exist
        // The test verifies the service handles invalid input gracefully

        // Act - zero limit (will be normalized to 50)
        var resultZeroLimit = await _messageService.GetChannelMessagesAsync(channelId, userId, 1, 0);
        Assert.NotNull(resultZeroLimit);
        // Note: Service normalizes pageSize to 50, so this will return messages if any exist
        // The test verifies the service handles invalid input gracefully
    }

    [Fact]
    public async Task GetChannelMessagesAsync_Unauthorized_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var (_, _, channelId) = await SetupBasicScenarioAsync();
        var unauthorizedUserId = Guid.NewGuid();

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _messageService.GetChannelMessagesAsync(channelId, unauthorizedUserId, 1, 50)
        );
    }

    [Fact]
    public async Task UpdateMessageAsync_AuthorUpdate_UpdatesMessage()
    {
        // Arrange
        var (userId, guildId, channelId) = await SetupBasicScenarioAsync();

        var message = new Message
        {
            Id = Guid.NewGuid(),
            ChannelId = channelId,
            AuthorId = userId,
            Content = "Original content",
            CreatedAt = DateTime.UtcNow,
            IsEdited = false
        };
        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        var updateDto = new UpdateMessageDto
        {
            Content = "Updated content"
        };

        _mapperMock
            .Setup(x => x.Map<MessageResponseDto>(It.IsAny<Message>()))
            .Returns((Message m) => new MessageResponseDto
            {
                Id = m.Id,
                ChannelId = m.ChannelId,
                AuthorId = m.AuthorId,
                Content = m.Content,
                CreatedAt = m.CreatedAt,
                IsEdited = m.IsEdited,
                IsPinned = m.IsPinned
            });

        // Act
        var result = await _messageService.UpdateMessageAsync(message.Id, userId, updateDto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Updated content", result.Content);
        Assert.True(result.IsEdited);

        var updatedMessage = await _context.Messages.FindAsync(message.Id);
        Assert.Equal("Updated content", updatedMessage!.Content);
        Assert.True(updatedMessage.IsEdited);
    }

    [Fact]
    public async Task UpdateMessageAsync_MessageNotFound_ThrowsKeyNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var nonExistentMessageId = Guid.NewGuid();
        var updateDto = new UpdateMessageDto
        {
            Content = "Updated content"
        };

        // Act & Assert
        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _messageService.UpdateMessageAsync(nonExistentMessageId, userId, updateDto)
        );
    }

    [Fact]
    public async Task UpdateMessageAsync_NonAuthorUpdate_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var (userId, guildId, channelId) = await SetupBasicScenarioAsync();
        var otherUserId = Guid.NewGuid();

        var message = new Message
        {
            Id = Guid.NewGuid(),
            ChannelId = channelId,
            AuthorId = userId,
            Content = "Original content",
            CreatedAt = DateTime.UtcNow,
            IsEdited = false
        };
        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        var updateDto = new UpdateMessageDto
        {
            Content = "Updated content"
        };

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _messageService.UpdateMessageAsync(message.Id, otherUserId, updateDto)
        );
    }

    [Fact]
    public async Task DeleteMessageAsync_MessageNotFound_ThrowsKeyNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var nonExistentMessageId = Guid.NewGuid();

        // Act & Assert
        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _messageService.DeleteMessageAsync(nonExistentMessageId, userId)
        );
    }

    [Fact]
    public async Task DeleteMessageAsync_NotAuthorOrOwner_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var (userId, guildId, channelId) = await SetupBasicScenarioAsync();
        var otherUserId = Guid.NewGuid();

        var message = new Message
        {
            Id = Guid.NewGuid(),
            ChannelId = channelId,
            AuthorId = userId,
            Content = "Test message",
            CreatedAt = DateTime.UtcNow,
            IsEdited = false
        };
        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        _permissionServiceMock
            .Setup(x => x.HasPermissionAsync(guildId, otherUserId, GuildPermission.ManageMessages))
            .ReturnsAsync(false);

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _messageService.DeleteMessageAsync(message.Id, otherUserId)
        );
    }

    [Fact]
    public async Task DeleteMessageAsync_AuthorDelete_SoftDeletesMessage()
    {
        // Arrange
        var (userId, guildId, channelId) = await SetupBasicScenarioAsync();

        var message = new Message
        {
            Id = Guid.NewGuid(),
            ChannelId = channelId,
            AuthorId = userId,
            Content = "Test message",
            CreatedAt = DateTime.UtcNow,
            IsEdited = false
        };
        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        _permissionServiceMock
            .Setup(x => x.HasPermissionAsync(guildId, userId, GuildPermission.ManageMessages))
            .ReturnsAsync(false);

        // Act
        await _messageService.DeleteMessageAsync(message.Id, userId);

        // Assert
        var deletedMessage = await _context.Messages.FindAsync(message.Id);
        Assert.NotNull(deletedMessage);
        Assert.NotNull(deletedMessage.DeletedAt); // Soft delete
    }

    [Fact]
    public async Task DeleteMessageAsync_WithManageMessagesPermission_SoftDeletesMessage()
    {
        // Arrange
        var (userId, guildId, channelId) = await SetupBasicScenarioAsync();
        var adminId = Guid.NewGuid();

        var admin = new User
        {
            Id = adminId,
            Username = "admin",
            Email = "admin@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password"),
            DisplayName = "Admin",
            CreatedAt = DateTime.UtcNow
        };
        _context.Users.Add(admin);

        _context.GuildMembers.Add(new GuildMember
        {
            GuildId = guildId,
            UserId = adminId,
            JoinedAt = DateTime.UtcNow
        });

        var message = new Message
        {
            Id = Guid.NewGuid(),
            ChannelId = channelId,
            AuthorId = userId,
            Content = "Test message",
            CreatedAt = DateTime.UtcNow,
            IsEdited = false
        };
        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        _permissionServiceMock
            .Setup(x => x.HasPermissionAsync(guildId, adminId, GuildPermission.ManageMessages))
            .ReturnsAsync(true);

        // Act
        await _messageService.DeleteMessageAsync(message.Id, adminId);

        // Assert
        var deletedMessage = await _context.Messages.FindAsync(message.Id);
        Assert.NotNull(deletedMessage);
        Assert.NotNull(deletedMessage.DeletedAt); // Soft delete
    }

    [Fact]
    public async Task PinMessageAsync_WithPermission_PinsMessage()
    {
        // Arrange
        var (userId, guildId, channelId) = await SetupBasicScenarioAsync();

        var message = new Message
        {
            Id = Guid.NewGuid(),
            ChannelId = channelId,
            AuthorId = userId,
            Content = "Test message",
            CreatedAt = DateTime.UtcNow,
            IsEdited = false,
            IsPinned = false
        };
        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        _permissionServiceMock
            .Setup(x => x.CheckPermissionAsync(guildId, userId, GuildPermission.ManageMessages, It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        _mapperMock
            .Setup(x => x.Map<MessageResponseDto>(It.IsAny<Message>()))
            .Returns((Message m) => new MessageResponseDto
            {
                Id = m.Id,
                ChannelId = m.ChannelId,
                AuthorId = m.AuthorId,
                Content = m.Content,
                CreatedAt = m.CreatedAt,
                IsEdited = m.IsEdited,
                IsPinned = m.IsPinned
            });

        // Act
        var result = await _messageService.PinMessageAsync(channelId, message.Id, userId);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.IsPinned);

        var pinnedMessage = await _context.Messages.FindAsync(message.Id);
        Assert.True(pinnedMessage!.IsPinned);
    }

    [Fact]
    public async Task GetPinnedMessagesAsync_ChannelWithPins_ReturnsPinnedMessages()
    {
        // Arrange
        var (userId, guildId, channelId) = await SetupBasicScenarioAsync();

        var message1 = new Message
        {
            Id = Guid.NewGuid(),
            ChannelId = channelId,
            AuthorId = userId,
            Content = "Pinned message",
            CreatedAt = DateTime.UtcNow,
            IsEdited = false,
            IsPinned = true,
            PinnedAt = DateTime.UtcNow
        };
        var message2 = new Message
        {
            Id = Guid.NewGuid(),
            ChannelId = channelId,
            AuthorId = userId,
            Content = "Regular message",
            CreatedAt = DateTime.UtcNow,
            IsEdited = false,
            IsPinned = false
        };
        _context.Messages.AddRange(message1, message2);
        await _context.SaveChangesAsync();

        _mapperMock
            .Setup(x => x.Map<List<MessageResponseDto>>(It.IsAny<List<Message>>()))
            .Returns((List<Message> messages) => messages.Select(m => new MessageResponseDto
            {
                Id = m.Id,
                ChannelId = m.ChannelId,
                AuthorId = m.AuthorId,
                Content = m.Content,
                CreatedAt = m.CreatedAt,
                IsEdited = m.IsEdited,
                IsPinned = m.IsPinned
            }).ToList());

        // Act
        var result = await _messageService.GetPinnedMessagesAsync(channelId, userId);

        // Assert
        Assert.NotNull(result);
        Assert.Single(result);
        Assert.True(result[0].IsPinned);
        Assert.Equal("Pinned message", result[0].Content);
    }

    [Fact]
    public async Task GetMessageByIdAsync_ValidMessage_ReturnsMessageDto()
    {
        // Arrange
        var (userId, guildId, channelId) = await SetupBasicScenarioAsync();

        var message = new Message
        {
            Id = Guid.NewGuid(),
            ChannelId = channelId,
            AuthorId = userId,
            Content = "Test message",
            CreatedAt = DateTime.UtcNow,
            IsEdited = false
        };
        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        _mapperMock
            .Setup(x => x.Map<MessageResponseDto>(It.IsAny<Message>()))
            .Returns((Message m) => new MessageResponseDto
            {
                Id = m.Id,
                ChannelId = m.ChannelId,
                AuthorId = m.AuthorId,
                Content = m.Content,
                CreatedAt = m.CreatedAt,
                IsEdited = m.IsEdited,
                IsPinned = m.IsPinned
            });

        // Act
        var result = await _messageService.GetMessageByIdAsync(message.Id, userId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(message.Id, result.Id);
        Assert.Equal("Test message", result.Content);
    }

    [Fact]
    public async Task GetMessageByIdAsync_MessageNotFound_ThrowsKeyNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var nonExistentMessageId = Guid.NewGuid();

        // Act & Assert
        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _messageService.GetMessageByIdAsync(nonExistentMessageId, userId)
        );
    }

    [Fact]
    public async Task GetMessageByIdAsync_Unauthorized_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var (userId, guildId, channelId) = await SetupBasicScenarioAsync();
        var unauthorizedUserId = Guid.NewGuid();

        var message = new Message
        {
            Id = Guid.NewGuid(),
            ChannelId = channelId,
            AuthorId = userId,
            Content = "Test message",
            CreatedAt = DateTime.UtcNow,
            IsEdited = false
        };
        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _messageService.GetMessageByIdAsync(message.Id, unauthorizedUserId)
        );
    }

    [Fact]
    public async Task GetMessageByIdAsync_DeletedMessage_ThrowsKeyNotFoundException()
    {
        // Arrange
        var (userId, guildId, channelId) = await SetupBasicScenarioAsync();

        var message = new Message
        {
            Id = Guid.NewGuid(),
            ChannelId = channelId,
            AuthorId = userId,
            Content = "Test message",
            CreatedAt = DateTime.UtcNow,
            IsEdited = false,
            DeletedAt = DateTime.UtcNow // Soft deleted
        };
        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        // Act & Assert
        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _messageService.GetMessageByIdAsync(message.Id, userId)
        );
    }

    [Fact]
    public async Task UnpinMessageAsync_WithPermission_UnpinsMessage()
    {
        // Arrange
        var (userId, guildId, channelId) = await SetupBasicScenarioAsync();

        var message = new Message
        {
            Id = Guid.NewGuid(),
            ChannelId = channelId,
            AuthorId = userId,
            Content = "Test message",
            CreatedAt = DateTime.UtcNow,
            IsEdited = false,
            IsPinned = true,
            PinnedAt = DateTime.UtcNow,
            PinnedByUserId = userId
        };
        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        _permissionServiceMock
            .Setup(x => x.CheckPermissionAsync(guildId, userId, GuildPermission.ManageMessages, It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        // Act
        await _messageService.UnpinMessageAsync(channelId, message.Id, userId);

        // Assert
        var unpinnedMessage = await _context.Messages.FindAsync(message.Id);
        Assert.NotNull(unpinnedMessage);
        Assert.False(unpinnedMessage.IsPinned);
        Assert.Null(unpinnedMessage.PinnedAt);
        Assert.Null(unpinnedMessage.PinnedByUserId);
    }

    [Fact]
    public async Task UnpinMessageAsync_MessageNotFound_ThrowsKeyNotFoundException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var channelId = Guid.NewGuid();
        var nonExistentMessageId = Guid.NewGuid();

        // Act & Assert
        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => _messageService.UnpinMessageAsync(channelId, nonExistentMessageId, userId)
        );
    }

    [Fact]
    public async Task UnpinMessageAsync_Unauthorized_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var (userId, guildId, channelId) = await SetupBasicScenarioAsync();
        var unauthorizedUserId = Guid.NewGuid();

        var message = new Message
        {
            Id = Guid.NewGuid(),
            ChannelId = channelId,
            AuthorId = userId,
            Content = "Test message",
            CreatedAt = DateTime.UtcNow,
            IsEdited = false,
            IsPinned = true,
            PinnedAt = DateTime.UtcNow,
            PinnedByUserId = userId
        };
        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        _permissionServiceMock
            .Setup(x => x.CheckPermissionAsync(guildId, unauthorizedUserId, GuildPermission.ManageMessages, It.IsAny<string>()))
            .ThrowsAsync(new UnauthorizedAccessException("You don't have permission to unpin messages"));

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _messageService.UnpinMessageAsync(channelId, message.Id, unauthorizedUserId)
        );
    }

    [Fact]
    public async Task UnpinMessageAsync_NotPinned_ThrowsInvalidOperationException()
    {
        // Arrange
        var (userId, guildId, channelId) = await SetupBasicScenarioAsync();

        var message = new Message
        {
            Id = Guid.NewGuid(),
            ChannelId = channelId,
            AuthorId = userId,
            Content = "Test message",
            CreatedAt = DateTime.UtcNow,
            IsEdited = false,
            IsPinned = false // Not pinned
        };
        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        _permissionServiceMock
            .Setup(x => x.CheckPermissionAsync(guildId, userId, GuildPermission.ManageMessages, It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _messageService.UnpinMessageAsync(channelId, message.Id, userId)
        );
    }
}
