using AutoMapper;
using ChordAPI.Data;
using ChordAPI.Models.DTOs;
using ChordAPI.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace ChordAPI.Services;

public class FriendshipService : IFriendshipService
{
    private readonly AppDbContext _context;
    private readonly IMapper _mapper;
    private readonly ILogger<FriendshipService> _logger;

    public FriendshipService(
        AppDbContext context,
        IMapper mapper,
        ILogger<FriendshipService> logger)
    {
        _context = context;
        _mapper = mapper;
        _logger = logger;
    }

    public async Task<FriendshipResponseDto> SendFriendRequestAsync(Guid userId, string username)
    {
        // Find the target user by username
        var targetUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
        if (targetUser == null)
        {
            throw new KeyNotFoundException($"User '{username}' not found");
        }

        // Can't send friend request to yourself
        if (targetUser.Id == userId)
        {
            throw new InvalidOperationException("Cannot send friend request to yourself");
        }

        // Check if friendship already exists
        var existingFriendship = await _context.Friendships
            .FirstOrDefaultAsync(f =>
                (f.RequesterId == userId && f.AddresseeId == targetUser.Id) ||
                (f.RequesterId == targetUser.Id && f.AddresseeId == userId));

        if (existingFriendship != null)
        {
            if (existingFriendship.Status == FriendshipStatus.Accepted)
            {
                throw new InvalidOperationException("You are already friends with this user");
            }
            else if (existingFriendship.Status == FriendshipStatus.Pending)
            {
                throw new InvalidOperationException("A friend request already exists");
            }
            else if (existingFriendship.Status == FriendshipStatus.Blocked)
            {
                throw new InvalidOperationException("Cannot send friend request to this user");
            }
        }

        // Create new friend request
        var friendship = new Friendship
        {
            Id = Guid.NewGuid(),
            RequesterId = userId,
            AddresseeId = targetUser.Id,
            Status = FriendshipStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        _context.Friendships.Add(friendship);
        await _context.SaveChangesAsync();

        // Load the full friendship with user data
        var friendshipWithUsers = await _context.Friendships
            .Include(f => f.Requester)
            .Include(f => f.Addressee)
            .FirstAsync(f => f.Id == friendship.Id);

        return MapToDto(friendshipWithUsers, userId);
    }

    public async Task<FriendshipResponseDto> AcceptRequestAsync(Guid userId, Guid requestId)
    {
        var friendship = await _context.Friendships
            .Include(f => f.Requester)
            .Include(f => f.Addressee)
            .FirstOrDefaultAsync(f => f.Id == requestId);

        if (friendship == null)
        {
            throw new KeyNotFoundException("Friend request not found");
        }

        // Only the addressee can accept the request
        if (friendship.AddresseeId != userId)
        {
            throw new UnauthorizedAccessException("You cannot accept this friend request");
        }

        if (friendship.Status != FriendshipStatus.Pending)
        {
            throw new InvalidOperationException("This friend request is not pending");
        }

        friendship.Status = FriendshipStatus.Accepted;
        friendship.AcceptedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return MapToDto(friendship, userId);
    }

    public async Task DeclineRequestAsync(Guid userId, Guid requestId)
    {
        var friendship = await _context.Friendships
            .FirstOrDefaultAsync(f => f.Id == requestId);

        if (friendship == null)
        {
            throw new KeyNotFoundException("Friend request not found");
        }

        // Only the addressee can decline the request
        if (friendship.AddresseeId != userId)
        {
            throw new UnauthorizedAccessException("You cannot decline this friend request");
        }

        if (friendship.Status != FriendshipStatus.Pending)
        {
            throw new InvalidOperationException("This friend request is not pending");
        }

        _context.Friendships.Remove(friendship);
        await _context.SaveChangesAsync();
    }

    public async Task<FriendshipResponseDto> BlockUserAsync(Guid userId, Guid targetUserId)
    {
        if (userId == targetUserId)
        {
            throw new InvalidOperationException("Cannot block yourself");
        }

        // Check if friendship exists
        var existingFriendship = await _context.Friendships
            .Include(f => f.Requester)
            .Include(f => f.Addressee)
            .FirstOrDefaultAsync(f =>
                (f.RequesterId == userId && f.AddresseeId == targetUserId) ||
                (f.RequesterId == targetUserId && f.AddresseeId == userId));

        if (existingFriendship != null)
        {
            // Update existing friendship to blocked
            existingFriendship.Status = FriendshipStatus.Blocked;
            existingFriendship.AcceptedAt = null;

            // Ensure the blocker is the requester
            if (existingFriendship.RequesterId != userId)
            {
                var temp = existingFriendship.RequesterId;
                existingFriendship.RequesterId = existingFriendship.AddresseeId;
                existingFriendship.AddresseeId = temp;
            }
        }
        else
        {
            // Create new blocked friendship
            existingFriendship = new Friendship
            {
                Id = Guid.NewGuid(),
                RequesterId = userId,
                AddresseeId = targetUserId,
                Status = FriendshipStatus.Blocked,
                CreatedAt = DateTime.UtcNow
            };
            _context.Friendships.Add(existingFriendship);
        }

        await _context.SaveChangesAsync();

        // Reload with user data
        var friendshipWithUsers = await _context.Friendships
            .Include(f => f.Requester)
            .Include(f => f.Addressee)
            .FirstAsync(f => f.Id == existingFriendship.Id);

        return MapToDto(friendshipWithUsers, userId);
    }

    public async Task UnblockUserAsync(Guid userId, Guid targetUserId)
    {
        var friendship = await _context.Friendships
            .FirstOrDefaultAsync(f =>
                f.RequesterId == userId &&
                f.AddresseeId == targetUserId &&
                f.Status == FriendshipStatus.Blocked);

        if (friendship == null)
        {
            throw new KeyNotFoundException("Block not found");
        }

        _context.Friendships.Remove(friendship);
        await _context.SaveChangesAsync();
    }

    public async Task RemoveFriendAsync(Guid userId, Guid friendId)
    {
        var friendship = await _context.Friendships
            .FirstOrDefaultAsync(f =>
                ((f.RequesterId == userId && f.AddresseeId == friendId) ||
                 (f.RequesterId == friendId && f.AddresseeId == userId)) &&
                f.Status == FriendshipStatus.Accepted);

        if (friendship == null)
        {
            throw new KeyNotFoundException("Friendship not found");
        }

        _context.Friendships.Remove(friendship);
        await _context.SaveChangesAsync();
    }

    public async Task<List<FriendshipResponseDto>> GetFriendsAsync(Guid userId)
    {
        var friendships = await _context.Friendships
            .Include(f => f.Requester)
            .Include(f => f.Addressee)
            .Where(f =>
                (f.RequesterId == userId || f.AddresseeId == userId) &&
                f.Status == FriendshipStatus.Accepted)
            .ToListAsync();

        return friendships.Select(f => MapToDto(f, userId)).ToList();
    }

    public async Task<List<FriendshipResponseDto>> GetPendingRequestsAsync(Guid userId)
    {
        var friendships = await _context.Friendships
            .Include(f => f.Requester)
            .Include(f => f.Addressee)
            .Where(f =>
                (f.RequesterId == userId || f.AddresseeId == userId) &&
                f.Status == FriendshipStatus.Pending)
            .ToListAsync();

        return friendships.Select(f => MapToDto(f, userId)).ToList();
    }

    public async Task<List<FriendshipResponseDto>> GetBlockedUsersAsync(Guid userId)
    {
        var friendships = await _context.Friendships
            .Include(f => f.Requester)
            .Include(f => f.Addressee)
            .Where(f =>
                f.RequesterId == userId &&
                f.Status == FriendshipStatus.Blocked)
            .ToListAsync();

        return friendships.Select(f => MapToDto(f, userId)).ToList();
    }

    public async Task<bool> IsBlockedAsync(Guid userId, Guid otherUserId)
    {
        return await _context.Friendships
            .AnyAsync(f =>
                ((f.RequesterId == userId && f.AddresseeId == otherUserId) ||
                 (f.RequesterId == otherUserId && f.AddresseeId == userId)) &&
                f.Status == FriendshipStatus.Blocked);
    }

    /// <summary>
    /// Maps a Friendship entity to DTO, with the "other user" being the user who is not the current user
    /// </summary>
    private FriendshipResponseDto MapToDto(Friendship friendship, Guid currentUserId)
    {
        var isRequester = friendship.RequesterId == currentUserId;
        var otherUser = isRequester ? friendship.Addressee : friendship.Requester;

        return new FriendshipResponseDto
        {
            Id = friendship.Id,
            RequesterId = friendship.RequesterId,
            AddresseeId = friendship.AddresseeId,
            Status = friendship.Status,
            CreatedAt = friendship.CreatedAt,
            AcceptedAt = friendship.AcceptedAt,
            OtherUser = _mapper.Map<UserDto>(otherUser)
        };
    }
}

