# Chord YunoHost Deployment Guide

**Target Scenario:** YunoHost self-hosting server

**What's Different:**

- YunoHost Nginx handles all external traffic and SSL
- Port configuration adjusted to avoid conflicts
- Blue-green deployment with YunoHost-safe settings
- Docker override file for YunoHost-specific configuration

## Prerequisites

- YunoHost server (11.x+)
- SSH access with sudo privileges
- Domain configured in YunoHost
- Docker installed on YunoHost

## Step 1: Install Docker on YunoHost

YunoHost doesn't include Docker by default:

```bash
# SSH into your YunoHost server
ssh admin@your-yunohost-server

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker $USER

# Apply group changes
newgrp docker

# Verify
docker --version
docker compose version
```

**Important:** Docker runs independently from YunoHost apps. It won't interfere with YunoHost's package management.

## Step 2: Configure YunoHost Domain

### Option A: Use Existing Domain

If you already have a domain in YunoHost:

```bash
# List domains
yunohost domain list
```

Use an existing domain like `chord.your-domain.com`.

### Option B: Add New Subdomain

```bash
# Add subdomain
sudo yunohost domain add chord.your-domain.com

# Install certificate
sudo yunohost domain cert install chord.your-domain.com
```

YunoHost will automatically:

- Create Nginx configuration
- Obtain Let's Encrypt SSL certificate
- Configure automatic renewal

## Step 3: Clone Repository

```bash
cd /home/$USER
git clone https://github.com/YOUR_USERNAME/chord.git
cd chord
```

## Step 4: Generate Configuration

```bash
chmod +x generate-configs.sh
./generate-configs.sh
```

When prompted:

- **Environment:** `production`
- **Public IP:** Your server's public IP (find with `curl ifconfig.me`)
- **Domain:** `chord.your-domain.com`
- **Database password:** Generate strong password
- **JWT secret:** Generate random string
- **LIVEKIT_API_KEY:** `devkey` (or custom)
- **LIVEKIT_API_SECRET:** Generate random string
- **MINIO_PUBLIC_ENDPOINT:** `https://chord.your-domain.com/uploads` (required for file access)

## Step 5: Start Infrastructure

```bash
docker compose -f docker-compose.deploy.yml \
               -f docker-compose.yunohost.yml \
               --profile infra up -d
```

**YunoHost override closes these ports:**

- SQL Server 1433 (security risk if exposed!)
- Redis 6379 (YunoHost has own Redis)

**Exposed ports (safe):**

- MinIO: 9000 (API), 9001 (Console)
- LiveKit: 7880 (WebSocket), 7881 (RTC)
- Coturn: 3478 (TURN server)

### Verify Infrastructure

```bash
docker ps | grep chord

# Check health
docker compose -f docker-compose.deploy.yml \
               -f docker-compose.yunohost.yml \
               ps
```

Wait until all show "healthy" status.

### Initialize MinIO

```bash
# Install MinIO client
wget https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc && sudo mv mc /usr/local/bin/

# Configure (use credentials from .env)
mc alias set chord http://localhost:9000 YOUR_MINIO_USER YOUR_MINIO_PASSWORD

# Create bucket
mc mb chord/chord-uploads
mc anonymous set download chord/chord-uploads
```

## Step 6: Deploy Green Stack (Initial Setup)

**Important:** Nginx configuration (Step 7) always points to green stack (5003/3003). For initial setup, deploy to green stack.

```bash
docker compose -f docker-compose.deploy.yml \
               -f docker-compose.yunohost.yml \
               --profile green up -d
```

Services start on:

- **API:** Port 5003
- **Frontend:** Port 3003

**Note:** Blue stack (5002/3002) is used for testing new versions before updating green. See Step 9 for blue-green deployment workflow.

### Verify Deployment

```bash
# Check containers
docker ps | grep green

# Test internally
curl http://localhost:5003/health
curl http://localhost:3003/health
```

## Step 7: Configure YunoHost Nginx

YunoHost automatically creates:

- `/etc/nginx/conf.d/chord.your-domain.com.conf` (main config, SSL managed by YunoHost)
- `/etc/nginx/conf.d/chord.your-domain.com.d/` (custom config directory)

Create custom proxy configuration:

```bash
sudo nano /etc/nginx/conf.d/chord.your-domain.com.d/chord.conf
```

Paste this configuration:

