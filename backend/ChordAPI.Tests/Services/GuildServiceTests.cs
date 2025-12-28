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

public class GuildServiceTests : IDisposable
{
    private readonly AppDbContext _context;
    private readonly Mock<IMapper> _mapperMock;
    private readonly Mock<ILogger<GuildService>> _loggerMock;
    private readonly Mock<IChannelService> _channelServiceMock;
    private readonly Mock<IRoleService> _roleServiceMock;
    private readonly GuildService _guildService;

    public GuildServiceTests()
    {
        // Setup InMemory database
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new AppDbContext(options);

        // Setup mocks
        _mapperMock = new Mock<IMapper>();
        _loggerMock = new Mock<ILogger<GuildService>>();
        _channelServiceMock = new Mock<IChannelService>();
        _roleServiceMock = new Mock<IRoleService>();

        // Create service
        _guildService = new GuildService(
            _context,
            _mapperMock.Object,
            _loggerMock.Object,
            _channelServiceMock.Object,
            _roleServiceMock.Object
        );
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task CreateGuildAsync_ValidGuild_ReturnsGuildResponseDto()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var createDto = new CreateGuildDto
        {
            Name = "Test Guild",
            Description = "Test Description",
            IconUrl = "https://example.com/icon.png"
        };

        var user = new User
        {
            Id = userId,
            Username = "testuser",
            Email = "test@example.com",
            PasswordHash = "hash",
            CreatedAt = DateTime.UtcNow
        };
        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        _mapperMock
            .Setup(x => x.Map<GuildResponseDto>(It.IsAny<Guild>()))
            .Returns((Guild g) => new GuildResponseDto
            {
                Id = g.Id,
                Name = g.Name,
                Description = g.Description,
                IconUrl = g.IconUrl,
                OwnerId = g.OwnerId,
                CreatedAt = g.CreatedAt,
                UpdatedAt = g.UpdatedAt,
                MemberCount = 1,
                ChannelCount = 0
            });

        // Act
        var result = await _guildService.CreateGuildAsync(userId, createDto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(createDto.Name, result.Name);
        Assert.Equal(createDto.Description, result.Description);
        Assert.Equal(userId, result.OwnerId);

        // Verify guild was added to database
        var guildInDb = await _context.Guilds.FirstOrDefaultAsync(g => g.Name == createDto.Name);
        Assert.NotNull(guildInDb);

        // Verify owner was added as member
        var memberInDb = await _context.GuildMembers
            .FirstOrDefaultAsync(m => m.GuildId == guildInDb.Id && m.UserId == userId);
        Assert.NotNull(memberInDb);
    }

    [Fact]
    public async Task GetUserGuildsAsync_UserWithGuilds_ReturnsGuildList()
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

        var guild1 = new Guild
        {
            Id = Guid.NewGuid(),
            Name = "Guild 1",
            OwnerId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        var guild2 = new Guild
        {
            Id = Guid.NewGuid(),
            Name = "Guild 2",
            OwnerId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Guilds.AddRange(guild1, guild2);
        _context.GuildMembers.AddRange(
            new GuildMember { GuildId = guild1.Id, UserId = userId, JoinedAt = DateTime.UtcNow },
            new GuildMember { GuildId = guild2.Id, UserId = userId, JoinedAt = DateTime.UtcNow }
        );
        await _context.SaveChangesAsync();

        _mapperMock
            .Setup(x => x.Map<IEnumerable<GuildResponseDto>>(It.IsAny<IEnumerable<Guild>>()))
            .Returns((IEnumerable<Guild> guilds) => guilds.Select(g => new GuildResponseDto
            {
                Id = g.Id,
                Name = g.Name,
                OwnerId = g.OwnerId,
                CreatedAt = g.CreatedAt,
                UpdatedAt = g.UpdatedAt,
                MemberCount = 1,
                ChannelCount = 0
            }));

        // Act
        var result = await _guildService.GetUserGuildsAsync(userId);

        // Assert
        Assert.NotNull(result);
        var guilds = result.ToList();
        Assert.Equal(2, guilds.Count);
        Assert.Contains(guilds, g => g.Name == "Guild 1");
        Assert.Contains(guilds, g => g.Name == "Guild 2");
    }

    [Fact]
    public async Task GetUserGuildsAsync_UserWithoutGuilds_ReturnsEmptyList()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var result = await _guildService.GetUserGuildsAsync(userId);

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetGuildByIdAsync_ExistingGuild_ReturnsGuildResponseDto()
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
        await _context.SaveChangesAsync();

        _mapperMock
            .Setup(x => x.Map<GuildResponseDto>(It.IsAny<Guild>()))
            .Returns((Guild g) => new GuildResponseDto
            {
                Id = g.Id,
                Name = g.Name,
                OwnerId = g.OwnerId,
                CreatedAt = g.CreatedAt,
                UpdatedAt = g.UpdatedAt,
                MemberCount = 1,
                ChannelCount = 0
            });

        // Act
        var result = await _guildService.GetGuildByIdAsync(guildId, userId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(guildId, result.Id);
        Assert.Equal("Test Guild", result.Name);
    }

    [Fact]
    public async Task GetGuildByIdAsync_NonExistentGuild_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var nonExistentGuildId = Guid.NewGuid();

        // Act & Assert
        // Service checks membership first, so UnauthorizedAccessException is thrown
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _guildService.GetGuildByIdAsync(nonExistentGuildId, userId)
        );
    }

