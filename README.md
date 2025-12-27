# 🎙️ Chord - Discord-like Real-Time Chat Application

Chord is a modern, real-time chat application inspired by Discord, built with .NET 9 and React. It features guilds (servers), channels, real-time messaging via SignalR, voice channel presence, reactions, pinned messages, and more.

## 🚀 Features

- **Real-Time Messaging**: Instant messaging with SignalR WebSockets
- **Guilds & Channels**: Create and manage Discord-like servers with text and voice channels
- **Voice & Video Chat**: Real-time voice/video communication with LiveKit SFU (10+ users)
- **Speaking Indicators**: See who's talking with animated green rings
- **File Upload & Attachments**: Upload images, videos, and documents (25MB limit)
- **Profile Photos**: Upload avatars for users and icons for guilds (auto-resized to 256x256 WebP)
- **Role-Based Permissions**: Custom roles with granular permissions (ManageGuild, ManageChannels, etc.)
- **Guild Settings**: Tabbed settings modal for managing overview, roles, and members
- **Message Reactions**: React to messages with emojis
- **Pinned Messages**: Pin important messages to the top
- **Unread Tracking**: Track unread messages per channel
- **User Status**: Online, Idle, Do Not Disturb, Invisible, and Offline statuses
- **Guild Invites**: Invite users to your guilds with shareable links
- **Member List**: See all guild members with online/offline status
- **Typing Indicators**: See when someone is typing
- **Message Editing & Deletion**: Edit or delete your messages with instant updates
- **Message Grouping**: Discord-like message grouping for better readability
- **@Mentions**: Mention users with autocomplete and notification
- **Plug-and-Play Deployment**: Easy setup with Docker and optional Caddy reverse proxy

## 🛠️ Tech Stack

### Backend

- **.NET 9.0** - Web API framework
- **Entity Framework Core 9** - ORM
- **SQL Server** - Primary database
- **Redis** - Caching & SignalR backplane
- **MinIO** - Object storage for file uploads
- **LiveKit** - WebRTC SFU for voice/video
- **Coturn** - STUN/TURN server for NAT traversal
- **SignalR** - Real-time WebSocket communication
- **JWT** - Authentication
- **BCrypt** - Password hashing
- **Serilog** - Structured logging
- **AutoMapper** - Object mapping
- **FluentValidation** - Input validation
- **ImageSharp** - Server-side image processing

### Frontend

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Redux Toolkit** - State management
- **React Router** - Routing
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **SignalR Client** - Real-time communication
- **LiveKit Client** - WebRTC voice/video
- **React Hook Form + Zod** - Form validation

## 📋 Prerequisites

