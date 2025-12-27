# Chord Deployment Guide

> **Purpose:** Production deployment scenarios, CI/CD setup, environment configuration,
> and infrastructure management. For API documentation, see [backend/README.md](../backend/README.md).

This guide covers different deployment scenarios for Chord.

## Deployment Options

| Option                                               | Best For                           | Complexity |
| ---------------------------------------------------- | ---------------------------------- | ---------- |
| [Development](#development-local)                    | Local testing                      | Easy       |
| [CI/CD Blue-Green](#cicd-with-blue-green-deployment) | Automated production (recommended) | Medium     |
| [Behind Proxy](#production---behind-reverse-proxy)   | YunoHost, Traefik, etc.            | Medium     |
| [Standalone](#production---standalone-with-caddy)    | Simple single server               | Easy       |
| [Mobile App](#mobile-app-integration)                | iOS/Android native apps            | Easy       |

---

## Development (Local)

For local development with hot reload:

### 1. Start Infrastructure

```bash
cd backend
docker compose -f docker-compose.dev.yml up -d
```

This starts:

- SQL Server (:1433)
- Redis (:6379)
- MinIO (:9000, :9001)
- LiveKit (:7880, :7881)
- Coturn (:3478)

### 2. Run API

```bash
cd backend
cp .env.example .env  # First time only
dotnet run
```

### 3. Run Frontend

```bash
cd frontend
npm install  # First time only
npm run dev
```

Access:

- Frontend: http://localhost:5173
- API: http://localhost:5049
- Swagger: http://localhost:5049/swagger
- MinIO Console: http://localhost:9001

---

## CI/CD with Blue-Green Deployment

Automated deployment using GitHub Actions and Blue-Green strategy for zero-downtime updates.

### Architecture

```
GitHub Push → Build Images → Push to GHCR → SSH Deploy → Blue-Green Switch
```

- **Blue Stack**: API on :5000, Frontend on :3000
- **Green Stack**: API on :5001, Frontend on :3001
- **Caddy**: Routes traffic to active stack

### Prerequisites

1. VPS with Docker installed
2. GitHub repository with Actions enabled
3. SSH key for deployment

### Setup GitHub Secrets

In your GitHub repository, go to **Settings → Secrets and variables → Actions** and add:

| Secret            | Description         | Example                 |
| ----------------- | ------------------- | ----------------------- |
| `VPS_HOST`        | Server hostname/IP  | `chord.example.com`     |
| `VPS_USER`        | SSH username        | `deploy`                |
| `VPS_SSH_KEY`     | SSH private key     | `-----BEGIN OPENSSH...` |
| `VPS_SSH_PORT`    | SSH port (optional) | `22`                    |
| `VPS_DEPLOY_PATH` | Deployment path     | `/opt/chord`            |

### Initial Server Setup

```bash
# 1. Clone repository on server
cd /opt
git clone https://github.com/brckfrc/chord.git
cd chord

# 2. Run environment setup
chmod +x setup-env.sh
./setup-env.sh  # Select "prod" mode

# 3. Start infrastructure
docker compose -f docker-compose.deploy.yml --profile infra up -d

# 4. Create deploy user (optional, recommended)
useradd -m -s /bin/bash deploy
usermod -aG docker deploy
```

### How It Works

1. **Push to main** triggers GitHub Actions
2. **CI Job** runs tests and linting
3. **Build Job** creates Docker images and pushes to GHCR
4. **Deploy Job** connects via SSH and runs `scripts/deploy.sh`
5. **deploy.sh** performs:
   - Detects active stack (blue or green)
   - Pulls new images
   - Starts inactive stack
   - Health check (60s timeout)
   - Updates Caddy to route to new stack
   - Stops old stack

### Manual Deployment

```bash
# Deploy specific version
./scripts/deploy.sh \
  --image-tag abc123 \
  --registry ghcr.io \
  --repo username/chord

# Check status
./scripts/rollback.sh --status

# Manual rollback
./scripts/rollback.sh
```

### Blue-Green Commands

```bash
# Start infrastructure only
docker compose -f docker-compose.deploy.yml --profile infra up -d

# Start blue stack
docker compose -f docker-compose.deploy.yml --profile blue up -d

# Start green stack
docker compose -f docker-compose.deploy.yml --profile green up -d

# View logs
docker compose -f docker-compose.deploy.yml logs -f api-blue
docker compose -f docker-compose.deploy.yml logs -f api-green
```

### Rollback

If deployment fails, the script automatically rolls back. For manual rollback:

```bash
# Switch to previous stack
./scripts/rollback.sh

# Switch to specific stack
./scripts/rollback.sh --to blue
```

---

## Production - Behind Reverse Proxy

Use this when you have an existing reverse proxy (YunoHost, Traefik, nginx, etc.)

### 1. Configure Environment

```bash
cd backend
cp .env.example .env
nano .env
```

**Important:** Set secure passwords and disable external port bindings:

```env
# Secure passwords
SQL_SA_PASSWORD=YourVerySecurePassword123!
JWT_SECRET=YourRandomlyGeneratedSecretAtLeast32Chars

# Disable external port bindings (optional)
API_PORT=
SQL_PORT=
REDIS_PORT=
MINIO_API_PORT=
MINIO_CONSOLE_PORT=

# Keep TURN port open for NAT traversal
TURN_PORT=3478
TURN_NETWORK_MODE=host
```

### 2. Start Services

```bash
docker compose -f docker-compose.prod.yml up -d
```

### 3. Configure Your Reverse Proxy

#### YunoHost

Add nginx config for your domain:

```nginx
location /api/ {
    proxy_pass http://chord-api:80;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}

location /hubs/ {
    proxy_pass http://chord-api:80;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

#### Traefik

Add labels to docker-compose.prod.yml:

```yaml
services:
  api:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.chord-api.rule=Host(`api.yourdomain.com`)"
      - "traefik.http.routers.chord-api.entrypoints=websecure"
      - "traefik.http.routers.chord-api.tls.certresolver=letsencrypt"
```

---

## Production - Standalone with Caddy

Use this for simple single-server deployment without CI/CD automation.
Best for: Personal servers, small deployments, or when you don't need blue-green deployment.

> **Note:** For automated deployments with zero-downtime, use [CI/CD Blue-Green](#cicd-with-blue-green-deployment) instead.

### Setup

```bash
# Clone and setup
git clone https://github.com/brckfrc/chord.git
cd chord

# Run interactive setup (select "prod" mode)
chmod +x setup-env.sh
./setup-env.sh prod

# Start all services
./start-prod.sh
```

### Manual Updates

```bash
# Pull latest code
git pull

# Rebuild and restart
cd backend
docker compose -f docker-compose.standalone.yml up -d --build

# Run migrations if needed
docker exec chord-api dotnet ef database update
```

### Verify Deployment

```bash
# Check containers
docker ps

# Check API health
curl https://yourdomain.com/health

# View logs
docker compose -f docker-compose.standalone.yml logs -f
```

---

## Mobile App Integration

Native mobile apps (iOS/Android) connect directly to Chord without additional configuration.

**Key Points:**

- CORS doesn't apply to native apps (browser-only)
- Same JWT authentication works for mobile
- No separate domain needed

**Required Ports:** 443 (API), 7880 (LiveKit), 7881 (RTC), 3478 (TURN)

For complete mobile integration guide with code examples, see:
**[backend/README.md - Mobile App Integration](../backend/README.md#mobile-app-integration)**

---

## Environment Variables Reference

### Required

| Variable        | Description                 | Example                |
| --------------- | --------------------------- | ---------------------- |
| SQL_SA_PASSWORD | SQL Server password         | StrongP@ssw0rd123!     |
| JWT_SECRET      | JWT signing key (32+ chars) | YourRandomSecretKey... |

### Optional

| Variable           | Default             | Description              |
| ------------------ | ------------------- | ------------------------ |
| DATABASE_NAME      | ChordDB             | SQL Server database name |
| JWT_EXPIRY_MINUTES | 60                  | Access token lifetime    |
| CORS_ORIGINS       | localhost:3000,5173 | Allowed frontend origins |

### LiveKit & Voice

| Variable           | Default             | Description          |
| ------------------ | ------------------- | -------------------- |
| LIVEKIT_API_KEY    | devkey              | LiveKit API key      |
| LIVEKIT_API_SECRET | secret              | LiveKit API secret   |
| LIVEKIT_URL        | ws://localhost:7880 | LiveKit server URL   |
| TURN_SECRET        | turnpassword123     | Coturn shared secret |

### Port Configuration

Leave empty to disable external binding (useful behind proxy):

| Variable         | Default | Description       |
| ---------------- | ------- | ----------------- |
| API_PORT         | 5000    | API external port |
| SQL_PORT         | 1433    | SQL Server port   |
| REDIS_PORT       | 6379    | Redis port        |
| LIVEKIT_WS_PORT  | 7880    | LiveKit WebSocket |
| LIVEKIT_RTC_PORT | 7881    | LiveKit RTC (UDP) |
| TURN_PORT        | 3478    | Coturn STUN/TURN  |

---

## Voice/Video (WebRTC) Considerations

### Port Requirements

For voice/video to work, these ports must be accessible:

| Port | Protocol | Service           | Required |
| ---- | -------- | ----------------- | -------- |
| 3478 | UDP/TCP  | STUN/TURN         | Yes      |
| 7880 | TCP      | LiveKit WebSocket | Yes      |
| 7881 | UDP/TCP  | LiveKit RTC       | Yes      |

### Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow 3478/udp
sudo ufw allow 3478/tcp
sudo ufw allow 7880/tcp
sudo ufw allow 7881/udp
sudo ufw allow 7881/tcp

# firewalld (CentOS/RHEL)
sudo firewall-cmd --permanent --add-port=3478/udp
sudo firewall-cmd --permanent --add-port=3478/tcp
sudo firewall-cmd --permanent --add-port=7880/tcp
sudo firewall-cmd --permanent --add-port=7881/udp
sudo firewall-cmd --permanent --add-port=7881/tcp
sudo firewall-cmd --reload
```

### NAT/Coturn Notes

- Coturn runs in `host` network mode for production NAT traversal
- For symmetric NAT, ensure TURN relay works correctly
- LiveKit uses Coturn internally for ICE candidates

---

## Troubleshooting

### Containers not starting

```bash
# Check logs
docker compose logs -f [service-name]

# Common issues:
# - SQL Server: Password policy not met
# - LiveKit: Invalid config file
# - Coturn: Port already in use
```

### Voice not connecting

1. Check if LiveKit is healthy: `docker ps`
2. Verify TURN port is accessible: `nc -vz yourserver.com 3478`
3. Check browser console for WebRTC errors
4. Ensure HTTPS is used (required for WebRTC in browsers)

### Database migration failed

```bash
# Run migrations manually
docker exec chord-api dotnet ef database update

# Or connect to SQL Server directly
docker exec -it chord-sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "$SQL_SA_PASSWORD" -C
```

---

## Backup & Restore

### Database Backup

```bash
# Backup
docker exec chord-sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "$SQL_SA_PASSWORD" -C \
  -Q "BACKUP DATABASE [ChordDB] TO DISK = N'/var/opt/mssql/backup/ChordDB.bak'"

# Copy backup out
docker cp chord-sqlserver:/var/opt/mssql/backup/ChordDB.bak ./backup/
```

### MinIO Backup

```bash
# Backup uploads
docker exec chord-minio mc alias set local http://localhost:9000 minioadmin minioadmin
docker exec chord-minio mc mirror local/chord-uploads /backup/
```

---

## Updating

### With CI/CD (Recommended)

Simply push to main branch - GitHub Actions handles everything:

```bash
git add .
git commit -m "Your changes"
git push origin main
# Automatic build, test, and blue-green deploy
```

### Manual Update (Standalone)

```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose -f docker-compose.standalone.yml up -d --build

# Run new migrations
docker exec chord-api dotnet ef database update
```

### Manual Update (Behind Proxy)

```bash
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker exec chord-api dotnet ef database update
```
