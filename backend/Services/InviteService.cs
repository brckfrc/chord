using AutoMapper;
using ChordAPI.Data;
using ChordAPI.Models.DTOs;
using ChordAPI.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace ChordAPI.Services;

public class InviteService : IInviteService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly ILogger<InviteService> _logger;

    public InviteService(
        AppDbContext context,
        IMapper mapper,
        ILogger<InviteService> logger)
    {
        _context = context;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<InviteResponseDto> CreateInviteAsync(Guid guildId, Guid userId, CreateInviteDto dto)
    {
        // Check if user is a member of the guild
        var isMember = await _context.GuildMembers
            .AnyAsync(gm => gm.GuildId == guildId && gm.UserId == userId);

        if (!isMember)
        {
            throw new UnauthorizedAccessException("You must be a member of the guild to create invites");
        }

        // Generate unique 8-character code
        string code;
        bool isUnique = false;
        int attempts = 0;
        const int maxAttempts = 10;

        do
        {
            code = GenerateInviteCode();
            var exists = await _context.GuildInvites.AnyAsync(i => i.Code == code);
            if (!exists)
            {
                isUnique = true;
            }
            attempts++;
        } while (!isUnique && attempts < maxAttempts);

        if (!isUnique)
        {
            throw new InvalidOperationException("Failed to generate unique invite code after multiple attempts");
        }

        var invite = new GuildInvite
        {
            Id = Guid.NewGuid(),
            Code = code,
            GuildId = guildId,
            CreatedByUserId = userId,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = dto.ExpiresAt,
            MaxUses = dto.MaxUses,
            Uses = 0,
            IsActive = true
        };

        _context.GuildInvites.Add(invite);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Invite {Code} created for guild {GuildId} by user {UserId}", code, guildId, userId);

        // Reload with navigation properties
        var createdInvite = await _context.GuildInvites
            .Include(i => i.Guild)
            .Include(i => i.CreatedByUser)
            .FirstOrDefaultAsync(i => i.Id == invite.Id);

        return _mapper.Map<InviteResponseDto>(createdInvite);
    }

    public async Task<InviteInfoDto> GetInviteByCodeAsync(string code)
    {
        var invite = await _context.GuildInvites
            .Include(i => i.Guild)
                .ThenInclude(g => g.Members)
            .Include(i => i.CreatedByUser)
            .FirstOrDefaultAsync(i => i.Code == code);

        if (invite == null)
        {
            throw new KeyNotFoundException("Invite not found");
        }

        var dto = _mapper.Map<InviteInfoDto>(invite);
        
        // Check if invite is expired
        dto.IsExpired = invite.ExpiresAt.HasValue && invite.ExpiresAt.Value < DateTime.UtcNow;
        
        // Check if max uses reached
        dto.IsMaxUsesReached = invite.MaxUses.HasValue && invite.Uses >= invite.MaxUses.Value;
        
        // Get member count
        dto.MemberCount = invite.Guild.Members.Count;

        return dto;
    }

    public async Task<GuildResponseDto> AcceptInviteAsync(string code, Guid userId)
    {
        var invite = await _context.GuildInvites
            .Include(i => i.Guild)
            .FirstOrDefaultAsync(i => i.Code == code);

        if (invite == null)
        {
            throw new KeyNotFoundException("Invite not found");
        }

        if (!invite.IsActive)
        {
            throw new InvalidOperationException("This invite has been revoked");
        }

        if (invite.ExpiresAt.HasValue && invite.ExpiresAt.Value < DateTime.UtcNow)
        {
            throw new InvalidOperationException("This invite has expired");
        }

        if (invite.MaxUses.HasValue && invite.Uses >= invite.MaxUses.Value)
        {
            throw new InvalidOperationException("This invite has reached its maximum uses");
        }

        // Check if user is already a member
        var isAlreadyMember = await _context.GuildMembers
            .AnyAsync(gm => gm.GuildId == invite.GuildId && gm.UserId == userId);

        if (isAlreadyMember)
        {
            throw new InvalidOperationException("You are already a member of this guild");
        }

        // Add user to guild
        var newMember = new GuildMember
        {
            GuildId = invite.GuildId,
            UserId = userId,
            JoinedAt = DateTime.UtcNow,
            Role = "Member"
        };

        _context.GuildMembers.Add(newMember);

        // Increment invite uses
        invite.Uses++;
        await _context.SaveChangesAsync();

        _logger.LogInformation("User {UserId} joined guild {GuildId} via invite {Code}", userId, invite.GuildId, code);

        // Reload guild with navigation properties
        var guild = await _context.Guilds
            .Include(g => g.Owner)
            .Include(g => g.Members)
            .Include(g => g.Channels)
            .FirstOrDefaultAsync(g => g.Id == invite.GuildId);

        return _mapper.Map<GuildResponseDto>(guild);
    }

    public async Task<IEnumerable<InviteResponseDto>> GetGuildInvitesAsync(Guid guildId, Guid userId)
    {
        // Check if user is a member of the guild
        var isMember = await _context.GuildMembers
            .AnyAsync(gm => gm.GuildId == guildId && gm.UserId == userId);

        if (!isMember)
        {
            throw new UnauthorizedAccessException("You must be a member of the guild to view invites");
        }

        var invites = await _context.GuildInvites
            .Where(i => i.GuildId == guildId)
            .Include(i => i.Guild)
            .Include(i => i.CreatedByUser)
            .OrderByDescending(i => i.CreatedAt)
            .ToListAsync();

        return _mapper.Map<IEnumerable<InviteResponseDto>>(invites);
    }

    public async Task RevokeInviteAsync(Guid inviteId, Guid userId)
    {
        var invite = await _context.GuildInvites
            .Include(i => i.Guild)
            .FirstOrDefaultAsync(i => i.Id == inviteId);

        if (invite == null)
        {
            throw new KeyNotFoundException("Invite not found");
        }

        // Check if user is a member of the guild
        var isMember = await _context.GuildMembers
            .AnyAsync(gm => gm.GuildId == invite.GuildId && gm.UserId == userId);

        if (!isMember)
        {
            throw new UnauthorizedAccessException("You must be a member of the guild to revoke invites");
        }

        invite.IsActive = false;
        await _context.SaveChangesAsync();

        _logger.LogInformation("Invite {Code} revoked by user {UserId}", invite.Code, userId);
    }

    private string GenerateInviteCode()
    {
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        var random = new Random();
        return new string(Enumerable.Repeat(chars, 8)
            .Select(s => s[random.Next(s.Length)]).ToArray());
    }
}