```nginx
# Chord Reverse Proxy Configuration
# WebSocket upgrade headers
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

# LiveKit WebSocket (for voice/video)
# Strip /livekit prefix and forward to LiveKit server
location /livekit/ {
    rewrite ^/livekit/(.*) /$1 break;
    proxy_pass http://127.0.0.1:7880;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
}

# SignalR WebSocket (for real-time chat)
# IMPORTANT: Frontend requests /api/hubs but backend expects /hubs
# So we strip the /api prefix here
location /api/hubs {
    proxy_pass http://127.0.0.1:5003/hubs;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
}

# Health check endpoint (strip /api prefix)
location /api/health {
    proxy_pass http://127.0.0.1:5003/health;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# API
location /api {
    proxy_pass http://127.0.0.1:5003;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 25M;
}

# Frontend
location / {
    proxy_pass http://127.0.0.1:3003;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}


# MinIO file uploads - REQUIRED for file access via public URLs
# Strips /uploads prefix before forwarding to MinIO
location /uploads {
    rewrite ^/uploads/(.*) /$1 break;
    proxy_pass http://127.0.0.1:9000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 25M;
    proxy_buffering off;
}
```

**Reload Nginx:**

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Step 8: Test Deployment

Visit `https://chord.your-domain.com` in your browser.

### Check SSL

YunoHost's Let's Encrypt certificate should be active automatically.

```bash
# Verify certificate
sudo yunohost domain cert status chord.your-domain.com
```

## Important Configuration Notes

### Port Configuration

**Port configuration for YunoHost deployment:**

- Blue: API 5002, Frontend 3002
- Green: API 5003, Frontend 3003

### SignalR Path Routing

**Critical:** Frontend requests `/api/hubs` but backend expects `/hubs`. Your Nginx config must strip the `/api` prefix:

```nginx
location /api/hubs {
    proxy_pass http://127.0.0.1:5002/hubs;  # /api/hubs → /hubs
    ...
}
```

Without this path stripping, SignalR WebSocket connections will fail with 404.

### LiveKit TLS Configuration

**If LiveKit keeps restarting with "TURN tls cert required" error:**

LiveKit's `tls_port` must be disabled because YunoHost Nginx handles all SSL termination.

```yaml
# backend/livekit.yaml
turn:
  enabled: true
  #tls_port: 5349   # Comment out - no TLS cert needed
  udp_port: 3478
```

### MinIO Public Endpoint Configuration

The `docker-compose.yunohost.yml` file automatically sets `MINIO_PUBLIC_ENDPOINT` environment variable for API containers:

```yaml
api-blue:
  environment:
    - MINIO_PUBLIC_ENDPOINT=${MINIO_PUBLIC_ENDPOINT:-https://chord.your-domain.com/uploads}

api-green:
  environment:
    - MINIO_PUBLIC_ENDPOINT=${MINIO_PUBLIC_ENDPOINT:-https://chord.your-domain.com/uploads}
```

This ensures uploaded files are accessible via `https://chord.your-domain.com/uploads/...` instead of internal Docker hostname (`http://minio:9000/...`).

**To customize the domain**, set `MINIO_PUBLIC_ENDPOINT` in your `.env` file:

```
MINIO_PUBLIC_ENDPOINT=https://your-custom-domain.com/uploads
```

**Why this is needed:**

- Backend generates file URLs using `MINIO_PUBLIC_ENDPOINT`
- Without this, URLs use internal Docker hostname (`minio:9000`) which browsers cannot resolve
- Nginx `/uploads` location proxies requests to MinIO on port 9000

## Step 9: Blue-Green Deployment Workflow

**YunoHost Blue-Green Strategy:**

- **Green stack (5003/3003)**: Production stack - Nginx always routes to green
- **Blue stack (5002/3002)**: Staging/test stack - deploy new versions here first
- After testing blue, update green stack with new images
- No Nginx config changes needed (Nginx is static, always points to green)

### Deploy New Version to Blue Stack (Testing)

```bash
# Pull latest code
cd /home/$USER/chord
git pull origin main

# Start blue stack with new version
docker compose -f docker-compose.deploy.yml \
               -f docker-compose.yunohost.yml \
               --profile blue up -d
```

Services start on:

- **API:** Port 5002
- **Frontend:** Port 3002

### Verify Blue Stack

```bash
curl http://localhost:5002/health
curl http://localhost:3002/health
```

Test the new version on blue stack before updating production.

