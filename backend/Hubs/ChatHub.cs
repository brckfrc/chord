using ChordAPI.Models.DTOs;
using ChordAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace ChordAPI.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly IMessageService _messageService;
    private readonly ILogger<ChatHub> _logger;

    public ChatHub(IMessageService messageService, ILogger<ChatHub> logger)
    {
        _messageService = messageService;
        _logger = logger;
    }

    private Guid GetUserId()
    {
        return Guid.Parse(Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)!);
    }

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        _logger.LogInformation("User {UserId} connected to ChatHub with connection {ConnectionId}", 
            userId, Context.ConnectionId);
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();
        _logger.LogInformation("User {UserId} disconnected from ChatHub", userId);
        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Join a channel to receive messages
    /// </summary>
    public async Task JoinChannel(string channelId)
    {
        var userId = GetUserId();
        
        try
        {
            // Verify user has access to the channel
            await _messageService.GetChannelMessagesAsync(Guid.Parse(channelId), userId, 1, 1);
            
            // Add to SignalR group
            await Groups.AddToGroupAsync(Context.ConnectionId, channelId);
            
            _logger.LogInformation("User {UserId} joined channel {ChannelId}", userId, channelId);
            
            await Clients.Caller.SendAsync("JoinedChannel", channelId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "User {UserId} failed to join channel {ChannelId}", userId, channelId);
            await Clients.Caller.SendAsync("Error", $"Failed to join channel: {ex.Message}");
        }
    }

    /// <summary>
    /// Leave a channel
    /// </summary>
    public async Task LeaveChannel(string channelId)
    {
        var userId = GetUserId();
        
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, channelId);
        
        _logger.LogInformation("User {UserId} left channel {ChannelId}", userId, channelId);
        
        await Clients.Caller.SendAsync("LeftChannel", channelId);
    }

    /// <summary>
    /// Send a message to a channel
    /// </summary>
    public async Task SendMessage(string channelId, CreateMessageDto dto)
    {
        var userId = GetUserId();
        
        try
        {
            var message = await _messageService.CreateMessageAsync(Guid.Parse(channelId), userId, dto);
            
            // Broadcast to all users in the channel (including sender)
            await Clients.Group(channelId).SendAsync("ReceiveMessage", message);
            
            _logger.LogInformation("User {UserId} sent message {MessageId} to channel {ChannelId}", 
                userId, message.Id, channelId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "User {UserId} failed to send message to channel {ChannelId}", userId, channelId);
            await Clients.Caller.SendAsync("Error", $"Failed to send message: {ex.Message}");
        }
    }

    /// <summary>
    /// Edit a message
    /// </summary>
    public async Task EditMessage(string channelId, string messageId, UpdateMessageDto dto)
    {
        var userId = GetUserId();
        
        try
        {
            var message = await _messageService.UpdateMessageAsync(Guid.Parse(messageId), userId, dto);
            
            // Broadcast edit to all users in the channel
            await Clients.Group(channelId).SendAsync("MessageEdited", message);
            
            _logger.LogInformation("User {UserId} edited message {MessageId} in channel {ChannelId}", 
                userId, messageId, channelId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "User {UserId} failed to edit message {MessageId}", userId, messageId);
            await Clients.Caller.SendAsync("Error", $"Failed to edit message: {ex.Message}");
        }
    }

    /// <summary>
    /// Delete a message
    /// </summary>
    public async Task DeleteMessage(string channelId, string messageId)
    {
        var userId = GetUserId();
        
        try
        {
            await _messageService.DeleteMessageAsync(Guid.Parse(messageId), userId);
            
            // Broadcast deletion to all users in the channel
            await Clients.Group(channelId).SendAsync("MessageDeleted", messageId);
            
            _logger.LogInformation("User {UserId} deleted message {MessageId} in channel {ChannelId}", 
                userId, messageId, channelId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "User {UserId} failed to delete message {MessageId}", userId, messageId);
            await Clients.Caller.SendAsync("Error", $"Failed to delete message: {ex.Message}");
        }
    }

    /// <summary>
    /// Send typing indicator to a channel
    /// </summary>
    public async Task Typing(string channelId)
    {
        var userId = GetUserId();
        var username = Context.User?.FindFirstValue(ClaimTypes.Name) ?? "Unknown";
        
        // Broadcast to others in the channel (not to self)
        await Clients.OthersInGroup(channelId).SendAsync("UserTyping", new { userId, username, channelId });
        
        _logger.LogDebug("User {UserId} is typing in channel {ChannelId}", userId, channelId);
    }

    // ==================== VOICE CHANNEL METHODS ====================

    /// <summary>
    /// Join a voice channel (shows user as active in voice, separate from text message subscription)
    /// </summary>
    public async Task JoinVoiceChannel(string channelId)
    {
        var userId = GetUserId();
        var username = Context.User?.FindFirstValue(ClaimTypes.Name) ?? "Unknown";
        var displayName = Context.User?.FindFirstValue("displayName") ?? username;
        
        try
        {
            // TODO: Verify channel exists and is voice type (can add validation later)
            
            // Add to voice-specific SignalR group
            await Groups.AddToGroupAsync(Context.ConnectionId, $"voice_{channelId}");
            
            _logger.LogInformation("User {UserId} joined voice channel {ChannelId}", userId, channelId);
            
            // Notify all users viewing this voice channel
            await Clients.Group($"voice_{channelId}").SendAsync("UserJoinedVoiceChannel", new 
            { 
                userId = userId.ToString(),
                username,
                displayName,
                channelId,
                isMuted = false,
                isDeafened = false
            });
            
            await Clients.Caller.SendAsync("JoinedVoiceChannel", channelId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "User {UserId} failed to join voice channel {ChannelId}", userId, channelId);
            await Clients.Caller.SendAsync("Error", $"Failed to join voice channel: {ex.Message}");
        }
    }

    /// <summary>
    /// Leave a voice channel
    /// </summary>
    public async Task LeaveVoiceChannel(string channelId)
    {
        var userId = GetUserId();
        
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"voice_{channelId}");
        
        _logger.LogInformation("User {UserId} left voice channel {ChannelId}", userId, channelId);
        
        // Notify all users viewing this voice channel
        await Clients.Group($"voice_{channelId}").SendAsync("UserLeftVoiceChannel", new 
        { 
            userId = userId.ToString(),
            channelId 
        });
        
        await Clients.Caller.SendAsync("LeftVoiceChannel", channelId);
    }

    /// <summary>
    /// Update voice state (mute/deafen status)
    /// </summary>
    public async Task UpdateVoiceState(string channelId, bool isMuted, bool isDeafened)
    {
        var userId = GetUserId();
        
        _logger.LogDebug("User {UserId} updated voice state in channel {ChannelId}: Muted={IsMuted}, Deafened={IsDeafened}", 
            userId, channelId, isMuted, isDeafened);
        
        // Broadcast to all users viewing this voice channel
        await Clients.Group($"voice_{channelId}").SendAsync("UserVoiceStateChanged", new 
        { 
            userId = userId.ToString(),
            channelId,
            isMuted,
            isDeafened
        });
    }

    /// <summary>
    /// Get all users currently active in a voice channel
    /// </summary>
    public Task<List<object>> GetVoiceChannelUsers(string channelId)
    {
        var userId = GetUserId();
        
        _logger.LogDebug("User {UserId} requested active users in voice channel {ChannelId}", userId, channelId);
        
        // TODO: In a production environment, store voice channel state in Redis
        // For now, this returns empty - frontend will track based on join/leave events
        
        return Task.FromResult(new List<object>());
    }
}

