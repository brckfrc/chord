# SignalR Hub Events Documentation

## 🔌 Connection URLs

- **ChatHub**: `wss://your-domain/hubs/chat?access_token=YOUR_JWT_TOKEN`
- **PresenceHub**: `wss://your-domain/hubs/presence?access_token=YOUR_JWT_TOKEN`

## 🔐 Authentication

Both hubs require JWT authentication. Pass the access token as a query parameter:

```javascript
const connection = new HubConnectionBuilder()
  .withUrl("https://api.example.com/hubs/chat", {
    accessTokenFactory: () => yourJwtToken,
  })
  .build();
```

---

## 💬 ChatHub Events

### Server Methods (Client → Server)

#### `JoinChannel(channelId: string)`

Join a channel to receive real-time messages.

**Parameters:**

- `channelId`: GUID of the channel to join

**Response Events:**

- `JoinedChannel(channelId)` - Success
- `Error(message)` - Failure

**Example:**

```javascript
await connection.invoke("JoinChannel", "3fa85f64-5717-4562-b3fc-2c963f66afa6");
```

---

#### `LeaveChannel(channelId: string)`

Leave a channel to stop receiving messages.

**Parameters:**

- `channelId`: GUID of the channel to leave

**Response Events:**

- `LeftChannel(channelId)` - Success

**Example:**

```javascript
await connection.invoke("LeaveChannel", "3fa85f64-5717-4562-b3fc-2c963f66afa6");
```

---

#### `SendMessage(channelId: string, dto: CreateMessageDto)`

Send a message to a channel.

**Parameters:**

- `channelId`: GUID of the channel
- `dto`: Object with `{ content: string, attachments?: string }`

**Response Events:**

- `ReceiveMessage(message)` - Broadcast to all channel members (including sender)
- `Error(message)` - Failure

**Example:**

```javascript
await connection.invoke("SendMessage", "channel-guid", {
  content: "Hello, world!",
  attachments: null,
});
```

---

#### `EditMessage(channelId: string, messageId: string, dto: UpdateMessageDto)`

Edit an existing message.

**Parameters:**

- `channelId`: GUID of the channel
- `messageId`: GUID of the message to edit
- `dto`: Object with `{ content: string }`

**Response Events:**

- `MessageEdited(message)` - Broadcast to all channel members
- `Error(message)` - Failure

**Example:**

```javascript
await connection.invoke("EditMessage", "channel-guid", "message-guid", {
  content: "Updated content",
});
```

---

#### `DeleteMessage(channelId: string, messageId: string)`

Delete a message (soft delete).

**Parameters:**

- `channelId`: GUID of the channel
- `messageId`: GUID of the message to delete

**Response Events:**

- `MessageDeleted(messageId)` - Broadcast to all channel members
- `Error(message)` - Failure

**Example:**

```javascript
await connection.invoke("DeleteMessage", "channel-guid", "message-guid");
```

---

#### `Typing(channelId: string)`

Broadcast typing indicator to other users in the channel.

**Parameters:**

- `channelId`: GUID of the channel

**Response Events:**

- `UserTyping({ userId, username, channelId })` - Broadcast to others (not self)

**Example:**

```javascript
await connection.invoke("Typing", "channel-guid");
```

---

### Client Events (Server → Client)

#### `ReceiveMessage(message: MessageResponseDto)`

Fired when a new message is sent to a channel you're subscribed to.

**Payload:**

```typescript
{
  id: string;
  channelId: string;
  authorId: string;
  content: string;
  attachments?: string;
  createdAt: string;
  updatedAt?: string;
  isEdited: boolean;
  author: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
}
```

**Example:**

```javascript
connection.on("ReceiveMessage", (message) => {
  console.log(
    `New message from ${message.author.username}: ${message.content}`
  );
});
```

---

#### `MessageEdited(message: MessageResponseDto)`

Fired when a message is edited in a channel you're subscribed to.

**Payload:** Same as `ReceiveMessage`

**Example:**

```javascript
connection.on("MessageEdited", (message) => {
  console.log(`Message ${message.id} was edited`);
});
```

---

#### `MessageDeleted(messageId: string)`

Fired when a message is deleted in a channel you're subscribed to.

**Payload:** Message GUID (string)

