using AutoMapper;
using ChordAPI.Data;
using ChordAPI.Models.DTOs;
using ChordAPI.Models.Entities;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace ChordAPI.Services;

/// <summary>
/// Implementation of audit log service
/// </summary>
public class AuditLogService : IAuditLogService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly ILogger<AuditLogService> _logger;

    public AuditLogService(
        AppDbContext context,
        IMapper mapper,
        ILogger<AuditLogService> logger)
    {
        _context = context;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task LogActionAsync(
        Guid userId,
        AuditAction action,
        string targetType,
        Guid? targetId = null,
        object? changes = null,
        Guid? guildId = null,
        string? ipAddress = null,
        string? userAgent = null)
    {
        try
        {
            var auditLog = new AuditLog
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Action = action,
                TargetType = targetType,
                TargetId = targetId,
                GuildId = guildId,
                IpAddress = ipAddress,
                UserAgent = userAgent,
                Timestamp = DateTime.UtcNow,
                Changes = changes != null ? JsonSerializer.Serialize(changes) : null
            };

            _context.AuditLogs.Add(auditLog);
            await _context.SaveChangesAsync();

            _logger.LogDebug(
                "Audit log created: Action={Action}, User={UserId}, Target={TargetType}/{TargetId}, Guild={GuildId}",
                action, userId, targetType, targetId, guildId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to create audit log: Action={Action}, User={UserId}, Target={TargetType}/{TargetId}",
                action, userId, targetType, targetId);
        }
    }

    public async Task<IEnumerable<AuditLogDto>> GetGuildAuditLogsAsync(
        Guid guildId,
        Guid requesterId,
        int limit = 50,
        int page = 1)
    {
        // Check if user is a guild member
        var isMember = await _context.GuildMembers
            .AnyAsync(gm => gm.GuildId == guildId && gm.UserId == requesterId);

        if (!isMember)
        {
            throw new UnauthorizedAccessException("You are not a member of this guild");
        }

        // Check if user is the guild owner
        var guild = await _context.Guilds
            .FirstOrDefaultAsync(g => g.Id == guildId);

        if (guild == null)
        {
            throw new KeyNotFoundException("Guild not found");
        }

        if (guild.OwnerId != requesterId)
        {
            throw new UnauthorizedAccessException("Only the guild owner can view audit logs");
        }

        // Get audit logs
        var skip = (page - 1) * limit;
        var logs = await _context.AuditLogs
            .Where(al => al.GuildId == guildId)
            .Include(al => al.User)
            .OrderByDescending(al => al.Timestamp)
            .Skip(skip)
            .Take(limit)
            .ToListAsync();

        return logs.Select(log => new AuditLogDto
        {
            Id = log.Id,
            GuildId = log.GuildId,
            UserId = log.UserId,
            Username = log.User.Username,
            Action = log.Action,
            ActionName = log.Action.ToString(),
            TargetType = log.TargetType,
            TargetId = log.TargetId,
            Changes = log.Changes,
            IpAddress = log.IpAddress,
            Timestamp = log.Timestamp
        });
    }
}