### Update Green Stack (Production)

After testing blue stack, update green stack with the new images:

```bash
# Pull new images (if using GitHub Actions, images are already pulled)
docker pull ghcr.io/YOUR_USERNAME/chord/api:YOUR_TAG
docker pull ghcr.io/YOUR_USERNAME/chord/frontend:YOUR_TAG

# Restart green stack with new images
docker compose -f docker-compose.deploy.yml \
               -f docker-compose.yunohost.yml \
               --profile green up -d --force-recreate
```

### Verify Green Stack

```bash
curl http://localhost:5003/health
curl http://localhost:3003/health
```

### Stop Blue Stack

After confirming green stack is working:

```bash
docker compose -f docker-compose.deploy.yml \
               -f docker-compose.yunohost.yml \
               --profile blue down
```

### Next Deployment

Deploy to blue (now inactive), test, then update green stack with new images. No Nginx config changes needed.

## Step 10: GitHub Actions Setup (Optional)

For automated deployments via GitHub Actions:

### Set Repository Variable

1. Go to: `https://github.com/YOUR_USERNAME/chord/settings/variables/actions`
2. Click "New repository variable"
3. Name: `COMPOSE_FILES`
4. Value: `-f docker-compose.deploy.yml -f docker-compose.yunohost.yml`
5. Save

This tells GitHub Actions to use YunoHost overrides during deployment.

### Workflow Will Automatically:

- Build Docker images
- Push to GitHub Container Registry
- SSH to your server
- Pull images
- Deploy to inactive stack (blue/green)
- **Note:** Nginx config is static (always points to green), so no Nginx updates are needed

## Port Management Reference

### Internal Only (No Host Port Mapping)

- SQL Server: Accessed via `sqlserver:1433` in Docker network
- Redis: Accessed via `redis:6379` in Docker network
- LiveKit/Coturn: Used internally by containers

### Exposed to Localhost

- API Blue: 5002
- API Green: 5003
- Frontend Blue: 3002
- Frontend Green: 3003
- MinIO API: 9000
- MinIO Console: 9001
- LiveKit WebSocket: 7880
- LiveKit RTC: 7881
- Coturn: 3478

### External Access (via YunoHost Nginx)

- All traffic on ports 80/443 → YunoHost Nginx → Proxied to services above

## YunoHost Firewall

YunoHost manages its own firewall. Check/modify if needed:

```bash
# List firewall rules
sudo yunohost firewall list

# Allow additional ports (if needed, e.g., for LiveKit RTC)
sudo yunohost firewall allow UDP 7881
```

**Note:** Ports 80/443 are already open for YunoHost's Nginx.

## Monitoring and Maintenance

### View Logs

```bash
# Docker logs
docker logs -f chord-api-blue
docker logs -f chord-frontend-blue
docker logs -f chord-livekit

# YunoHost Nginx logs
sudo tail -f /var/log/nginx/chord.your-domain.com-access.log
sudo tail -f /var/log/nginx/chord.your-domain.com-error.log
```

### Resource Usage

```bash
# Docker stats
docker stats

# System resources
htop
```

### Database Backup

```bash
# Backup SQL Server database
docker exec chord-sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "$SQL_SA_PASSWORD" \
  -Q "BACKUP DATABASE ChordDB TO DISK='/var/opt/mssql/backup/chord_$(date +%Y%m%d).bak'" -C

# Extract backup
docker cp chord-sqlserver:/var/opt/mssql/backup/chord_$(date +%Y%m%d).bak ./
```

### YunoHost Backup Integration

To include Chord in YunoHost backups:

```bash
# Create backup script
sudo nano /usr/local/bin/chord-backup.sh
```

```bash
#!/bin/bash
# Chord backup script
BACKUP_DIR="/home/yunohost.backup/chord"
mkdir -p "$BACKUP_DIR"

# Backup database
docker exec chord-sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "$SQL_SA_PASSWORD" \
  -Q "BACKUP DATABASE ChordDB TO DISK='/var/opt/mssql/backup/chord.bak'" -C

docker cp chord-sqlserver:/var/opt/mssql/backup/chord.bak "$BACKUP_DIR/"

# Backup .env and configs
cp /home/$USER/chord/.env "$BACKUP_DIR/"
cp -r /home/$USER/chord/backend/*.yaml "$BACKUP_DIR/" 2>/dev/null || true
```