    [Fact]
    public async Task GetGuildByIdAsync_UnauthorizedUser_ThrowsUnauthorizedAccessException()
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
            () => _guildService.GetGuildByIdAsync(guildId, unauthorizedUserId)
        );
    }

    [Fact]
    public async Task UpdateGuildAsync_OwnerUpdate_UpdatesGuild()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var user = new User
        {
            Id = userId,
            Username = "owner",
            Email = "owner@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password"),
            DisplayName = "Owner",
            CreatedAt = DateTime.UtcNow
        };
        _context.Users.Add(user);

        var guildId = Guid.NewGuid();
        var guild = new Guild
        {
            Id = guildId,
            Name = "Old Name",
            Description = "Old Description",
            OwnerId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Guilds.Add(guild);
        await _context.SaveChangesAsync();

        var updateDto = new UpdateGuildDto
        {
            Name = "New Name",
            Description = "New Description",
            IconUrl = "http://example.com/icon.png"
        };

        _mapperMock
            .Setup(x => x.Map<GuildResponseDto>(It.IsAny<Guild>()))
            .Returns((Guild g) => new GuildResponseDto
            {
                Id = g.Id,
                Name = g.Name,
                Description = g.Description,
                IconUrl = g.IconUrl,
                OwnerId = g.OwnerId,
                CreatedAt = g.CreatedAt,
                UpdatedAt = g.UpdatedAt,
                MemberCount = 0,
                ChannelCount = 0
            });

        // Act
        var result = await _guildService.UpdateGuildAsync(guildId, userId, updateDto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("New Name", result.Name);
        Assert.Equal("New Description", result.Description);
        Assert.Equal("http://example.com/icon.png", result.IconUrl);

        var updatedGuild = await _context.Guilds.FindAsync(guildId);
        Assert.Equal("New Name", updatedGuild!.Name);
    }

    [Fact]
    public async Task UpdateGuildAsync_NonOwnerUpdate_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
        var guildId = Guid.NewGuid();

        var owner = new User
        {
            Id = ownerId,
            Username = "owner",
            Email = "owner@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password"),
            DisplayName = "Owner",
            CreatedAt = DateTime.UtcNow
        };
        _context.Users.Add(owner);

        var guild = new Guild
        {
            Id = guildId,
            Name = "Test Guild",
            OwnerId = ownerId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Guilds.Add(guild);
        await _context.SaveChangesAsync();

        var updateDto = new UpdateGuildDto
        {
            Name = "New Name",
            Description = "New Description"
        };

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _guildService.UpdateGuildAsync(guildId, otherUserId, updateDto)
        );
    }

    [Fact]
    public async Task DeleteGuildAsync_OwnerDelete_DeletesGuild()
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

        // Act
        await _guildService.DeleteGuildAsync(guildId, userId);

        // Assert
        var deletedGuild = await _context.Guilds.FindAsync(guildId);
        Assert.Null(deletedGuild);
    }

    [Fact]
    public async Task DeleteGuildAsync_NonOwnerDelete_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
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
        await _context.SaveChangesAsync();

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _guildService.DeleteGuildAsync(guildId, otherUserId)
        );
    }

    [Fact]
    public async Task AddMemberAsync_ValidMember_AddsMember()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var newUserId = Guid.NewGuid();
        var guildId = Guid.NewGuid();

        var owner = new User
        {
            Id = ownerId,
            Username = "owner",
            Email = "owner@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password"),
            DisplayName = "Owner",
            CreatedAt = DateTime.UtcNow
        };
        var newUser = new User
        {
            Id = newUserId,
            Username = "newuser",
            Email = "newuser@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password"),
            DisplayName = "New User",
            CreatedAt = DateTime.UtcNow
        };
        _context.Users.AddRange(owner, newUser);

        var guild = new Guild
        {
            Id = guildId,
            Name = "Test Guild",
            OwnerId = ownerId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Guilds.Add(guild);
        await _context.SaveChangesAsync();

        _mapperMock
            .Setup(x => x.Map<GuildMemberDto>(It.IsAny<GuildMember>()))
            .Returns((GuildMember gm) => new GuildMemberDto
            {
                UserId = gm.UserId,
                GuildId = gm.GuildId,
                JoinedAt = gm.JoinedAt,
                Nickname = gm.Nickname,
                Role = "Member",
                User = gm.User != null ? new UserDto
                {
                    Id = gm.User.Id,
                    Username = gm.User.Username,
                    Email = gm.User.Email,
                    DisplayName = gm.User.DisplayName,
                    CreatedAt = gm.User.CreatedAt
                } : null
            });

        _roleServiceMock
            .Setup(x => x.AssignGeneralRoleAsync(It.IsAny<Guid>(), It.IsAny<Guid>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _guildService.AddMemberAsync(guildId, ownerId, newUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(newUserId, result.UserId);
        Assert.Equal(guildId, result.GuildId);

        var member = await _context.GuildMembers
            .FirstOrDefaultAsync(gm => gm.GuildId == guildId && gm.UserId == newUserId);
        Assert.NotNull(member);
    }

    [Fact]
    public async Task AddMemberAsync_AlreadyMember_ThrowsInvalidOperationException()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var existingUserId = Guid.NewGuid();
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

        var existingMember = new GuildMember
        {
            GuildId = guildId,
            UserId = existingUserId,
            JoinedAt = DateTime.UtcNow
        };
        _context.GuildMembers.Add(existingMember);
        await _context.SaveChangesAsync();

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _guildService.AddMemberAsync(guildId, ownerId, existingUserId)
        );
    }

    [Fact]
    public async Task RemoveMemberAsync_OwnerRemovesMember_RemovesMember()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var memberId = Guid.NewGuid();
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

        var member = new GuildMember
        {
            GuildId = guildId,
            UserId = memberId,
            JoinedAt = DateTime.UtcNow
        };
        _context.GuildMembers.Add(member);
        await _context.SaveChangesAsync();

        // Act
        await _guildService.RemoveMemberAsync(guildId, ownerId, memberId);

        // Assert
        var removedMember = await _context.GuildMembers
            .FirstOrDefaultAsync(gm => gm.GuildId == guildId && gm.UserId == memberId);
        Assert.Null(removedMember);
    }

    [Fact]
    public async Task RemoveMemberAsync_Unauthorized_ThrowsUnauthorizedAccessException()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
        var memberId = Guid.NewGuid();
        var otherUserId = Guid.NewGuid();
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

        var member = new GuildMember
        {
            GuildId = guildId,
            UserId = memberId,
            JoinedAt = DateTime.UtcNow
        };
        _context.GuildMembers.Add(member);
        await _context.SaveChangesAsync();

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _guildService.RemoveMemberAsync(guildId, otherUserId, memberId)
        );
    }

    [Fact]
    public async Task RemoveMemberAsync_OwnerRemovesSelf_ThrowsInvalidOperationException()
    {
        // Arrange
        var ownerId = Guid.NewGuid();
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
        await _context.SaveChangesAsync();

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _guildService.RemoveMemberAsync(guildId, ownerId, ownerId)
        );
    }

    [Fact]
    public async Task GetGuildMembersAsync_GuildWithMembers_ReturnsMemberList()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var guildId = Guid.NewGuid();

        var user1 = new User
        {
            Id = userId,
            Username = "user1",
            Email = "user1@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password"),
            DisplayName = "User 1",
            CreatedAt = DateTime.UtcNow
        };
        var user2Id = Guid.NewGuid();
        var user2 = new User
        {
            Id = user2Id,
            Username = "user2",
            Email = "user2@example.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("password"),
            DisplayName = "User 2",
            CreatedAt = DateTime.UtcNow
        };
        _context.Users.AddRange(user1, user2);

        var guild = new Guild
        {
            Id = guildId,
            Name = "Test Guild",
            OwnerId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Guilds.Add(guild);

        _context.GuildMembers.AddRange(
            new GuildMember { GuildId = guildId, UserId = userId, JoinedAt = DateTime.UtcNow },
            new GuildMember { GuildId = guildId, UserId = user2Id, JoinedAt = DateTime.UtcNow }
        );
        await _context.SaveChangesAsync();

        _mapperMock
            .Setup(x => x.Map<IEnumerable<GuildMemberDto>>(It.IsAny<IEnumerable<GuildMember>>()))
            .Returns((IEnumerable<GuildMember> members) => members.Select(gm => new GuildMemberDto
            {
                UserId = gm.UserId,
                GuildId = gm.GuildId,
                JoinedAt = gm.JoinedAt,
                Nickname = gm.Nickname,
                Role = "Member",
                User = gm.User != null ? new UserDto
                {
                    Id = gm.User.Id,
                    Username = gm.User.Username,
                    Email = gm.User.Email,
                    DisplayName = gm.User.DisplayName,
                    CreatedAt = gm.User.CreatedAt
                } : null
            }));

        // Act
        var result = await _guildService.GetGuildMembersAsync(guildId, userId);

        // Assert
        Assert.NotNull(result);
        var members = result.ToList();
        Assert.Equal(2, members.Count);
    }

    [Fact]
    public async Task GetGuildMembersAsync_UnauthorizedUser_ThrowsUnauthorizedAccessException()
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
            () => _guildService.GetGuildMembersAsync(guildId, unauthorizedUserId)
        );
    }
}