**Example:**

```javascript
connection.on("MessageDeleted", (messageId) => {
  console.log(`Message ${messageId} was deleted`);
});
```

---

#### `UserTyping({ userId, username, channelId })`

Fired when another user is typing in a channel you're subscribed to.

**Payload:**

```typescript
{
  userId: string;
  username: string;
  channelId: string;
}
```

**Example:**

```javascript
connection.on("UserTyping", ({ userId, username, channelId }) => {
  console.log(`${username} is typing in ${channelId}...`);
  // Show typing indicator for 3 seconds
});
```

---

#### `JoinedChannel(channelId: string)`

Confirmation that you successfully joined a channel.

**Payload:** Channel GUID (string)

---

#### `LeftChannel(channelId: string)`

Confirmation that you successfully left a channel.

**Payload:** Channel GUID (string)

---

#### `Error(message: string)`

Generic error event for any failed operation.

**Payload:** Error message (string)

**Example:**

```javascript
connection.on("Error", (message) => {
  console.error("ChatHub error:", message);
});
```

---

#### `JoinVoiceChannel(channelId: string)`

Join a voice channel to show as active participant (separate from text message subscription).

**Parameters:**

- `channelId`: GUID of the voice channel to join

**Response Events:**

- `UserJoinedVoiceChannel({ userId, username, displayName, channelId, isMuted, isDeafened })` - Broadcast to all
- `JoinedVoiceChannel(channelId)` - Confirmation to caller
- `Error(message)` - Failure

**Example:**

```javascript
await connection.invoke("JoinVoiceChannel", "voice-channel-guid");
```

---

#### `LeaveVoiceChannel(channelId: string)`

Leave a voice channel.

**Parameters:**

- `channelId`: GUID of the voice channel to leave

**Response Events:**

- `UserLeftVoiceChannel({ userId, channelId })` - Broadcast to all
- `LeftVoiceChannel(channelId)` - Confirmation to caller

**Example:**

```javascript
await connection.invoke("LeaveVoiceChannel", "voice-channel-guid");
```

---

#### `UpdateVoiceState(channelId: string, isMuted: boolean, isDeafened: boolean)`

Update your microphone mute/deafen status in a voice channel.

**Parameters:**

- `channelId`: GUID of the voice channel
- `isMuted`: Whether microphone is muted
- `isDeafened`: Whether audio is deafened

**Response Events:**

- `UserVoiceStateChanged({ userId, channelId, isMuted, isDeafened })` - Broadcast to all

**Example:**

```javascript
// Mute microphone
await connection.invoke("UpdateVoiceState", "voice-channel-guid", true, false);
```

---

#### `GetVoiceChannelUsers(channelId: string): Promise<Array>`

Get all users currently active in a voice channel.

**Parameters:**

- `channelId`: GUID of the voice channel

**Returns:** Array of active users (currently empty, frontend tracks via events)

**Example:**

```javascript
const activeUsers = await connection.invoke(
  "GetVoiceChannelUsers",
  "voice-channel-guid"
);
```

---

### Client Events (Server → Client)

#### `UserJoinedVoiceChannel({ userId, username, displayName, channelId, isMuted, isDeafened })`

Fired when a user joins a voice channel.

**Payload:**

```typescript
{
  userId: string;
  username: string;
  displayName: string;
  channelId: string;
  isMuted: boolean;
  isDeafened: boolean;
}
```

**Example:**

```javascript
connection.on("UserJoinedVoiceChannel", (data) => {
  console.log(`${data.displayName} joined voice channel`);
  // Show user in voice channel participant list
});
```

---

#### `UserLeftVoiceChannel({ userId, channelId })`

Fired when a user leaves a voice channel.

**Payload:**

```typescript
{
  userId: string;
  channelId: string;
}
```

**Example:**

```javascript
connection.on("UserLeftVoiceChannel", ({ userId, channelId }) => {
  console.log(`User ${userId} left voice channel`);
  // Remove user from participant list
});
```

---

#### `UserVoiceStateChanged({ userId, channelId, isMuted, isDeafened })`

Fired when a user updates their voice state (mute/deafen).

**Payload:**

```typescript
{
  userId: string;
  channelId: string;
  isMuted: boolean;
  isDeafened: boolean;
}
```