```bash
chmod +x /usr/local/bin/chord-backup.sh
```

## Troubleshooting

### YunoHost Nginx 502 Bad Gateway

**Cause:** Docker containers not running or not listening on expected ports

**Solution:**

```bash
# Check containers
docker ps | grep chord

# Check Nginx can reach services
curl http://localhost:5002/health  # Blue stack
curl http://localhost:3002/health  # Blue stack
# or
curl http://localhost:5003/health  # Green stack
curl http://localhost:3003/health  # Green stack

# Check Nginx error logs
sudo tail -f /var/log/nginx/chord.your-domain.com-error.log
```

### SQL Port 1433 Still Exposed (Security Risk!)

**Check:**

```bash
sudo ss -tlnp | grep :1433
```

If you see `0.0.0.0:1433`, the port is exposed to internet!

**Fix:**

```bash
# Ensure you're using YunoHost override
docker compose -f docker-compose.deploy.yml \
               -f docker-compose.yunohost.yml \
               --profile infra down

# Restart with override
docker compose -f docker-compose.deploy.yml \
               -f docker-compose.yunohost.yml \
               --profile infra up -d

# Verify - should show nothing
sudo ss -tlnp | grep :1433
```

### YunoHost Let's Encrypt Certificate Issues

**Check certificate status:**

```bash
sudo yunohost domain cert status chord.your-domain.com
```

**Renew manually:**

```bash
sudo yunohost domain cert renew chord.your-domain.com
```

### Port Conflicts with YunoHost Services

**Error:** `bind: address already in use`

**Check what's using the port:**

```bash
sudo ss -tlnp | grep :PORT_NUMBER
```

**Common conflicts:**

- **Redis 6379:** YunoHost might have its own Redis → YunoHost override closes Chord Redis port
- **Port 80/443:** YunoHost Nginx → Don't expose Caddy
- **Other services:** Use YunoHost's app list to check

```bash
sudo yunohost app list
```

### Docker Network Conflicts

If you have other Docker services:

```bash
# List networks
docker network ls

# Inspect Chord network
docker network inspect chord_chord-network
```

### WebSocket Connection Failed

**Symptoms:** Real-time chat not working, voice chat fails

**Check Nginx WebSocket configuration:**

Ensure these headers are in your Nginx config:

```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

**Test WebSocket:**

```bash
# Install wscat
npm install -g wscat

# Test SignalR (use current active stack port)
wscat -c ws://localhost:5002/hubs/chat  # Blue stack
# or
wscat -c ws://localhost:5003/hubs/chat  # Green stack

# Test LiveKit
wscat -c ws://localhost:7880
```

## Security Best Practices

1. **Never expose SQL Server port 1433 to internet** - Always use YunoHost override
2. **Use strong passwords** - Generate with `openssl rand -base64 32`
3. **Keep YunoHost updated** - `sudo yunohost tools update && sudo yunohost tools upgrade`
4. **Monitor access logs** - Check for suspicious activity
5. **Regular backups** - Automate with cron or YunoHost backup system
6. **Firewall configuration** - Only open necessary ports

## Performance Tuning

### SQL Server Memory Limit

Edit `docker-compose.deploy.yml`:

```yaml
sqlserver:
  deploy:
    resources:
      limits:
        memory: 2G
```

### Redis Memory

Edit `docker-compose.deploy.yml`:

```yaml
redis:
  command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru
```

## Integration with YunoHost SSO (Advanced)

To integrate Chord with YunoHost's Single Sign-On:

1. Install YunoHost LDAP support in your API
2. Configure Chord API to authenticate against YunoHost's LDAP
3. Update Nginx config to enable SSOwat authentication

**This is advanced and requires code changes in the API.**

## Disabling SSO for Chord

**Why disable SSO?**

Chord has its own authentication system (JWT-based). YunoHost SSO (SSOwat) can interfere with Chord's API endpoints and cause redirect loops or authentication conflicts. For most deployments, you should disable SSO for the Chord domain.

### Step 1: Check Current SSO Configuration

First, verify what SSO-related configurations exist:

```bash
# Check main Nginx config for SSO directives
grep -nE "access_by_lua_file|yunohost_sso\.conf\.inc|yunohost_api\.conf\.inc|yunohost_admin\.conf\.inc" \
  /etc/nginx/conf.d/chord.borak.dev.conf

