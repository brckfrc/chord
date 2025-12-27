# Chord Deployment Guide

This guide covers different deployment scenarios for Chord.

## Deployment Options

| Option | Best For | Complexity |
|--------|----------|------------|
| [Development](#development-local) | Local testing | Easy |
| [Behind Proxy](#production---behind-reverse-proxy) | YunoHost, Traefik, etc. | Medium |
| [Standalone](#production---standalone-with-caddy) | Single server deployment | Easy |

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

Use this for single-server deployment with automatic SSL.

### Option A: Interactive Setup

```bash
cd backend
chmod +x setup.sh
./setup.sh
```

The script will:
1. Create `.env` from template
2. Ask for your domain
3. Generate secure secrets
4. Start all containers with Caddy

### Option B: Manual Setup

```bash
cd backend

# 1. Configure environment
cp .env.example .env
nano .env  # Set DOMAIN=yourdomain.com

# 2. Start with Caddy
docker compose -f docker-compose.standalone.yml up -d
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

## Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| SQL_SA_PASSWORD | SQL Server password | StrongP@ssw0rd123! |
| JWT_SECRET | JWT signing key (32+ chars) | YourRandomSecretKey... |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| DATABASE_NAME | ChordDB | SQL Server database name |
| JWT_EXPIRY_MINUTES | 60 | Access token lifetime |
| CORS_ORIGINS | localhost:3000,5173 | Allowed frontend origins |

### LiveKit & Voice

| Variable | Default | Description |
|----------|---------|-------------|
| LIVEKIT_API_KEY | devkey | LiveKit API key |
| LIVEKIT_API_SECRET | secret | LiveKit API secret |
| LIVEKIT_URL | ws://localhost:7880 | LiveKit server URL |
| TURN_SECRET | turnpassword123 | Coturn shared secret |

### Port Configuration

Leave empty to disable external binding (useful behind proxy):

| Variable | Default | Description |
|----------|---------|-------------|
| API_PORT | 5000 | API external port |
| SQL_PORT | 1433 | SQL Server port |
| REDIS_PORT | 6379 | Redis port |
| LIVEKIT_WS_PORT | 7880 | LiveKit WebSocket |
| LIVEKIT_RTC_PORT | 7881 | LiveKit RTC (UDP) |
| TURN_PORT | 3478 | Coturn STUN/TURN |

---

## Voice/Video (WebRTC) Considerations

### Port Requirements

For voice/video to work, these ports must be accessible:

| Port | Protocol | Service | Required |
|------|----------|---------|----------|
| 3478 | UDP/TCP | STUN/TURN | Yes |
| 7880 | TCP | LiveKit WebSocket | Yes |
| 7881 | UDP/TCP | LiveKit RTC | Yes |

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

```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build

# Run new migrations
docker exec chord-api dotnet ef database update
```