- **.NET 9 SDK** - [Download](https://dotnet.microsoft.com/download/dotnet/9.0)
- **Node.js 18+** - [Download](https://nodejs.org/) (or use nvm - script can install it)
- **Docker & Docker Compose** - [Download](https://www.docker.com/get-started)
- **Git** - [Download](https://git-scm.com/)

## ⚡ Automated Setup (Recommended)

The easiest way to get Chord running is with the automated setup script:

```bash
git clone https://github.com/brckfrc/chord.git
cd chord

# For development (localhost + LAN access)
./setup-env.sh dev

# For production (with domain and SSL)
./setup-env.sh prod
```

The script will:

- ✅ Check and install dependencies (Docker, Node.js via nvm, dotnet-ef)
- ✅ Detect your LAN IP for network access
- ✅ Generate secure secrets (SQL, JWT, MinIO, LiveKit, TURN)
- ✅ Create all configuration files from templates
- ✅ Start Docker services (SQL Server, Redis, MinIO, LiveKit, Coturn)
- ✅ Run database migrations
- ✅ Configure MinIO bucket with public access
- ✅ Configure firewall rules (if sudo available)
- ✅ Generate `start-dev.sh` and `stop.sh` helper scripts
- ✅ (Production) Setup GitHub Actions CI/CD with SSH key generation

After setup completes:

```bash
./start-dev.sh   # Start all services
./stop.sh        # Stop all services
```

### Changing Networks (Laptop Users)

If you change WiFi networks and need to update your IP:

```bash
./update-ip.sh   # Quick IP update without full setup
```

> **Note:** For manual setup or customization, see the detailed instructions below.

---

## 🚀 Manual Setup (Quick Start)

### 1. Clone the Repository

```bash
git clone https://github.com/brckfrc/chord.git
cd chord
```

### 2. Backend Setup

```bash
cd backend

# Copy environment template
cp .env.example .env

# Edit .env with your values (see Configuration section)
nano .env

# Start SQL Server, Redis, and MinIO
docker compose -f docker-compose.dev.yml up -d

# Apply database migrations
dotnet ef database update

# Run the backend
dotnet run
```

Backend will be available at:

- **API**: `http://localhost:5049`
- **Swagger**: `http://localhost:5049/swagger`

### 3. Frontend Setup

```bash
cd frontend

# Copy environment template
cp .env.example .env

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:5173`

## ⚙️ Configuration

### Backend Environment Variables

Create a `.env` file in the `backend/` directory (copy from `.env.example`):

```env
# Database
SQL_SA_PASSWORD=YourStrongPassword123!
DATABASE_NAME=ChordDB

# JWT
JWT_SECRET=YourSuperSecretJWTKeyMin32CharactersLong
JWT_ISSUER=ChordAPI
JWT_AUDIENCE=ChordClient

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Redis (optional, defaults shown)
REDIS_CONNECTION_STRING=localhost:6379

# MinIO (optional, defaults shown)
MINIO_ENDPOINT=localhost:9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_ACCESS_KEY=minioadmin      # Same as ROOT_USER (for backend API)
MINIO_SECRET_KEY=minioadmin      # Same as ROOT_PASSWORD (for backend API)
MINIO_BUCKET_NAME=chord-uploads
MINIO_USE_SSL=false

# LiveKit (Voice/Video)
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=your-secret-key
LIVEKIT_URL=ws://localhost:7880
LIVEKIT_NODE_IP=192.168.1.x      # Your LAN IP for network access
```

⚠️ **Never commit `.env` files to git** - they're already in `.gitignore`

### Frontend Environment Variables

Create a `.env` file in the `frontend/` directory:

```env
# REST API Base URL (must include /api prefix)
VITE_API_BASE_URL=http://localhost:5049/api

# SignalR Base URL (without /api prefix, required)
VITE_SIGNALR_BASE_URL=http://localhost:5049
```

**Important Notes:**

- `VITE_API_BASE_URL` **must include `/api` prefix** (e.g., `http://localhost:5049/api`)
  - This is required because all REST API endpoints are mapped under `/api` route
  - If you omit `/api`, you'll get 404 errors on API calls
- `VITE_SIGNALR_BASE_URL` is required
  - SignalR hubs are mapped at root level (`/hubs/chat`, `/hubs/presence`), not under `/api`
  - **Do not include trailing slash** - hubUrl already starts with `/` (e.g., use `http://localhost:5049` not `http://localhost:5049/`)

## 🐳 Docker Deployment

### Development

```bash
# Start services (SQL Server, Redis, MinIO)
docker compose -f backend/docker-compose.dev.yml up -d

# Stop services
docker compose -f backend/docker-compose.dev.yml down
```

**Services:**

| Service       | Port | Description                    |
| ------------- | ---- | ------------------------------ |
| SQL Server    | 1433 | Primary database               |
| Redis         | 6379 | Cache & SignalR                |
| MinIO API     | 9000 | Object storage                 |
| MinIO Console | 9001 | Web UI (minioadmin/minioadmin) |

### Production Deployment

#### Prerequisites on Server

- Docker & Docker Compose installed
- Git installed
- Domain name (optional, for SSL)

#### Deployment Steps

**1. Clone the repository:**

```bash
git clone https://github.com/brckfrc/chord.git
cd chord/backend
```

**2. Create production `.env` file:**

```bash
cp .env.example .env
nano .env
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
# Wait for SQL Server to be healthy
docker exec chord-api dotnet ef database update
```

**8. Verify deployment:**

```bash
# Check all containers are running
docker ps

# Check API health
curl http://localhost:5000/health

# View logs
docker compose -f docker-compose.prod.yml logs -f
```

### Reverse Proxy (Nginx/Caddy)

The API runs on port 5000. Use a reverse proxy for SSL/TLS and domain routing.

**Example Nginx configuration:**

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**SSL with Let's Encrypt:**

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

### Frontend Production Build

```bash
cd frontend

# Copy environment template and update with production URLs
cp .env.example .env
# Edit .env with production API URLs (e.g., https://api.yourdomain.com)

# Install dependencies
npm install

# Build for production
npm run build

# The dist/ folder contains the production build
# Serve with Nginx, Apache, or any static file server
```

**Example Nginx configuration for frontend:**

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    root /path/to/chord/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 🔄 CI/CD with Blue-Green Deployment

Chord includes GitHub Actions CI/CD with zero-downtime Blue-Green deployment.

### How It Works

1. Push to `main` branch
2. GitHub Actions builds and tests the code
3. Docker images are pushed to GitHub Container Registry (GHCR)
4. Deploy script SSHs to VPS and performs blue-green switch
5. Health check passes → traffic switches to new version
6. Previous version stops automatically

### Quick Setup (Production)

When running `./setup-env.sh prod`, the script will:

- Generate SSH deploy key
- Display GitHub Secrets you need to add
- Configure everything automatically

**Required GitHub Secrets:**

| Secret            | Description                                 |
| ----------------- | ------------------------------------------- |
| `VPS_HOST`        | Server IP or domain                         |
| `VPS_USER`        | SSH username                                |
| `VPS_SSH_KEY`     | SSH private key (generated by setup script) |
| `VPS_SSH_PORT`    | SSH port (default: 22)                      |
| `VPS_DEPLOY_PATH` | Deployment path (e.g., `/opt/chord`)        |

### Manual Deploy & Rollback

```bash
# Check deployment status
./scripts/rollback.sh --status

# Manual rollback to previous version
./scripts/rollback.sh

# Rollback to specific stack
./scripts/rollback.sh --to blue
```

For detailed CI/CD documentation, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## 📁 Project Structure

```
chord/
├── backend/                 # .NET 9 Web API
│   ├── Controllers/         # API endpoints
│   ├── Hubs/                # SignalR hubs (ChatHub, PresenceHub)
│   ├── Models/
│   │   ├── Entities/        # Database entities
│   │   └── DTOs/            # Data transfer objects
│   ├── Services/            # Business logic
│   ├── Data/                # DbContext
│   ├── Middleware/          # Custom middleware
│   ├── Migrations/          # EF Core migrations
│   └── docker-compose.*.yml # Docker configurations
│
├── frontend/                # React + TypeScript
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── store/           # Redux store
│   │   ├── lib/             # Utilities & API clients
│   │   └── hooks/           # Custom React hooks
│   └── public/              # Static assets
│
└── README.md                # This file
```

## 🔧 Development

### Backend

```bash
cd backend

# Run with hot reload
dotnet watch run

# Create new migration
dotnet ef migrations add YourMigrationName

# Apply migrations
dotnet ef database update

# View logs
tail -f Logs/chord-*.log
```

### Frontend

```bash
cd frontend

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📚 API Documentation

Once the backend is running, visit:

- **Swagger UI**: `http://localhost:5049/swagger`
- **Health Check**: `http://localhost:5049/health`

## 🧪 Testing

### Backend

```bash
cd backend

# Run tests
dotnet test
```

### Frontend

```bash
cd frontend

# Run tests (if configured)
npm test
```

## 🔐 Security

- Passwords are hashed using BCrypt
- JWT tokens for authentication
- Refresh token rotation
- Rate limiting (100 requests/minute default)
- CORS protection
- Input validation with FluentValidation
- SQL injection protection via EF Core parameterized queries

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Note**: This is an active development project. See `chord_roadmap.md` for detailed feature roadmap and development phases.
