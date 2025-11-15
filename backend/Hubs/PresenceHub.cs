using ChordAPI.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace ChordAPI.Hubs;

[Authorize]
public class PresenceHub : Hub
{
    private readonly AppDbContext _context;
    private readonly ILogger<PresenceHub> _logger;

    public PresenceHub(AppDbContext context, ILogger<PresenceHub> logger)
    {
        _context = context;
        _logger = logger;
    }

    private Guid GetUserId()
    {
        return Guid.Parse(Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        
        // Update user's LastSeenAt to now (online)
        var user = await _context.Users.FindAsync(userId);
        if (user != null)
        {
            user.LastSeenAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
        
        _logger.LogInformation("User {UserId} is now online (connection {ConnectionId})", 
            userId, Context.ConnectionId);
        
        // Notify all clients that user is online
        await Clients.Others.SendAsync("UserOnline", userId);
        
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();
        
        // Update user's LastSeenAt and status to offline
        var user = await _context.Users.FindAsync(userId);
        if (user != null)
        {
            user.LastSeenAt = DateTime.UtcNow;
            user.Status = Models.Entities.UserStatus.Offline;
            await _context.SaveChangesAsync();
        }
        
        _logger.LogInformation("User {UserId} is now offline", userId);
        
        // Notify all clients that user is offline
        await Clients.Others.SendAsync("UserOffline", userId);
        
        // Broadcast status change
        await Clients.Others.SendAsync("UserStatusChanged", new
        {
            userId = userId.ToString(),
            status = (int)Models.Entities.UserStatus.Offline,
            customStatus = user?.CustomStatus
        });
        
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Get all currently online users (who connected in the last 5 minutes)
    /// </summary>
    public async Task<List<Guid>> GetOnlineUsers()
    {
        var fiveMinutesAgo = DateTime.UtcNow.AddMinutes(-5);
        
        var onlineUserIds = await _context.Users
            .Where(u => u.LastSeenAt.HasValue && u.LastSeenAt.Value > fiveMinutesAgo)
            .Select(u => u.Id)
            .ToListAsync();
        
        return onlineUserIds;
    }

    /// <summary>
    /// Manually update presence status
    /// </summary>
    public async Task UpdatePresence()
    {
        var userId = GetUserId();
        
        var user = await _context.Users.FindAsync(userId);
        if (user != null)
        {
            user.LastSeenAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
        
        _logger.LogDebug("User {UserId} presence updated", userId);
    }

    /// <summary>
    /// Update user's status and custom status
    /// </summary>
    public async Task UpdateStatus(int status, string? customStatus = null)
    {
        var userId = GetUserId();
        
        var user = await _context.Users.FindAsync(userId);
        if (user == null)
        {
            await Clients.Caller.SendAsync("Error", "User not found");
            return;
        }

        // Validate status enum value
        if (!Enum.IsDefined(typeof(Models.Entities.UserStatus), status))
        {
            await Clients.Caller.SendAsync("Error", "Invalid status value");
            return;
        }

        var userStatus = (Models.Entities.UserStatus)status;
        
        user.Status = userStatus;
        user.CustomStatus = customStatus;
        user.UpdatedAt = DateTime.UtcNow;
        
        await _context.SaveChangesAsync();

        _logger.LogInformation("User {UserId} updated status to {Status} with custom status: {CustomStatus}",
            userId, userStatus, customStatus);

        // Broadcast status change to all clients (friends/guild members)
        await Clients.Others.SendAsync("UserStatusChanged", new
        {
            userId = userId.ToString(),
            status = status,
            customStatus = customStatus
        });

        await Clients.Caller.SendAsync("StatusUpdated", new
        {
            status = status,
            customStatus = customStatus
        });
    }
}

