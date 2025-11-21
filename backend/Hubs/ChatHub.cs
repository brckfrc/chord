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
    private readonly IReactionService _reactionService;
    private readonly IReadStateService _readStateService;
    private readonly IMentionService _mentionService;
    private readonly ILogger<ChatHub> _logger;

    public ChatHub(
        IMessageService messageService,
        IReactionService reactionService,
        IReadStateService readStateService,
        IMentionService mentionService,
        ILogger<ChatHub> logger)
    {
        _messageService = messageService;
        _reactionService = reactionService;
        _readStateService = readStateService;
        _mentionService = mentionService;
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

            // Auto-mark channel as read for the sender (optional feature)
            try
            {
                await _readStateService.MarkChannelAsReadAsync(Guid.Parse(channelId), userId, message.Id);
            }
            catch (Exception ex)
            {
                // Log but don't fail the message send if read state update fails
                _logger.LogWarning(ex, "Failed to auto-update read state for user {UserId} in channel {ChannelId}",
                    userId, channelId);
            }

            // Broadcast to all users in the channel (including sender)
            await Clients.Group(channelId).SendAsync("ReceiveMessage", message);

            // Broadcast mentions to mentioned users
            try
            {
                var mentions = await _mentionService.GetMentionsByMessageIdAsync(message.Id);
                
                foreach (var mention in mentions)
                {
                    // Send UserMentioned event to the mentioned user
                    await Clients.User(mention.MentionedUserId.ToString()).SendAsync("UserMentioned", new
                    {
                        mentionId = mention.Id,
                        messageId = message.Id,
                        channelId = channelId,
                        authorId = userId,
                        content = dto.Content
                    });
                }

                if (mentions.Any())
                {
                    _logger.LogInformation("Sent {Count} mention notifications for message {MessageId}",
                        mentions.Count(), message.Id);
                }
            }
            catch (Exception ex)
            {
                // Log but don't fail message send if mention notification fails
                _logger.LogWarning(ex, "Failed to send mention notifications for message {MessageId}", message.Id);
            }

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
        var username = Context.User?.FindFirstValue(ClaimTypes.Name) 
            ?? Context.User?.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.UniqueName) 
            ?? "Unknown";

        // Broadcast to others in the channel (not to self)
        await Clients.OthersInGroup(channelId).SendAsync("UserTyping", new { userId, username, channelId });

        _logger.LogDebug("User {UserId} is typing in channel {ChannelId}", userId, channelId);
    }

    /// <summary>
    /// Stop typing indicator for a channel
    /// </summary>
    public async Task StopTyping(string channelId)
    {
        var userId = GetUserId();

        // Broadcast to others in the channel (not to self)
        await Clients.OthersInGroup(channelId).SendAsync("UserStoppedTyping", new { userId, channelId });

        _logger.LogDebug("User {UserId} stopped typing in channel {ChannelId}", userId, channelId);
    }

    // ==================== REACTION METHODS ====================

    /// <summary>
    /// Add a reaction to a message
    /// </summary>
    public async Task AddReaction(string messageId, AddReactionDto dto)
    {
        var userId = GetUserId();

        try
        {
            var reaction = await _reactionService.AddReactionAsync(Guid.Parse(messageId), userId, dto);

            // Get message to find channel for broadcasting
            var message = await _messageService.GetMessageByIdAsync(Guid.Parse(messageId), userId);

            // Broadcast to all users in the channel
            await Clients.Group(message.ChannelId.ToString()).SendAsync("ReactionAdded", reaction);

            _logger.LogInformation("User {UserId} added reaction {Emoji} to message {MessageId}",
                userId, dto.Emoji, messageId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "User {UserId} failed to add reaction to message {MessageId}", userId, messageId);
            await Clients.Caller.SendAsync("Error", $"Failed to add reaction: {ex.Message}");
        }
    }

    /// <summary>
    /// Remove a reaction from a message
    /// </summary>
    public async Task RemoveReaction(string messageId, string emoji)
    {
        var userId = GetUserId();

        try
        {
            await _reactionService.RemoveReactionAsync(Guid.Parse(messageId), userId, emoji);

            // Get message to find channel for broadcasting
            var message = await _messageService.GetMessageByIdAsync(Guid.Parse(messageId), userId);

            // Broadcast to all users in the channel
            await Clients.Group(message.ChannelId.ToString()).SendAsync("ReactionRemoved", new
            {
                messageId = Guid.Parse(messageId),
                userId = userId.ToString(),
                emoji
            });

            _logger.LogInformation("User {UserId} removed reaction {Emoji} from message {MessageId}",
                userId, emoji, messageId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "User {UserId} failed to remove reaction from message {MessageId}", userId, messageId);
            await Clients.Caller.SendAsync("Error", $"Failed to remove reaction: {ex.Message}");
        }
    }

    // ==================== VOICE CHANNEL METHODS ====================

    /// <summary>
    /// Join a voice channel (shows user as active in voice, separate from text message subscription)
    /// </summary>
    public async Task JoinVoiceChannel(string channelId)
    {
        var userId = GetUserId();
        var username = Context.User?.FindFirstValue(ClaimTypes.Name) 
            ?? Context.User?.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.UniqueName) 
            ?? "Unknown";
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

    // ==================== PIN METHODS ====================

    /// <summary>
    /// Pin a message in a channel
    /// </summary>
    public async Task PinMessage(string channelId, string messageId)
    {
        var userId = GetUserId();

        try
        {
            var message = await _messageService.PinMessageAsync(Guid.Parse(channelId), Guid.Parse(messageId), userId);

            // Broadcast to all users in the channel
            await Clients.Group(channelId).SendAsync("MessagePinned", message);

            _logger.LogInformation("User {UserId} pinned message {MessageId} in channel {ChannelId}",
                userId, messageId, channelId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "User {UserId} failed to pin message {MessageId}", userId, messageId);
            await Clients.Caller.SendAsync("Error", $"Failed to pin message: {ex.Message}");
        }
    }

    /// <summary>
    /// Unpin a message from a channel
    /// </summary>
    public async Task UnpinMessage(string channelId, string messageId)
    {
        var userId = GetUserId();

        try
        {
            await _messageService.UnpinMessageAsync(Guid.Parse(channelId), Guid.Parse(messageId), userId);

            // Broadcast to all users in the channel
            await Clients.Group(channelId).SendAsync("MessageUnpinned", new
            {
                messageId = Guid.Parse(messageId),
                channelId
            });

            _logger.LogInformation("User {UserId} unpinned message {MessageId} in channel {ChannelId}",
                userId, messageId, channelId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "User {UserId} failed to unpin message {MessageId}", userId, messageId);
            await Clients.Caller.SendAsync("Error", $"Failed to unpin message: {ex.Message}");
        }
    }
}

