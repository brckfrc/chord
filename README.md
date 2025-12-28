# Chord - Discord-like Real-Time Chat Application

> **Purpose:** Main project overview, features, and quick start guide.
> For detailed documentation, see the specific README files below.

Chord is a modern, real-time chat application inspired by Discord, built with .NET 9 and React.

## Documentation

| Document                                 | Description                                         |
| ---------------------------------------- | --------------------------------------------------- |
| [backend/README.md](backend/README.md)   | API endpoints, SignalR, LiveKit, mobile integration |
| [frontend/README.md](frontend/README.md) | React components, state management, UI              |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Deployment scenarios, CI/CD, production setup       |
| [chord_roadmap.md](chord_roadmap.md)     | Development phases and feature roadmap              |

---

## Features

- **Real-Time Messaging** - Instant messaging with SignalR WebSockets
- **Guilds & Channels** - Discord-like servers with text and voice channels
- **Voice & Video Chat** - LiveKit SFU for 10+ users with speaking indicators
- **Direct Messages** - 1-1 private messaging with unread tracking
- **Friends System** - Add friends, accept/decline requests, block users
- **File Upload** - Images, videos, documents (25MB limit)
- **Profile Photos** - Avatars and guild icons (auto-resized to 256x256 WebP)
- **Role-Based Permissions** - Custom roles with granular permissions
- **Message Features** - Reactions, pinning, editing, deletion, @mentions
- **User Presence** - Online, Idle, DND, Invisible, Offline statuses
- **Guild Invites** - Shareable invite links
- **Typing Indicators** - See who's typing
- **Unread Tracking** - Per-channel and per-DM unread counts

---

## Tech Stack

| Layer           | Technologies                                            |
| --------------- | ------------------------------------------------------- |
| **Backend**     | .NET 9, EF Core 9, SQL Server, Redis, SignalR, JWT      |
| **Frontend**    | React 18, TypeScript, Vite, Redux Toolkit, Tailwind CSS |
| **Voice/Video** | LiveKit (WebRTC SFU), Coturn (STUN/TURN)                |
| **Storage**     | MinIO (S3-compatible object storage)                    |
| **CI/CD**       | GitHub Actions, Docker, Blue-Green deployment           |

---

## Quick Start

### Prerequisites

- .NET 9 SDK
- Node.js 18+ (or nvm)
- Docker & Docker Compose
- Git

### Automated Setup (Recommended)

```bash
git clone https://github.com/brckfrc/chord.git
cd chord

# Development (localhost + LAN access)
./setup-env.sh dev

# Production (domain + SSL + CI/CD)
./setup-env.sh prod
```

The script automatically:

- Installs dependencies (Docker, Node.js, dotnet-ef)
- Generates secure secrets
- Starts all Docker services
- Runs database migrations
- (Production) Sets up GitHub Actions CI/CD

### After Setup

```bash
./start-dev.sh   # Start all services
./stop.sh        # Stop all services
./update-ip.sh   # Quick IP change (laptop users)
```

### Manual Setup

See [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md) for manual setup instructions.

---

## Project Structure

```
chord/
├── backend/                 # .NET 9 Web API
│   ├── Controllers/         # API endpoints
│   ├── Hubs/                # SignalR (ChatHub, PresenceHub)
│   ├── Services/            # Business logic
│   └── README.md            # Backend documentation
│
├── frontend/                # React + TypeScript
│   ├── src/
│   │   ├── components/      # UI components
│   │   ├── store/           # Redux state
│   │   └── hooks/           # Custom hooks
│   └── README.md            # Frontend documentation
│
├── scripts/                 # Deployment scripts
│   ├── deploy.sh            # Blue-green deployment
│   └── rollback.sh          # Rollback utility
│
├── docs/
│   └── DEPLOYMENT.md        # Deployment guide
│
├── setup-env.sh             # Automated setup script
├── start-dev.sh             # Start development
├── stop.sh                  # Stop all services
└── chord_roadmap.md         # Development roadmap
```

---

## Development

### Initial Setup

```bash
git clone https://github.com/brckfrc/chord.git
cd chord
npm install      # Installs husky (pre-commit hooks)
```

### Pre-commit Hooks

This project uses **Husky** + **lint-staged** for automatic code quality checks:

```
git commit → pre-commit hook → ESLint on staged files
                                    ↓
                          Error? → Commit blocked ❌
                          Only warnings? → Commit OK ✅
```

- **Errors** block the commit (must be fixed)
- **Warnings** are allowed (fix later)

### Backend

```bash
cd backend
dotnet watch run              # Hot reload
dotnet ef migrations add Name # New migration
dotnet ef database update     # Apply migrations
```

### Frontend

```bash
cd frontend
npm install      # Install dependencies
npm run dev      # Development server
npm run build    # Production build
npm run lint     # ESLint
```

### API Documentation

- **Swagger UI**: http://localhost:5049/swagger
- **Health Check**: http://localhost:5049/health

---

## Deployment

For production deployment options:

- **CI/CD Blue-Green** - Automated with GitHub Actions
- **Behind Proxy** - YunoHost, Traefik, Nginx
- **Standalone** - Single server with Caddy

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed instructions.

---

## Security

- BCrypt password hashing
- JWT authentication with refresh tokens
- Rate limiting (100 req/min)
- CORS protection
- Input validation (FluentValidation)
- SQL injection protection (EF Core)

---

## License

MIT License - see LICENSE file.

## Contributing

Contributions welcome! Please open an issue or submit a Pull Request.