# Check custom config directory
ls -la /etc/nginx/conf.d/chord.borak.dev.d/
```

### Step 2: Disable SSO in Main Config

Edit the main Nginx config file:

```bash
sudo nano /etc/nginx/conf.d/chord.borak.dev.conf
```

In both server blocks (port 80 and 443), comment out or remove:

**A) SSO Lua directive:**

```nginx
# Comment out this line:
#access_by_lua_file /usr/share/ssowat/access.lua;
```

**B) SSO include:**

```nginx
# Comment out this line:
#include /etc/nginx/conf.d/yunohost_sso.conf.inc;
```

**C) YunoHost admin/api includes (recommended):**

These can cause conflicts with Chord's `/api` endpoints:

```nginx
# Comment out these lines:
#include /etc/nginx/conf.d/yunohost_admin.conf.inc;
#include /etc/nginx/conf.d/yunohost_api.conf.inc;
```

**Why disable admin/api includes?**

YunoHost's admin/api includes can create incorrect upstream proxies that conflict with Chord's API routing, potentially causing 502 errors or wrong request routing.

### Step 3: Test and Reload Nginx

```bash
# Test configuration
sudo nginx -t

# Reload if test passes
sudo systemctl reload nginx
```

### Step 4: Verify SSO is Disabled

```bash
# Check HTTP response (should be 200, not redirect)
curl -I https://chord.borak.dev

# Should show: HTTP/2 200 (not 302 redirect to login)
```

### Step 5: Lock Config File (Recommended)

Prevent YunoHost updates from overwriting your changes:

```bash
# Lock the file (immutable)
sudo chattr +i /etc/nginx/conf.d/chord.borak.dev.conf
```

**To unlock later (if needed):**

```bash
sudo chattr -i /etc/nginx/conf.d/chord.borak.dev.conf
```

### Verification Checklist

After disabling SSO, verify:

- ✅ `access_by_lua_file` is commented out
- ✅ `yunohost_sso.conf.inc` include is commented out
- ✅ `yunohost_admin.conf.inc` include is commented out (if present)
- ✅ `yunohost_api.conf.inc` include is commented out (if present)
- ✅ `curl -I https://chord.borak.dev` returns HTTP 200 (not 302 redirect)
- ✅ Config file is locked with `chattr +i` (optional but recommended)

### Important Notes

1. **YunoHost Updates:** Even with file locking, always verify SSO settings after YunoHost system updates or `yunohost tools regen-conf` commands.

2. **Custom Config Directory:** Your Chord-specific routing (in `/etc/nginx/conf.d/chord.borak.dev.d/chord.conf`) is separate and won't be affected by SSO changes.

3. **Other Domains:** This only affects the Chord domain. Other YunoHost apps can still use SSO normally.

4. **Re-enabling SSO:** If you need SSO later, uncomment the lines and unlock the file, but ensure Chord API is configured to handle YunoHost LDAP authentication.

## Migration from Old Setup

If you're migrating from an old deployment:

```bash
# Stop old deployment
docker compose -f docker-compose.deploy.yml --profile blue down
docker compose -f docker-compose.deploy.yml --profile green down
docker compose -f docker-compose.deploy.yml --profile infra down

# Start with YunoHost override
docker compose -f docker-compose.deploy.yml \
               -f docker-compose.yunohost.yml \
               --profile infra up -d

docker compose -f docker-compose.deploy.yml \
               -f docker-compose.yunohost.yml \
               --profile blue up -d

# Verify SQL port is closed
sudo ss -tlnp | grep :1433  # Should show nothing
```

### LiveKit Restart Loop

**Error:** `TURN tls cert required: open : no such file or directory`

**Cause:** LiveKit trying to use TLS for TURN but certificate file doesn't exist.

**Solution:**

```bash
# Edit livekit.yaml
nano backend/livekit.yaml

# Comment out tls_port:
turn:
  enabled: true
  #tls_port: 5349   # Disabled - no TLS cert needed
  udp_port: 3478

# Restart LiveKit
docker restart chord-livekit

# Verify it's running
docker ps | grep livekit
# Should show: Up X minutes (healthy)
```

**Why this works:** YunoHost Nginx handles all SSL/TLS termination. LiveKit only needs UDP TURN server, not TLS.

## Support

- [Main Deployment Guide](./DEPLOYMENT.md)
- [YunoHost Forum](https://forum.yunohost.org/)
- [GitHub Issues](https://github.com/YOUR_USERNAME/chord/issues)