**Example:**

```javascript
connection.on("UserVoiceStateChanged", ({ userId, isMuted, isDeafened }) => {
  console.log(`User ${userId} - Muted: ${isMuted}, Deafened: ${isDeafened}`);
  // Update UI to show mute/deafen icons
});
```

---

#### `JoinedVoiceChannel(channelId: string)`

Confirmation that you successfully joined a voice channel.

**Payload:** Voice channel GUID (string)

---

#### `LeftVoiceChannel(channelId: string)`

Confirmation that you successfully left a voice channel.

**Payload:** Voice channel GUID (string)

---

## 👥 PresenceHub Events

### Server Methods (Client → Server)

#### `GetOnlineUsers(): Promise<string[]>`

Get a list of all currently online users (active in the last 5 minutes).

**Returns:** Array of user GUIDs

**Example:**

```javascript
const onlineUsers = await connection.invoke("GetOnlineUsers");
console.log("Online users:", onlineUsers);
```

---

#### `UpdatePresence()`

Manually update your presence timestamp (keep-alive).

**Example:**

```javascript
// Call every minute to stay online
setInterval(() => {
  connection.invoke("UpdatePresence");
}, 60000);
```

---

### Client Events (Server → Client)

#### `UserOnline(userId: string)`

Fired when a user comes online.

**Payload:** User GUID (string)

**Example:**

```javascript
connection.on("UserOnline", (userId) => {
  console.log(`User ${userId} is now online`);
  // Update UI to show green dot
});
```

---

#### `UserOffline(userId: string)`

Fired when a user goes offline.

**Payload:** User GUID (string)

**Example:**

```javascript
connection.on("UserOffline", (userId) => {
  console.log(`User ${userId} is now offline`);
  // Update UI to show gray dot
});
```

---

## 🔄 Connection Lifecycle

### Connection

```javascript
const chatConnection = new HubConnectionBuilder()
  .withUrl("https://api.example.com/hubs/chat", {
    accessTokenFactory: () => localStorage.getItem("access_token"),
  })
  .withAutomaticReconnect()
  .build();

await chatConnection.start();
console.log("Connected to ChatHub");
```

### Disconnection

```javascript
await chatConnection.stop();
console.log("Disconnected from ChatHub");
```

### Reconnection

SignalR automatically handles reconnection with `.withAutomaticReconnect()`.

**Events:**

- `onreconnecting(error)` - Connection lost, attempting to reconnect
- `onreconnected(connectionId)` - Successfully reconnected
- `onclose(error)` - Connection closed permanently

**Example:**

```javascript
connection.onreconnecting((error) => {
  console.warn("Connection lost. Reconnecting...", error);
});

connection.onreconnected((connectionId) => {
  console.log("Reconnected! Connection ID:", connectionId);
  // Re-join channels
  joinChannel(currentChannelId);
});

connection.onclose((error) => {
  console.error("Connection closed:", error);
  // Show "Disconnected" UI
});
```

---

## 📝 Best Practices

### 1. Join Text Channels for Messages

```javascript
// When user navigates to a TEXT channel
async function navigateToTextChannel(channelId) {
  // Leave previous channel
  if (currentChannelId) {
    await chatConnection.invoke("LeaveChannel", currentChannelId);
  }

  // Join new channel for message subscription
  await chatConnection.invoke("JoinChannel", channelId);
  currentChannelId = channelId;
}
```

### 2. Join Voice Channels for Participation

```javascript
// When user clicks "Join Voice" button
async function joinVoiceChannel(channelId) {
  try {
    await chatConnection.invoke("JoinVoiceChannel", channelId);
    // Start WebRTC connection here (Phase 8)
    console.log("Joined voice channel:", channelId);
  } catch (error) {
    console.error("Failed to join voice:", error);
  }
}

// When user clicks "Leave Voice" or navigates away
async function leaveVoiceChannel(channelId) {
  await chatConnection.invoke("LeaveVoiceChannel", channelId);
  // Stop WebRTC connection
}

// Toggle mute
async function toggleMute(channelId, isMuted) {
  await chatConnection.invoke("UpdateVoiceState", channelId, isMuted, false);
}
```

### 3. Key Differences: Text vs Voice

