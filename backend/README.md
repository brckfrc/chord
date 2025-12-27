# Chord API - Backend

ASP.NET Core backend for Chord, a Discord-like real-time chat application.

**Repository:** [https://github.com/brckfrc/chord.git](https://github.com/brckfrc/chord.git)

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
- **Minio SDK 6.0.3** - MinIO client
- **LiveKit Server SDK 1.0.8** - LiveKit token generation

## Prerequisites

- .NET 9 SDK
- Docker & Docker Compose (for SQL Server & Redis)

## ⚡ Quick Setup with Script

For the fastest setup, use the automated script from the project root:

```bash
cd ..  # Go to project root
./setup-env.sh dev
```

This will automatically configure everything including environment variables, Docker services, and database migrations. For manual setup, continue below.

---

## Getting Started (Manual)

### 1. Setup Environment Variables

```bash
# Copy template and edit with your passwords
cp .env.example .env
nano .env  # or use any editor
```

### 2. Start Database & Redis

```bash
docker compose -f docker-compose.dev.yml up -d
```

This will start:

| Service       | Port       | Description                    |
| ------------- | ---------- | ------------------------------ |
| SQL Server    | 1433       | Primary database               |
| Redis         | 6379       | Cache & SignalR backplane      |
| MinIO API     | 9000       | Object storage                 |
| MinIO Console | 9001       | Web UI (minioadmin/minioadmin) |
| LiveKit       | 7880, 7881 | WebRTC signaling & media       |
| Coturn        | 3478       | STUN/TURN server               |

### 3. Apply Migrations

```bash
# Initial migration already exists
# For new migrations: dotnet ef migrations add YourMigrationName
dotnet ef database update
```

### 4. Run the Application

```bash
dotnet run
```

The API will be available at:

- HTTP: `http://localhost:5049`
- HTTPS: `https://localhost:7224`
- Swagger: `http://localhost:5049/swagger`

## Project Structure

```
backend/
├── Controllers/       # API endpoints
│   ├── UploadController.cs   # File upload endpoint
│   └── VoiceController.cs    # Voice channel token endpoint
├── Hubs/             # SignalR hubs
│   ├── ChatHub.cs    # Messaging & voice channel join
│   └── PresenceHub.cs # User presence
├── Models/
│   ├── Entities/     # Database entities
│   └── DTOs/         # Data transfer objects
│       ├── UploadResponseDto.cs      # Upload response
│       ├── AttachmentDto.cs          # Message attachment
│       ├── VoiceTokenDto.cs          # Voice token request/response
│       └── VoiceJoinResponseDto.cs   # Voice join response
├── Data/             # DbContext
├── Services/         # Business logic
│   ├── IStorageService.cs   # Storage interface
│   ├── StorageService.cs    # MinIO implementation
│   ├── IVoiceService.cs     # Voice service interface
│   └── VoiceService.cs      # LiveKit token generation
├── Middleware/       # Custom middleware
├── Migrations/       # EF Core migrations
├── livekit.yaml      # LiveKit server config
├── turnserver.conf   # Coturn config
├── Caddyfile         # Caddy reverse proxy config
├── setup.sh          # Deployment setup script
├── docker-compose.dev.yml       # Development services
├── docker-compose.prod.yml      # Production services
├── docker-compose.standalone.yml # Standalone with Caddy
└── Program.cs        # Application entry point
```

## Configuration

### Environment Variables (.env)

**All secrets are stored in `.env` file** - copy `.env.example` and fill your values:

```bash
cp .env.example .env
```

**Required variables:**

- `SQL_SA_PASSWORD` - SQL Server password
- `JWT_SECRET` - JWT signing key (min 32 chars)
- `DATABASE_NAME` - Database name (default: ChordDB)
- `CORS_ORIGINS` - Allowed frontend URLs (comma-separated)

**Optional variables (with defaults):**

- `MINIO_ENDPOINT` - MinIO endpoint (default: localhost:9000)
- `MINIO_ROOT_USER` - MinIO root username for container (default: minioadmin)
- `MINIO_ROOT_PASSWORD` - MinIO root password for container (default: minioadmin)
- `MINIO_ACCESS_KEY` - MinIO access key for backend API (same as ROOT_USER)
- `MINIO_SECRET_KEY` - MinIO secret key for backend API (same as ROOT_PASSWORD)
- `MINIO_BUCKET_NAME` - Bucket name (default: chord-uploads)
- `MINIO_USE_SSL` - Use SSL (default: false)
- `MINIO_PUBLIC_ENDPOINT` - Public URL for file access (default: http://localhost:9000)

**LiveKit variables:**

- `LIVEKIT_API_KEY` - LiveKit API key (default: devkey)
- `LIVEKIT_API_SECRET` - LiveKit API secret (generated by setup script)
- `LIVEKIT_URL` - LiveKit WebSocket URL (default: ws://localhost:7880)
- `LIVEKIT_NODE_IP` - Node IP for LAN access (your machine's LAN IP)

⚠️ **Never commit `.env` to git** - already in `.gitignore`

## Docker Commands

```bash
# Start containers
docker compose -f docker-compose.dev.yml up -d

# Stop containers
docker compose -f docker-compose.dev.yml down

# View logs
docker compose -f docker-compose.dev.yml logs -f

# Remove volumes (fresh start)
docker compose -f docker-compose.dev.yml down -v
```

## Production Deployment

### Prerequisites on Server

- Docker & Docker Compose
- Git

**That's it!** Everything else runs in Docker containers.

### Deployment Steps

**1. Clone the repository:**

```bash
git clone https://github.com/brckfrc/chord.git
cd chord/backend
```

**2. Create production `.env` file:**

```bash
cp .env.example .env
nano .env  # or vim, use your preferred editor
```

**3. Generate strong secrets:**

```bash
# Generate SQL Server password
openssl rand -base64 32

# Generate JWT secret (min 32 chars)
openssl rand -base64 48
```

**4. Update `.env` with production values:**

```env
SQL_SA_PASSWORD=<generated-password>
JWT_SECRET=<generated-jwt-secret>
CORS_ORIGINS=https://yourdomain.com,https://api.yourdomain.com
```

**5. Secure the `.env` file:**

```bash
chmod 600 .env
```

**6. Build and start all services:**

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

**7. Apply database migrations:**

```bash
# Wait for SQL Server to be healthy (check with: docker ps)
docker exec chord-api dotnet ef database update
```

**8. Verify deployment:**

```bash
# Check all containers are healthy
docker ps

# Check API health
curl http://localhost:5000/health

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

### Using Cloud Secret Managers (Optional but Recommended)

Instead of `.env` file, use cloud provider secrets:

- **Azure**: Azure Key Vault
- **AWS**: AWS Secrets Manager / Parameter Store
- **DigitalOcean**: App Platform Environment Variables
- **Google Cloud**: Secret Manager

### Reverse Proxy (Nginx/Caddy)

The API runs on port 5000. Use a reverse proxy for:

- SSL/TLS termination
- Domain routing
- Load balancing

**Example Nginx config:**

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

### Production Commands

```bash
# Stop all services
docker compose -f docker-compose.prod.yml down

# Update to latest code
git pull
docker compose -f docker-compose.prod.yml up -d --build

# View logs
docker compose -f docker-compose.prod.yml logs -f api

# Database backup
docker exec chord-sqlserver /opt/mssql-tools/bin/sqlcmd \
  -S localhost -U sa -P "$SQL_SA_PASSWORD" \
  -Q "BACKUP DATABASE [ChordDB] TO DISK = N'/var/opt/mssql/backup/ChordDB.bak'"

# Restart specific service
docker compose -f docker-compose.prod.yml restart api

# MinIO console (web UI for file management)
# Access: http://localhost:9001 (login: minioadmin/minioadmin)
```

### MinIO Configuration (Production)

For production, update MinIO credentials in `.env`:

```env
# MinIO container credentials
MINIO_ROOT_USER=your-secure-username
MINIO_ROOT_PASSWORD=your-secure-password

# Backend API credentials (must match above)
MINIO_ACCESS_KEY=your-secure-username
MINIO_SECRET_KEY=your-secure-password

# Public endpoint for file URLs
MINIO_PUBLIC_ENDPOINT=https://files.yourdomain.com
```

**Important:** In production, use a reverse proxy (Nginx/Caddy) to serve MinIO files over HTTPS.

### LiveKit Configuration (Production)

For production with voice/video, configure LiveKit in `.env`:

```env
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-strong-secret
LIVEKIT_URL=wss://livekit.yourdomain.com
LIVEKIT_NODE_IP=your-server-public-ip
```

**Note:** In production, LiveKit requires a public IP and proper TURN server configuration for NAT traversal.

## Development

- Use C# extension for VSCode/Cursor
- Hot reload is enabled by default
- Check `Logs/` directory for application logs

## Completed Features

- ✅ **File Upload & Video Support**: MinIO object storage, 25MB limit, image/video/document support, drag-drop upload, progress tracking
- ✅ **WebRTC Voice Channels**: LiveKit SFU integration, multi-user voice chat, speaking indicators
- ✅ **Profile Photos**: Avatar upload for users and guild icons, auto-resize to 256x256 WebP
- ✅ **Role-Based Permissions**: Custom roles with granular permissions, owner/general default roles
- ✅ **Guild Settings**: Tabbed modal for overview, roles, and member management
- ✅ **Automated Setup**: `setup-env.sh` script for easy local and production deployment

## Upcoming Features

- Direct Messages & Friends (friendship system, DM channels, friend-only messaging)
- Testing, observability & audit logs (unit tests, integration tests, OpenTelemetry, audit trail)
- Performance, security & notification settings (load testing, rate limiting improvements, notification preferences)
- CI/CD pipeline (GitHub Actions, automated deployment)

---

## API Endpoints

### Authentication ✅

| Method | Endpoint             | Description              | Auth Required |
| ------ | -------------------- | ------------------------ | ------------- |
| POST   | `/api/Auth/register` | Register new user        | No            |
| POST   | `/api/Auth/login`    | Login with credentials   | No            |
| POST   | `/api/Auth/refresh`  | Refresh access token     | No            |
| GET    | `/api/Auth/me`       | Get current user profile | Yes           |
| POST   | `/api/Auth/logout`   | Logout user              | Yes           |

### File Upload ✅

| Method | Endpoint      | Description                  | Auth Required |
| ------ | ------------- | ---------------------------- | ------------- |
| POST   | `/api/Upload` | Upload file (max 25MB)       | Yes           |
| DELETE | `/api/Upload` | Delete file (query: fileUrl) | Yes           |

**Supported file types:**

| Type     | Formats                             | Max Size |
| -------- | ----------------------------------- | -------- |
| Image    | jpg, png, gif, webp                 | 25MB     |
| Video    | mp4, webm, quicktime                | 25MB     |
| Document | pdf, docx, xlsx, txt, csv, zip, rar | 25MB     |

### Voice Channels ✅

| Method | Endpoint               | Description             | Auth Required |
| ------ | ---------------------- | ----------------------- | ------------- |
| POST   | `/api/Voice/token`     | Get LiveKit room token  | Yes           |
| GET    | `/api/Voice/room/{id}` | Get room status (debug) | Yes           |

**Request body for POST `/api/Voice/token`:**

```json
{
  "channelId": "guid-of-voice-channel"
}
```

**Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "url": "ws://localhost:7880",
  "roomName": "voice_channel-guid"
}
```

### Guilds ✅

| Method | Endpoint                            | Description        | Auth Required |
| ------ | ----------------------------------- | ------------------ | ------------- |
| POST   | `/api/Guilds`                       | Create guild       | Yes           |
| GET    | `/api/Guilds`                       | List user's guilds | Yes           |
| GET    | `/api/Guilds/{id}`                  | Get guild details  | Yes           |
| PUT    | `/api/Guilds/{id}`                  | Update guild       | Yes (Owner)   |
| DELETE | `/api/Guilds/{id}`                  | Delete guild       | Yes (Owner)   |
| POST   | `/api/Guilds/{id}/members`          | Add member         | Yes           |
| DELETE | `/api/Guilds/{id}/members/{userId}` | Remove member      | Yes           |

---

## Database Schema

### Current Entities

- **Users**: Authentication, profile (Id, Username, Email, PasswordHash, DisplayName, AvatarUrl, RefreshToken, timestamps)
- **Guilds**: Discord-like servers (Id, Name, Description, IconUrl, OwnerId, timestamps)
- **Channels**: Text/Voice channels in guilds (Id, GuildId, Name, Type, Topic, Position, CreatedAt)
- **Messages**: Chat messages with attachments (Id, ChannelId, AuthorId, Content, Attachments JSON, timestamps, IsEdited)
- **GuildMembers**: Many-to-many relationship (GuildId, UserId, JoinedAt, Nickname, Role)

---

## Testing

### Manual Testing

1. **Swagger UI**: `http://localhost:5049/swagger`

   - Register a user
   - Login to get tokens
   - Click "Authorize" button, enter `Bearer {accessToken}`
   - Test protected endpoints

2. **Postman**: Import `ChordAPI.postman_collection.json`

### Automated Tests

🔄 xUnit test project in progress
