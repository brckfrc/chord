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

        // Update user's LastSeenAt and status
        var user = await _context.Users.FindAsync(userId);
        if (user != null)
        {
            user.LastSeenAt = DateTime.UtcNow;

            // If status is Offline, set to Online (user just connected)
            // Otherwise, keep the current status (Online, Idle, DoNotDisturb, or Invisible)
            // This preserves user's previous status choice (Idle, DND, etc.) when reconnecting
            if (user.Status == Models.Entities.UserStatus.Offline)
            {
                user.Status = Models.Entities.UserStatus.Online;
            }

            await _context.SaveChangesAsync();

            // Always notify the caller (current user) about their current status
            // This ensures frontend gets the correct status (preserved Idle/DND/etc. or newly set Online)
            await Clients.Caller.SendAsync("StatusUpdated", new
            {
                status = (int)user.Status,
                customStatus = user.CustomStatus
            });
        }

        _logger.LogInformation("User {UserId} is now online (connection {ConnectionId}) with status {Status}",
            userId, Context.ConnectionId, user?.Status);

        // Notify all clients that user is online
        await Clients.Others.SendAsync("UserOnline", userId);

        // Broadcast status change to others (for all statuses, not just Online)
        if (user != null)
        {
            await Clients.Others.SendAsync("UserStatusChanged", new
            {
                userId = userId.ToString(),
                status = (int)user.Status,
                customStatus = user.CustomStatus
            });
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();

        // Update user's LastSeenAt (but preserve status - user may reconnect with same status)
        var user = await _context.Users.FindAsync(userId);
        if (user != null)
        {
            user.LastSeenAt = DateTime.UtcNow;
            // Don't change status - preserve it so user reconnects with same status (Idle, DND, etc.)
            await _context.SaveChangesAsync();
        }

        _logger.LogInformation("User {UserId} disconnected (preserving status: {Status})", userId, user?.Status);

        // Notify all clients that user is offline (for presence purposes)
        await Clients.Others.SendAsync("UserOffline", userId);

        // Broadcast that user appears offline to others (but status value is preserved)
        // Other users will see them as offline based on LastSeenAt, but status remains in DB
        await Clients.Others.SendAsync("UserStatusChanged", new
        {
            userId = userId.ToString(),
            status = (int)Models.Entities.UserStatus.Offline, // Appears offline to others
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

