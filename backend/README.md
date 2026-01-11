# Chord API - Backend

> **Purpose:** Complete backend documentation including API endpoints, SignalR events,
> LiveKit voice/video integration, and mobile app integration guide.

ASP.NET Core backend for Chord, a Discord-like real-time chat application.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Quick Setup](#quick-setup)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [SignalR Hubs](#signalr-hubs)
- [Voice & Video (LiveKit)](#voice--video-livekit)
- [Mobile App Integration](#mobile-app-integration)
- [Database Schema](#database-schema)
- [Production Deployment](#production-deployment)
- [Testing](#testing)

---

## Tech Stack

- **.NET 9.0** - Web API
- **Entity Framework Core 9** - ORM
- **SQL Server** - Database
- **Redis** - Caching & SignalR backplane
- **MinIO** - Object storage for file uploads
- **LiveKit** - WebRTC SFU for voice/video
- **Coturn** - STUN/TURN server for NAT traversal
- **SignalR** - Real-time communication
- **JWT 8.2** - Authentication
- **BCrypt** - Password hashing
- **Serilog 9** - Logging
- **AutoMapper 12** - Object mapping
- **FluentValidation 11** - Input validation
- **ImageSharp** - Server-side image processing

---

## Quick Setup

### Automated (Recommended)

```bash
cd ..  # Go to project root
./setup-env.sh dev
```

This automatically configures environment variables, Docker services, and database migrations.

### Manual Setup

```bash
# 1. Copy environment template
cp .env.example .env
nano .env

# 2. Start infrastructure
docker compose -f docker-compose.dev.yml up -d

# 3. Apply migrations
dotnet ef database update

# 4. Run the API
dotnet run
```

**Access:**

- API: `http://localhost:5049`
- Swagger: `http://localhost:5049/swagger`
- MinIO Console: `http://localhost:9001`

---

## Project Structure

```
backend/
├── Controllers/           # API endpoints
│   ├── AuthController.cs
│   ├── GuildsController.cs
│   ├── ChannelsController.cs
│   ├── MessagesController.cs
│   ├── UploadController.cs
│   ├── VoiceController.cs
│   ├── RolesController.cs
│   ├── InvitesController.cs
│   ├── MentionsController.cs
│   ├── ReactionsController.cs
│   ├── FriendsController.cs
│   ├── DMController.cs
│   └── AuditLogsController.cs
├── Hubs/                  # SignalR hubs
│   ├── ChatHub.cs
│   └── PresenceHub.cs
├── Models/
│   ├── Entities/          # Database entities
│   └── DTOs/              # Data transfer objects
├── Services/              # Business logic
├── Data/                  # DbContext
├── Middleware/            # Custom middleware
├── Migrations/            # EF Core migrations
├── docker-compose.*.yml   # Docker configurations
└── Program.cs             # Application entry point
```

---

## Configuration

### Environment Variables (.env)

Copy `.env.example` and fill your values:

```bash
cp .env.example .env
```

**Required:**

| Variable          | Description                    |
| ----------------- | ------------------------------ |
| `SQL_SA_PASSWORD` | SQL Server password            |
| `JWT_SECRET`      | JWT signing key (min 32 chars) |

**Optional:**

| Variable             | Default             | Description            |
| -------------------- | ------------------- | ---------------------- |
| `DATABASE_NAME`      | ChordDB             | Database name          |
| `CORS_ORIGINS`       | localhost:5173      | Allowed frontend URLs  |
| `MINIO_ENDPOINT`     | localhost:9000      | MinIO endpoint         |
| `LIVEKIT_API_KEY`    | devkey              | LiveKit API key        |
| `LIVEKIT_API_SECRET` | (generated)         | LiveKit API secret     |
| `LIVEKIT_URL`        | ws://localhost:7880 | LiveKit WebSocket URL  |
| `LIVEKIT_NODE_IP`    | (your LAN IP)       | Node IP for LAN access |

---

## API Endpoints

### Authentication

| Method | Endpoint             | Description          | Auth |
| ------ | -------------------- | -------------------- | ---- |
| POST   | `/api/Auth/register` | Register new user    | No   |
| POST   | `/api/Auth/login`    | Login                | No   |
| POST   | `/api/Auth/refresh`  | Refresh access token | No   |
| GET    | `/api/Auth/me`       | Get current user     | Yes  |
| POST   | `/api/Auth/logout`   | Logout               | Yes  |

### Guilds

| Method | Endpoint           | Description        | Auth        |
| ------ | ------------------ | ------------------ | ----------- |
| POST   | `/api/Guilds`      | Create guild       | Yes         |
| GET    | `/api/Guilds`      | List user's guilds | Yes         |
| GET    | `/api/Guilds/{id}` | Get guild details  | Yes         |
| PUT    | `/api/Guilds/{id}` | Update guild       | Yes (Owner) |
| DELETE | `/api/Guilds/{id}` | Delete guild       | Yes (Owner) |

### Channels

| Method | Endpoint                              | Description    | Auth |
| ------ | ------------------------------------- | -------------- | ---- |
| POST   | `/api/guilds/{guildId}/Channels`      | Create channel | Yes  |
| GET    | `/api/guilds/{guildId}/Channels`      | List channels  | Yes  |
| PUT    | `/api/guilds/{guildId}/Channels/{id}` | Update channel | Yes  |
| DELETE | `/api/guilds/{guildId}/Channels/{id}` | Delete channel | Yes  |

### Messages

| Method | Endpoint                                  | Description    | Auth |
| ------ | ----------------------------------------- | -------------- | ---- |
| POST   | `/api/channels/{channelId}/Messages`      | Send message   | Yes  |
| GET    | `/api/channels/{channelId}/Messages`      | Get messages   | Yes  |
| PUT    | `/api/channels/{channelId}/Messages/{id}` | Edit message   | Yes  |
| DELETE | `/api/channels/{channelId}/Messages/{id}` | Delete message | Yes  |

### File Upload

| Method | Endpoint                  | Description            | Auth |
| ------ | ------------------------- | ---------------------- | ---- |
| POST   | `/api/Upload`             | Upload file (max 25MB) | Yes  |
| DELETE | `/api/Upload?fileUrl=...` | Delete file            | Yes  |

**Supported file types:**

| Type     | Formats                             | Max Size |
| -------- | ----------------------------------- | -------- |
| Image    | jpg, png, gif, webp                 | 25MB     |
| Video    | mp4, webm, quicktime                | 25MB     |
| Document | pdf, docx, xlsx, txt, csv, zip, rar | 25MB     |

**MinIO Public Endpoint Configuration:**

For production deployments with reverse proxy (Nginx, Caddy, etc.), set `MINIO_PUBLIC_ENDPOINT` environment variable:

- **YunoHost**: Automatically configured via `docker-compose.yunohost.yml` (default: `https://your-domain.com/uploads`)
- **Standard VPS**: Set `MINIO_PUBLIC_ENDPOINT=https://your-domain.com/uploads` in `.env` or docker-compose
- **Standalone**: Set `MINIO_PUBLIC_ENDPOINT=https://your-domain.com/uploads` in `.env` or docker-compose

This ensures uploaded files are accessible via public URLs (e.g., `https://your-domain.com/uploads/chord-uploads/...`) instead of internal Docker hostnames (e.g., `http://minio:9000/...`).

**Note**: Your reverse proxy must have a `/uploads` location that proxies to MinIO on port 9000.

### Voice

| Method | Endpoint               | Description            | Auth |
| ------ | ---------------------- | ---------------------- | ---- |
| POST   | `/api/Voice/token`     | Get LiveKit room token | Yes  |
| GET    | `/api/Voice/room/{id}` | Get room status        | Yes  |

### Roles

| Method | Endpoint                           | Description | Auth              |
| ------ | ---------------------------------- | ----------- | ----------------- |
| GET    | `/api/guilds/{guildId}/roles`      | List roles  | Yes               |
| POST   | `/api/guilds/{guildId}/roles`      | Create role | Yes (ManageRoles) |
| PUT    | `/api/guilds/{guildId}/roles/{id}` | Update role | Yes (ManageRoles) |
| DELETE | `/api/guilds/{guildId}/roles/{id}` | Delete role | Yes (ManageRoles) |

### Friends

| Method | Endpoint                        | Description           | Auth |
| ------ | ------------------------------- | --------------------- | ---- |
| POST   | `/api/Friends/request`          | Send friend request   | Yes  |
| POST   | `/api/Friends/{id}/accept`      | Accept friend request | Yes  |
| POST   | `/api/Friends/{id}/decline`     | Decline request       | Yes  |
| DELETE | `/api/Friends/{id}`             | Remove friend         | Yes  |
| POST   | `/api/Friends/block/{userId}`   | Block user            | Yes  |
| DELETE | `/api/Friends/block/{userId}`   | Unblock user          | Yes  |
| GET    | `/api/Friends`                  | List friends          | Yes  |
| GET    | `/api/Friends/pending`          | List pending requests | Yes  |
| GET    | `/api/Friends/blocked`          | List blocked users    | Yes  |

### Direct Messages

| Method | Endpoint                              | Description             | Auth |
| ------ | ------------------------------------- | ----------------------- | ---- |
| POST   | `/api/DMs/{userId}`                   | Create/get DM channel   | Yes  |
| GET    | `/api/DMs`                            | List DM channels        | Yes  |
| GET    | `/api/DMs/{dmId}/messages`            | Get DM messages         | Yes  |
| POST   | `/api/DMs/{dmId}/messages`            | Send DM message         | Yes  |
| PUT    | `/api/DMs/{dmId}/messages/{id}`       | Edit DM message         | Yes  |
| DELETE | `/api/DMs/{dmId}/messages/{id}`       | Delete DM message       | Yes  |
| POST   | `/api/DMs/{dmId}/mark-read`           | Mark DM as read         | Yes  |

### Invites

| Method | Endpoint                           | Description              | Auth        |
| ------ | ---------------------------------- | ------------------------ | ----------- |
| POST   | `/api/Invites/guilds/{guildId}`    | Create invite            | Yes         |
| GET    | `/api/Invites/{code}`              | Get invite info (public) | No          |
| POST   | `/api/Invites/{code}/accept`       | Accept invite            | Yes         |
| GET    | `/api/Invites/guilds/{guildId}`    | List guild invites       | Yes (Owner) |
| DELETE | `/api/Invites/{inviteId}`          | Revoke invite            | Yes (Owner) |

### Reactions

| Method | Endpoint                                    | Description      | Auth |
| ------ | ------------------------------------------- | ---------------- | ---- |
| GET    | `/api/messages/{messageId}/Reactions`       | Get reactions    | Yes  |
| POST   | `/api/messages/{messageId}/Reactions`       | Add reaction     | Yes  |
| DELETE | `/api/messages/{messageId}/Reactions/{emoji}` | Remove reaction | Yes  |

### Mentions

| Method | Endpoint                          | Description                    | Auth |
| ------ | --------------------------------- | ------------------------------ | ---- |
| GET    | `/api/Mentions`                   | Get user mentions              | Yes  |
| GET    | `/api/Mentions/unread-count`      | Get unread mention count       | Yes  |
| PATCH  | `/api/Mentions/{id}/mark-read`    | Mark mention as read           | Yes  |
| PATCH  | `/api/Mentions/mark-all-read`     | Mark all mentions as read      | Yes  |

**Query Parameters:**
- `GET /api/Mentions?unreadOnly=true` - Filter unread mentions only
- `PATCH /api/Mentions/mark-all-read?guildId={id}` - Mark all mentions in a guild as read

### Audit Logs

| Method | Endpoint                                    | Description              | Auth        |
| ------ | ------------------------------------------- | ------------------------ | ----------- |
| GET    | `/api/guilds/{guildId}/audit-logs`          | Get guild audit logs     | Yes (Owner) |

**Query Parameters:**
- `limit` - Maximum number of logs (default: 50, max: 100)
- `page` - Page number (1-indexed)

---

## SignalR Hubs

### Connection URLs

```
ChatHub:     wss://your-domain/hubs/chat?access_token=JWT_TOKEN
PresenceHub: wss://your-domain/hubs/presence?access_token=JWT_TOKEN
```

### Authentication

```javascript
const connection = new HubConnectionBuilder()
  .withUrl("https://api.example.com/hubs/chat", {
    accessTokenFactory: () => yourJwtToken,
  })
  .withAutomaticReconnect()
  .build();
```

---

### ChatHub Methods

#### Server Methods (Client → Server)

| Method              | Parameters                          | Description                            |
| ------------------- | ----------------------------------- | -------------------------------------- |
| `JoinChannel`       | `channelId`                         | Subscribe to text channel messages     |
| `LeaveChannel`      | `channelId`                         | Unsubscribe from channel               |
| `SendMessage`       | `channelId, {content, attachments}` | Send message                           |
| `EditMessage`       | `channelId, messageId, {content}`   | Edit message                           |
| `DeleteMessage`     | `channelId, messageId`              | Delete message                         |
| `Typing`            | `channelId`                         | Broadcast typing indicator             |
| `JoinVoiceChannel`  | `channelId`                         | Join voice channel (visible to others) |
| `LeaveVoiceChannel` | `channelId`                         | Leave voice channel                    |
| `UpdateVoiceState`  | `channelId, isMuted, isDeafened`    | Update mute/deafen status              |
| `JoinDM`            | `dmChannelId`                       | Join DM channel                        |
| `LeaveDM`           | `dmChannelId`                       | Leave DM channel                       |
| `SendDMMessage`     | `dmChannelId, {content}`            | Send DM message                        |
| `TypingInDM`        | `dmChannelId`                       | Broadcast typing in DM                 |
| `StopTypingInDM`    | `dmChannelId`                       | Stop typing in DM                      |
| `MarkDMAsRead`      | `dmChannelId, lastReadMessageId`    | Mark DM as read                        |

#### Client Events (Server → Client)

| Event                    | Payload                                                           | Description                  |
| ------------------------ | ----------------------------------------------------------------- | ---------------------------- |
| `ReceiveMessage`         | `MessageResponseDto`                                              | New message received         |
| `MessageEdited`          | `MessageResponseDto`                                              | Message was edited           |
| `MessageDeleted`         | `messageId`                                                       | Message was deleted          |
| `UserTyping`             | `{userId, username, channelId}`                                   | User is typing               |
| `UserJoinedVoiceChannel` | `{userId, username, displayName, channelId, isMuted, isDeafened}` | User joined voice            |
| `UserLeftVoiceChannel`   | `{userId, channelId}`                                             | User left voice              |
| `UserVoiceStateChanged`  | `{userId, channelId, isMuted, isDeafened}`                        | Voice state changed          |
| `JoinedChannel`          | `channelId`                                                       | Confirmation of channel join |
| `JoinedVoiceChannel`     | `channelId`                                                       | Confirmation of voice join   |
| `DMReceiveMessage`       | `DirectMessageDto`                                                | New DM received              |
| `DMMessageEdited`        | `DirectMessageDto`                                                | DM message edited            |
| `DMMessageDeleted`       | `messageId`                                                       | DM message deleted           |
| `DMUserTyping`           | `{userId, username, dmChannelId}`                                 | User typing in DM            |
| `DMUserStoppedTyping`    | `{userId, dmChannelId}`                                           | User stopped typing in DM    |
| `DMMarkAsRead`           | `{dmChannelId, lastReadMessageId, unreadCount}`                   | DM marked as read            |
| `Error`                  | `message`                                                         | Error message                |

---

### PresenceHub Methods

#### Server Methods

| Method           | Parameters | Description                 |
| ---------------- | ---------- | --------------------------- |
| `GetOnlineUsers` | -          | Get list of online user IDs |
| `UpdatePresence` | -          | Keep-alive heartbeat        |

#### Client Events

| Event         | Payload  | Description       |
| ------------- | -------- | ----------------- |
| `UserOnline`  | `userId` | User came online  |
| `UserOffline` | `userId` | User went offline |

---

### SignalR Usage Examples

```javascript
// Join text channel for messages
await connection.invoke("JoinChannel", "channel-guid");

// Send message
await connection.invoke("SendMessage", "channel-guid", {
  content: "Hello!",
  attachments: null,
});

// Join voice channel (shows you in participant list)
await connection.invoke("JoinVoiceChannel", "voice-channel-guid");

// Toggle mute
await connection.invoke("UpdateVoiceState", "voice-channel-guid", true, false);

// Listen for events
connection.on("ReceiveMessage", (message) => {
  console.log(`${message.author.username}: ${message.content}`);
});

connection.on("UserJoinedVoiceChannel", (data) => {
  console.log(`${data.displayName} joined voice`);
});
```

---

## Voice & Video (LiveKit)

### Architecture

```
┌────────────────────────────────────────────────────────────┐
│                      Client (Web/Mobile)                    │
├────────────────────────────────────────────────────────────┤
│  1. POST /api/Voice/token → Get LiveKit token              │
│  2. Connect to LiveKit: wss://domain:7880                  │
│  3. RTC Media: UDP :7881                                   │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│  LiveKit Server (SFU)                                      │
│  - WebSocket signaling (:7880)                             │
│  - RTC media relay (:7881 UDP/TCP)                         │
│  - Room management                                          │
│  - Participant tracking                                     │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│  Coturn (STUN/TURN)                                        │
│  - NAT traversal (:3478)                                   │
│  - Relay for restrictive networks                          │
└────────────────────────────────────────────────────────────┘
```

### Getting Voice Token

```javascript
// 1. Request token from backend
const response = await fetch("/api/Voice/token", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({ channelId: "voice-channel-guid" }),
});

const { token, url, roomName } = await response.json();

// 2. Connect to LiveKit
import { Room } from "livekit-client";

const room = new Room();
await room.connect(url, token);

// 3. Publish local audio
const localTrack = await room.localParticipant.setMicrophoneEnabled(true);
```

### Required Ports

| Port | Protocol | Service | Purpose             |
| ---- | -------- | ------- | ------------------- |
| 7880 | TCP      | LiveKit | WebSocket signaling |
| 7881 | UDP/TCP  | LiveKit | RTC media           |
| 3478 | UDP/TCP  | Coturn  | STUN/TURN           |

---

## Mobile App Integration

### Endpoint Architecture

Native mobile apps connect directly to backend services:

```
┌─────────────────────────────────────────────────────────────┐
│                    chord.domain.com                          │
├─────────────────────────────────────────────────────────────┤
│  /api/*      → REST API (auth, guilds, messages, etc.)      │
│  /hubs/*     → SignalR (real-time chat, presence)           │
├─────────────────────────────────────────────────────────────┤
│  :7880       → LiveKit (voice/video signaling)              │
│  :7881       → RTC Media (audio/video streams)              │
└─────────────────────────────────────────────────────────────┘
```

### iOS Configuration

```swift
struct ChordConfig {
    // REST API
    static let apiBaseURL = "https://chord.example.com/api"

    // SignalR Hubs
    static let signalRURL = "https://chord.example.com"
    static let chatHubPath = "/hubs/chat"
    static let presenceHubPath = "/hubs/presence"

    // LiveKit (Voice/Video)
    static let liveKitURL = "wss://chord.example.com:7880"
}
```

### Android Configuration

```kotlin
object ChordConfig {
    // REST API
    const val API_BASE_URL = "https://chord.example.com/api"

    // SignalR Hubs
    const val SIGNALR_URL = "https://chord.example.com"
    const val CHAT_HUB_PATH = "/hubs/chat"
    const val PRESENCE_HUB_PATH = "/hubs/presence"

    // LiveKit (Voice/Video)
    const val LIVEKIT_URL = "wss://chord.example.com:7880"
}
```

### CORS Note

**Native mobile apps don't need CORS configuration.** CORS is a browser-only security feature. Native apps (Swift, Kotlin, React Native with native HTTP) can directly connect to all endpoints.

### Authentication Flow

```
1. POST /api/Auth/login
   Request:  { "email": "...", "password": "..." }
   Response: { "accessToken": "...", "refreshToken": "..." }

2. Store tokens securely (Keychain/KeyStore)

3. All requests include:
   Authorization: Bearer <accessToken>

4. When accessToken expires:
   POST /api/Auth/refresh
   Request:  { "refreshToken": "..." }
   Response: { "accessToken": "...", "refreshToken": "..." }
```

### SignalR Connection (iOS)

```swift
import SignalRClient

let connection = HubConnectionBuilder(url: URL(string: "\(ChordConfig.signalRURL)/hubs/chat")!)
    .withHttpConnectionOptions { options in
        options.accessTokenProvider = { accessToken }
    }
    .withAutoReconnect()
    .build()

connection.on(method: "ReceiveMessage") { (message: MessageDto) in
    print("New message: \(message.content)")
}

connection.start()
```

### SignalR Connection (Android)

```kotlin
import com.microsoft.signalr.HubConnectionBuilder

val connection = HubConnectionBuilder
    .create("${ChordConfig.SIGNALR_URL}/hubs/chat")
    .withAccessTokenProvider { accessToken }
    .build()

connection.on("ReceiveMessage", { message: MessageDto ->
    println("New message: ${message.content}")
}, MessageDto::class.java)

connection.start().blockingAwait()
```

### LiveKit Integration (iOS)

```swift
import LiveKit

let room = Room()

// Get token from backend
let tokenResponse = try await api.getVoiceToken(channelId: channelId)

// Connect to LiveKit
try await room.connect(url: tokenResponse.url, token: tokenResponse.token)

// Enable microphone
try await room.localParticipant.setMicrophone(enabled: true)

// Listen for participants
room.add(delegate: self)
```

### LiveKit Integration (Android)

```kotlin
import io.livekit.android.room.Room

val room = Room(context)

// Get token from backend
val tokenResponse = api.getVoiceToken(channelId)

// Connect to LiveKit
room.connect(tokenResponse.url, tokenResponse.token)

// Enable microphone
room.localParticipant.setMicrophoneEnabled(true)

// Listen for events
room.addListener(roomListener)
```

---

## Database Schema

> **Visual ER Diagram:** See [ER_DIAGRAM.md](../docs/ER_DIAGRAM.md) for a complete visual representation of all entities and relationships.

### Entities

| Entity             | Description                                               |
| ------------------ | --------------------------------------------------------- |
| `User`             | Authentication, profile (username, email, avatar, status) |
| `Guild`            | Discord-like servers (name, icon, owner)                  |
| `Channel`          | Text/Voice channels in guilds                             |
| `Message`          | Chat messages with attachments                            |
| `GuildMember`      | Guild membership (user, guild, nickname)                  |
| `GuildMemberRole`  | Member role assignments                                   |
| `Role`             | Guild roles with permissions                              |
| `MessageReaction`     | Emoji reactions on messages                               |
| `MessageMention`      | @mentions tracking with read status                       |
| `ChannelReadState`    | Unread message tracking                                   |
| `GuildInvite`         | Invite links                                              |
| `Friendship`          | Friend relationships (Pending, Accepted, Blocked)         |
| `DirectMessageChannel`| DM channels between users (User1Id < User2Id constraint)  |
| `DirectMessage`       | DM messages with soft delete                              |
| `AuditLog`            | Audit trail for guild actions (owner-only access)         |

### Permission Bitfield

```csharp
[Flags]
public enum GuildPermissions : long
{
    None = 0,
    ViewChannels = 1 << 0,
    SendMessages = 1 << 1,
    ManageMessages = 1 << 2,
    ManageChannels = 1 << 3,
    ManageGuild = 1 << 4,
    ManageRoles = 1 << 5,
    KickMembers = 1 << 6,
    BanMembers = 1 << 7,
    CreateInvite = 1 << 8,
    ChangeNickname = 1 << 9,
    ManageNicknames = 1 << 10,
    VoiceConnect = 1 << 11,
    VoiceSpeak = 1 << 12,
    VoiceMuteMembers = 1 << 13,
    VoiceDeafenMembers = 1 << 14,
    VoiceMoveMembers = 1 << 15,
    Administrator = 1 << 16,
    All = long.MaxValue
}
```

---

## Production Deployment

### CI/CD (Recommended)

Push to main branch for automatic deployment via GitHub Actions:

```bash
git push origin main
# Automatic: build → test → push to GHCR → deploy to VPS
```

See `docs/DEPLOYMENT.md` for full CI/CD setup.

### Manual Deployment

```bash
# 1. Clone and setup
git clone https://github.com/brckfrc/chord.git
cd chord
./setup-env.sh prod

# 2. Start services
./start-prod.sh

# 3. Deploy application
./scripts/deploy.sh --image-tag latest --registry ghcr.io --repo username/chord
```

### Docker Commands

```bash
# Start development services
docker compose -f docker-compose.dev.yml up -d

# Stop services
docker compose -f docker-compose.dev.yml down

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Fresh start (remove volumes)
docker compose -f docker-compose.dev.yml down -v
```

---

## Testing

### xUnit Tests

**Test Project:** `ChordAPI.Tests/`

**Run Tests:**
```bash
cd backend
dotnet test ChordAPI.Tests/ChordAPI.Tests.csproj
```

**Run with Coverage:**
```bash
dotnet test ChordAPI.Tests/ChordAPI.Tests.csproj --collect:"XPlat Code Coverage"
```

**Coverage Report:**
- Location: `ChordAPI.Tests/TestResults/*/coverage.cobertura.xml`
- Format: Cobertura XML
- Tool: Coverlet

**Test Statistics:**
- Total Tests: 88
- Test Framework: xUnit 2.9.2
- Mocking: Moq 4.20.72
- Database: EF Core InMemory 9.0.0

**Coverage (Core Services):**
- AuthService: ~100% (15 tests)
- GuildService: ~95% (21 tests)
- ChannelService: ~80% (14 tests)
- MessageService: ~75% (17 tests)

**Test Coverage:**
- Error handling scenarios (KeyNotFoundException, UnauthorizedAccessException)
- Edge cases (position shifting, mention extraction, soft delete)
- Success paths for all CRUD operations
- Permission checks and authorization

### Swagger UI

1. Open `http://localhost:5049/swagger`
2. Register a user via `/api/Auth/register`
3. Login via `/api/Auth/login`
4. Click "Authorize", enter `Bearer {accessToken}`
5. Test endpoints

### Postman

Import `ChordAPI.postman_collection.json` for ready-to-use requests.

**Collection includes:**
- Auth endpoints (register, login, refresh, logout, me)
- Health check endpoints
- Audit Logs endpoints (get guild audit logs with pagination)
- Friends endpoints (send request, accept, decline, block, unblock, list friends/pending/blocked)
- DMs endpoints (list, create, get messages, send, edit, delete)

**Collection Variables:**
- `baseUrl` - API base URL (default: http://localhost:5049)
- `accessToken` - JWT access token (auto-set on login/register)
- `refreshToken` - JWT refresh token (auto-set on login/register)
- `guildId` - Guild ID for testing (set manually)
- `userId` - User ID for testing (set manually)
- `dmId` - DM channel ID for testing (set manually)
- `friendId` - Friend ID for testing (set manually)
- `friendshipId` - Friendship ID for testing (set manually)
- `messageId` - Message ID for testing (set manually)

Tokens are automatically saved when you register or login. Set other variables manually for easier testing.

### SignalR Testing

```javascript
// Browser console
const connection = new signalR.HubConnectionBuilder()
  .withUrl("http://localhost:5049/hubs/chat?access_token=YOUR_JWT")
  .build();

await connection.start();
await connection.invoke("JoinChannel", "channel-guid");
```

---

## Completed Features

- ✅ User authentication (JWT, refresh tokens)
- ✅ Guilds and channels (CRUD)
- ✅ Real-time messaging (SignalR)
- ✅ File upload (MinIO, 25MB limit)
- ✅ Voice/Video chat (LiveKit SFU)
- ✅ Profile photos (auto-resize to 256x256 WebP)
- ✅ Role-based permissions (custom roles, owner/general defaults)
- ✅ Message reactions and pinning
- ✅ @Mentions with unread tracking
- ✅ Typing indicators
- ✅ User presence (online/offline/idle/dnd/invisible)
- ✅ Guild invites
- ✅ Unread message tracking
- ✅ Direct Messages (1-1 private messaging)
- ✅ Friends System (add, accept, decline, block)
- ✅ Audit logs (guild owner access, pagination, IP tracking)
- ✅ CI/CD with Blue-Green deployment

## Upcoming Features

- Audit logs frontend UI
- Notification settings
- Push notifications
- Message search