| Aspect              | Text Channel (`JoinChannel`)           | Voice Channel (`JoinVoiceChannel`)      |
| ------------------- | -------------------------------------- | --------------------------------------- |
| **Purpose**         | Subscribe to messages                  | Show as active participant              |
| **Visibility**      | Not visible to others                  | Visible to all (participant list)       |
| **When to call**    | On channel navigation                  | On "Join Voice" button click            |
| **Auto-leave**      | On channel switch                      | On explicit "Leave" or disconnect       |
| **Related to**      | Message subscription (ReceiveMessage)  | Voice presence (mute/deafen status)     |
| **Online status**   | No (use PresenceHub)                   | Yes (for voice channel specifically)    |
| **Multiple active** | Only one at a time (current view)      | Can be in one voice + viewing text      |

**Example scenario:**

```javascript
// User viewing #general text channel
await chatConnection.invoke("JoinChannel", "text-channel-guid");
// ✅ Receives messages from #general

// User clicks "Join Voice" on #voice-1
await chatConnection.invoke("JoinVoiceChannel", "voice-channel-guid");
// ✅ Shows in #voice-1 participant list
// ✅ Still receiving #general messages
// ✅ Other users see them in voice channel

// User navigates to #random text channel
await chatConnection.invoke("LeaveChannel", "text-channel-guid"); // Leave #general
await chatConnection.invoke("JoinChannel", "random-channel-guid"); // Join #random
// ✅ Still in #voice-1 voice channel
// ✅ Now receives #random messages instead
```

### 4. Typing Indicator Debouncing

```javascript
let typingTimeout;

function onUserTyping() {
  clearTimeout(typingTimeout);

  // Send typing event
  chatConnection.invoke("Typing", currentChannelId);

  // Hide typing indicator after 3 seconds
  typingTimeout = setTimeout(() => {
    hideTypingIndicator();
  }, 3000);
}

// Throttle typing events (max 1 per second)
const throttledTyping = _.throttle(onUserTyping, 1000);

messageInput.addEventListener("input", throttledTyping);
```

### 5. Presence Keep-Alive

```javascript
// Update presence every minute
setInterval(() => {
  if (presenceConnection.state === "Connected") {
    presenceConnection.invoke("UpdatePresence");
  }
}, 60000);
```

### 6. Error Handling

```javascript
try {
  await chatConnection.invoke("SendMessage", channelId, { content: "Hello" });
} catch (error) {
  console.error("Failed to send message:", error);
  // Show retry UI
}
```

---

## 🧪 Testing with Postman/cURL

SignalR uses WebSockets, so standard HTTP tools won't work. Use these alternatives:

1. **Browser Console**: Best for quick tests
2. **SignalR Client Library**: For programmatic testing
3. **WebSocket Test Tools**: Like `websocat` or Postman's WebSocket support

**Example with Browser Console:**

```javascript
const connection = new signalR.HubConnectionBuilder()
  .withUrl("https://localhost:7224/hubs/chat?access_token=YOUR_JWT")
  .build();

await connection.start();
await connection.invoke("JoinChannel", "channel-guid");
await connection.invoke("SendMessage", "channel-guid", {
  content: "Test message",
});
```

---

## 🚀 Production Considerations

### Redis Backplane

SignalR is configured with Redis backplane for horizontal scaling.

**Configuration:**

```csharp
services.AddSignalR()
  .AddStackExchangeRedis("localhost:6379", options =>
  {
    options.Configuration.ChannelPrefix = "ChordSignalR";
  });
```

### Connection Limits

- Each client maintains 2 persistent connections (ChatHub + PresenceHub)
- Plan server resources accordingly (e.g., 1000 users = 2000 connections)

### Message Size Limits

- Default max message size: 32KB
- Configure in `appsettings.json` if needed:

```json
{
  "SignalR": {
    "MaximumReceiveMessageSize": 32768
  }
}
```

---

## 📚 Additional Resources

- [SignalR JavaScript Client API](https://docs.microsoft.com/aspnet/core/signalr/javascript-client)
- [SignalR Hub Protocol](https://docs.microsoft.com/aspnet/core/signalr/hubs)
- [Redis Backplane](https://docs.microsoft.com/aspnet/core/signalr/redis-backplane)
