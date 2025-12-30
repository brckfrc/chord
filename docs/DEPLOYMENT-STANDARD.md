# Chord Standard VPS Deployment Guide

**Target Scenario:** Server with existing reverse proxy (Nginx, Traefik, Apache)

**What's Included:**
- Blue-green deployment for zero-downtime updates
- All infrastructure services
- No Caddy (you manage your own reverse proxy)

## Prerequisites

- Ubuntu/Debian server with Docker installed
- Existing reverse proxy (Nginx, Traefik, Apache, etc.)
- Domain configured in your reverse proxy
- SSL certificate management (Let's Encrypt, Cloudflare, etc.)

## Step 1: Clone and Configure

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/chord.git
cd chord

# Generate configs
chmod +x generate-configs.sh
./generate-configs.sh
```

Follow prompts to generate `.env`, `livekit.yaml`, and `turnserver.conf`.

## Step 2: Start Infrastructure

```bash
docker compose -f docker-compose.deploy.yml --profile infra up -d
```

Exposed ports:
- **SQL Server:** 1433 (consider firewall restrictions)
- **Redis:** 6379 (consider firewall restrictions)
- **MinIO API:** 9000
- **MinIO Console:** 9001
- **LiveKit WebSocket:** 7880
- **LiveKit RTC:** 7881 (UDP/TCP)
- **Coturn:** 3478 (UDP/TCP)

### Initialize MinIO

```bash
# Install mc client
wget https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc && sudo mv mc /usr/local/bin/

# Configure
mc alias set chord http://localhost:9000 YOUR_MINIO_USER YOUR_MINIO_PASSWORD

# Create bucket
mc mb chord/chord-uploads
mc anonymous set download chord/chord-uploads
```

## Step 3: Deploy Blue Stack

```bash
docker compose -f docker-compose.deploy.yml --profile blue up -d
```

Services:
- **API:** Port 5000
- **Frontend:** Port 3000

### Verify

```bash
curl http://localhost:5000/health
curl http://localhost:3000/health
```

## Step 4: Configure Your Reverse Proxy

### Nginx Example

Create `/etc/nginx/sites-available/chord`:

```nginx
upstream chord_api {
    server localhost:5000;
}

upstream chord_frontend {
    server localhost:3000;
}

upstream chord_livekit {
    server localhost:7880;
}

server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com;

    # SSL configuration (adjust paths)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    # Frontend
    location / {
        proxy_pass http://chord_frontend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API
    location /api/ {
        proxy_pass http://chord_api/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 25M;
    }

    # SignalR WebSocket (for real-time chat)
    location /hubs/ {
        proxy_pass http://chord_api/hubs/;
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

    # LiveKit WebSocket (for voice/video)
    location /livekit/ {
        proxy_pass http://chord_livekit/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
    }

    # MinIO file uploads (optional, can use direct port access)
    location /uploads/ {
        proxy_pass http://localhost:9000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 100M;
    }
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/chord /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Traefik Example (Docker Labels)

If using Traefik with Docker labels, add to `docker-compose.deploy.yml`:

```yaml
api-blue:
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.chord-api.rule=Host(`your-domain.com`) && PathPrefix(`/api`)"
    - "traefik.http.routers.chord-api.entrypoints=websecure"
    - "traefik.http.routers.chord-api.tls.certresolver=letsencrypt"
    - "traefik.http.services.chord-api.loadbalancer.server.port=80"

frontend-blue:
  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.chord-frontend.rule=Host(`your-domain.com`)"
    - "traefik.http.routers.chord-frontend.entrypoints=websecure"
    - "traefik.http.routers.chord-frontend.tls.certresolver=letsencrypt"
    - "traefik.http.services.chord-frontend.loadbalancer.server.port=80"
```

### Apache Example

Create `/etc/apache2/sites-available/chord.conf`:

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    Redirect permanent / https://your-domain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName your-domain.com

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/your-domain.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/your-domain.com/privkey.pem

    # Frontend
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/

    # API
    ProxyPass /api http://localhost:5000/api
    ProxyPassReverse /api http://localhost:5000/api

    # WebSockets
    ProxyPass /hubs ws://localhost:5000/hubs
    ProxyPassReverse /hubs ws://localhost:5000/hubs

    ProxyPass /livekit ws://localhost:7880/
    ProxyPassReverse /livekit ws://localhost:7880/

    # Upload size
    LimitRequestBody 26214400
</VirtualHost>
```

Enable:

```bash
sudo a2enmod proxy proxy_http proxy_wstunnel ssl
sudo a2ensite chord
sudo systemctl reload apache2
```

## Step 5: Blue-Green Deployment

### Deploy to Green Stack

```bash
docker compose -f docker-compose.deploy.yml --profile green up -d
```

Services start on:
- **API:** Port 5002
- **Frontend:** Port 3002

### Update Reverse Proxy

**Nginx:** Change upstream ports in config (5000→5002, 3000→3002):

```nginx
upstream chord_api {
    server localhost:5002;  # Changed
}

upstream chord_frontend {
    server localhost:3002;  # Changed
}
```

Reload: `sudo systemctl reload nginx`

**Traefik:** Update labels or use weighted services

**Apache:** Update ProxyPass directives

### Stop Blue Stack

```bash
docker compose -f docker-compose.deploy.yml --profile blue down
```

### Next Deployment

Deploy to blue (now inactive), update proxy, stop green.

## Automated Deployment Script

Use `scripts/deploy.sh` for automated blue-green deployment:

```bash
./scripts/deploy.sh \
  --image-tag YOUR_GIT_SHA \
  --registry ghcr.io \
  --repo YOUR_USERNAME/chord
```

**Note:** The script includes Caddy configuration. You'll need to modify `update_caddy()` function to update your specific reverse proxy instead.

## Security Considerations

### Close Unnecessary Ports

Consider restricting SQL Server and Redis to localhost only. Edit `docker-compose.deploy.yml`:

```yaml
sqlserver:
  ports:
    - "127.0.0.1:1433:1433"  # Localhost only

redis:
  ports:
    - "127.0.0.1:6379:6379"  # Localhost only
```

Or use a firewall:

```bash
# Allow only from localhost
sudo ufw deny 1433
sudo ufw deny 6379
```

### Use Docker Network

Applications can access SQL/Redis via Docker network without exposing ports:

```yaml
sqlserver:
  # ports: []  # No port mapping, internal only
  networks:
    - chord-network
```

API will connect via `sqlserver:1433` internally.

## Monitoring

### Health Checks

```bash
# API
curl http://localhost:5000/health

# Frontend
curl http://localhost:3000/health

# LiveKit
curl http://localhost:7880/
```

### Resource Usage

```bash
docker stats
```

### Logs

```bash
docker compose -f docker-compose.deploy.yml logs -f
docker logs -f chord-api-blue
```

## Troubleshooting

### Port Conflicts

**Error:** `bind: address already in use`

```bash
# Check what's using the port
sudo ss -tlnp | grep ':5000\|:3000'

# Stop conflicting service or change ports in .env
```

### Reverse Proxy Can't Connect

**Error:** `502 Bad Gateway`

```bash
# Check containers are running
docker ps | grep chord

# Check container health
docker inspect chord-api-blue | grep Health

# Test direct connection
curl http://localhost:5000/health
```

### WebSocket Connection Failed

**Error:** `WebSocket connection failed`

Ensure your proxy supports WebSocket upgrades:

**Nginx:**
```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

**Apache:**
```apache
ProxyPass /hubs ws://localhost:5000/hubs
```

## Support

- [Main Deployment Guide](./DEPLOYMENT.md)
- [GitHub Issues](https://github.com/YOUR_USERNAME/chord/issues)
