# Chord - Discord-like Real-Time Chat Application

> **Purpose:** Main project overview, features, and quick start guide.
> For detailed documentation, see the specific README files below.

> **Note:** The project final report is available in the root directory: [21290270.pdf](./21290270.pdf)

> **Project Presentation Video:** [YouTube](https://youtu.be/o0pG1QwQ9CI)

Chord is a modern, real-time chat application inspired by Discord, built with .NET 9 and React.

🌐 **Live Demo:** [chord.borak.dev](https://chord.borak.dev)

## Documentation

| Document                                     | Description                                         |
| -------------------------------------------- | --------------------------------------------------- |
| [backend/README.md](backend/README.md)       | API endpoints, SignalR, LiveKit, mobile integration |
| [frontend/README.md](frontend/README.md)     | React components, state management, UI              |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)     | Deployment scenarios, CI/CD, production setup       |
| [docs/ER_DIAGRAM.md](docs/ER_DIAGRAM.md)     | Database schema ER diagram (Mermaid)                |
| [docs/DEMO.md](docs/DEMO.md)                 | Complete demo scenario covering all features        |
| [docs/LOAD-TESTING.md](docs/LOAD-TESTING.md) | K6 load testing guide (1K concurrent users)         |
| [chord_roadmap.md](chord_roadmap.md)         | Development phases and feature roadmap              |

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
- **Audit Logs** - Track guild actions (owner-only, paginated)

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
├── backend/                       # .NET 9 Web API
│   ├── Controllers/               # API endpoints
│   ├── Hubs/                      # SignalR (ChatHub, PresenceHub)
│   ├── Services/                  # Business logic
│   ├── docker-compose.dev.yml     # Development infrastructure
│   ├── docker-compose.standalone.yml # Backend standalone (deprecated)
│   └── README.md                  # Backend documentation
│
├── frontend/                      # React + TypeScript
│   ├── src/
│   │   ├── components/            # UI components
│   │   ├── store/                 # Redux state
│   │   └── hooks/                 # Custom hooks
│   └── README.md                  # Frontend documentation
│
├── scripts/                       # Deployment scripts
│   ├── deploy.sh                  # Blue-green deployment
│   ├── rollback.sh                # Rollback utility
│   └── setup-infra.sh             # Infrastructure setup automation
│
├── docs/                          # Documentation
│   ├── DEPLOYMENT.md              # Deployment overview & decision tree
│   ├── DEPLOYMENT-STANDALONE.md   # Fresh server + Caddy guide
│   ├── DEPLOYMENT-STANDARD.md     # Existing reverse proxy guide
│   ├── DEPLOYMENT-YUNOHOST.md     # YunoHost-specific guide
│   └── ER_DIAGRAM.md              # Database ER diagram (Mermaid)
│
├── docker-compose.standalone.yml  # Standalone deployment (Caddy + blue-green)
├── docker-compose.deploy.yml      # Standard VPS deployment (blue-green)
├── docker-compose.yunohost.yml    # YunoHost overrides (security)
│
├── setup-env.sh                   # Automated setup script
├── start-dev.sh                   # Start development
├── stop.sh                        # Stop all services
└── chord_roadmap.md               # Development roadmap
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

### Commit Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```bash
feat: add new feature
fix: fix bug
chore: update dependencies
docs: update documentation
style: format code
refactor: refactor code
test: add tests
```

**Skip CI/CD:**

```bash
git commit -m "docs: update README [skip ci]"
git commit -m "chore: cleanup [ci skip]"
```

Supported skip keywords: `[skip ci]`, `[ci skip]`, `[no ci]`, `[skip actions]`, `[actions skip]`

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

### Testing

```bash
cd frontend
npm run test:e2e      # Run Playwright E2E tests (Login → Guild → Message)
npm run test:e2e:ui   # Run tests in UI mode
```

E2E tests use an isolated Docker Compose test environment. See [frontend/README.md](frontend/README.md) for details.

**Load Testing:**

```bash
npm run test:load        # Full load test (1K concurrent users, ~8 minutes)
npm run test:load:smoke  # Smoke test (10 users, 30 seconds)
```

Load tests validate API performance under high concurrent load. See [docs/LOAD-TESTING.md](docs/LOAD-TESTING.md) for details.

### API Documentation

- **Swagger UI**: http://localhost:5049/swagger
- **Health Check**: http://localhost:5049/health

---

## Deployment

Three deployment scenarios with blue-green support:

| Scenario         | When to Use                              | Guide                                                     |
| ---------------- | ---------------------------------------- | --------------------------------------------------------- |
| **Standalone**   | Fresh server, no existing infrastructure | [DEPLOYMENT-STANDALONE.md](docs/DEPLOYMENT-STANDALONE.md) |
| **Standard VPS** | Have Nginx, Traefik, or Apache           | [DEPLOYMENT-STANDARD.md](docs/DEPLOYMENT-STANDARD.md)     |
| **YunoHost**     | Using YunoHost for self-hosting          | [DEPLOYMENT-YUNOHOST.md](docs/DEPLOYMENT-YUNOHOST.md)     |

**YunoHost Note:** YunoHost uses an automated blue-green strategy where:

- **Blue stack (5002/3002)**: Staging environment - deploy new versions here first
- **Green stack (5003/3003)**: Production - Nginx always routes to green
- After blue stack health checks pass, automatically deploy to green, then stop blue
- No manual Nginx config changes needed (Nginx is static, always points to green)

**Quick Start:**

```bash
# Standalone (includes Caddy)
docker compose -f docker-compose.standalone.yml --profile infra up -d
docker compose -f docker-compose.standalone.yml --profile blue --profile caddy up -d

# Standard VPS (bring your own reverse proxy)
docker compose -f docker-compose.deploy.yml --profile infra up -d
docker compose -f docker-compose.deploy.yml --profile blue up -d

# YunoHost (with security overrides)
docker compose -f docker-compose.deploy.yml -f docker-compose.yunohost.yml --profile infra up -d
docker compose -f docker-compose.deploy.yml -f docker-compose.yunohost.yml --profile blue up -d
```

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the decision tree and detailed instructions.

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
