# Chord Standalone Deployment Guide

**Target Scenario:** Fresh server with no existing infrastructure or reverse proxy

**What's Included:**
- Blue-green deployment for zero-downtime updates
- Caddy reverse proxy with automatic HTTPS
- All infrastructure services (SQL Server, Redis, MinIO, LiveKit, Coturn)

## Prerequisites

- Fresh Ubuntu/Debian server (20.04+ or 11+)
- Root or sudo access
- Domain name pointing to your server
- Ports 80, 443 open in firewall

## Step 1: Install Docker

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker $USER

# Apply group changes (or logout/login)
newgrp docker

# Verify installation
docker --version
docker compose version
```

## Step 2: Clone Repository

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/chord.git
cd chord
```

## Step 3: Generate Configuration Files

```bash
# Make script executable
chmod +x generate-configs.sh

# Run config generator
./generate-configs.sh

# Follow prompts for:
# - Environment (production)
# - Public IP
# - Domain name
# - Database passwords
# - JWT secrets
# - API keys
```

This creates:
- `.env` - Environment variables
- `backend/livekit.yaml` - LiveKit configuration
- `backend/turnserver.conf` - Coturn TURN server config
- `backend/Caddyfile` - Caddy reverse proxy config

## Step 4: Review Generated Caddyfile

Edit `backend/Caddyfile` if needed:

```caddyfile
# Auto-generated Caddyfile
{
    email your-email@example.com
}

your-domain.com {
    # API endpoints
    handle /api/* {
        reverse_proxy api-blue:80
    }

    # SignalR WebSocket
    handle /hubs/* {
        reverse_proxy api-blue:80
    }

    # LiveKit WebSocket
    handle /livekit/* {
        reverse_proxy livekit:7880
    }

    # MinIO file uploads
    handle /uploads/* {
        uri strip_prefix /uploads
        reverse_proxy minio:9000
    }

    # Frontend (catch-all)
    handle /* {
        reverse_proxy frontend-blue:80
    }
}
```

**Important:** Caddy will automatically obtain Let's Encrypt SSL certificates.

## Step 5: Start Infrastructure Services

```bash
docker compose -f docker-compose.standalone.yml --profile infra up -d
```

This starts:
- **SQL Server** (port 1433)
- **Redis** (port 6379)
- **MinIO** (ports 9000, 9001)
- **LiveKit** (ports 7880, 7881)
- **Coturn** (port 3478)

### Verify Infrastructure

```bash
# Check containers are running
docker ps

# Check health status
docker compose -f docker-compose.standalone.yml --profile infra ps
```

Wait until all services show as "healthy" (may take 30-60 seconds).

## Step 6: Initialize MinIO Buckets

```bash
# Install MinIO client
wget https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
sudo mv mc /usr/local/bin/

# Configure MinIO
mc alias set chord-minio http://localhost:9000 YOUR_MINIO_USER YOUR_MINIO_PASSWORD

# Create bucket
mc mb chord-minio/chord-uploads

# Set public download policy (uploads are authenticated, downloads are public)
mc anonymous set download chord-minio/chord-uploads
```

## Step 7: Build and Push Docker Images

### Option A: Build Locally

```bash
# Build API
cd backend
docker build -t ghcr.io/YOUR_USERNAME/chord/api:latest .

# Build Frontend
cd ../frontend
docker build -t ghcr.io/YOUR_USERNAME/chord/frontend:latest .

# Push to registry (if using GitHub Container Registry)
docker login ghcr.io
docker push ghcr.io/YOUR_USERNAME/chord/api:latest
docker push ghcr.io/YOUR_USERNAME/chord/frontend:latest
```

### Option B: Use GitHub Actions (Recommended)

Push to GitHub and CI/CD will build automatically:

```bash
git add .
git commit -m "Initial deployment setup"
git push origin main
```

## Step 8: Deploy Blue Stack

```bash
docker compose -f docker-compose.standalone.yml --profile blue up -d
```

This starts:
- **API (blue)** on port 5000
- **Frontend (blue)** on port 3000

### Verify Deployment

```bash
# Check containers
docker ps | grep blue

# Test API health
curl http://localhost:5000/health

# Test Frontend health
curl http://localhost:3000/health
```

## Step 9: Start Caddy Reverse Proxy

```bash
docker compose -f docker-compose.standalone.yml --profile caddy up -d
```

Caddy will:
1. Obtain SSL certificate from Let's Encrypt
2. Start listening on ports 80 and 443
3. Proxy requests to blue stack

### Verify HTTPS

```bash
# Test your domain (wait 1-2 minutes for cert issuance)
curl https://your-domain.com/health
```

Visit `https://your-domain.com` in your browser.

## Step 10: Blue-Green Deployment Workflow

When you need to deploy updates:

### 1. Deploy to Green Stack

```bash
# Pull latest code
git pull origin main

# Start green stack with new images
export IMAGE_TAG=NEW_TAG
docker compose -f docker-compose.standalone.yml --profile green up -d
```

### 2. Verify Green Stack

```bash
# Test green stack directly
curl http://localhost:5001/health  # API
curl http://localhost:3001/health  # Frontend
```

### 3. Switch Traffic to Green

Update `backend/Caddyfile` to route to green:

```caddyfile
handle /api/* {
    reverse_proxy api-green:80  # Changed from api-blue
}

handle /* {
    reverse_proxy frontend-green:80  # Changed from frontend-blue
}
```

Reload Caddy:

```bash
docker exec chord-caddy caddy reload --config /etc/caddy/Caddyfile
```

### 4. Stop Blue Stack

```bash
docker compose -f docker-compose.standalone.yml --profile blue down
```

### 5. Next Deployment

Deploy to blue stack (now inactive), test, switch traffic, stop green.

## Monitoring and Maintenance

### View Logs

```bash
# All logs
docker compose -f docker-compose.standalone.yml logs -f

# Specific service
docker logs -f chord-api-blue
docker logs -f chord-livekit
```

### Check Resource Usage

```bash
docker stats
```

### Backup Database

```bash
# Create backup
docker exec chord-sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "$SQL_SA_PASSWORD" \
  -Q "BACKUP DATABASE ChordDB TO DISK='/var/opt/mssql/backup/chord_$(date +%Y%m%d).bak'"

# Copy backup to host
docker cp chord-sqlserver:/var/opt/mssql/backup/chord_$(date +%Y%m%d).bak ./
```

### Update Docker Images

```bash
# Pull latest images
docker pull ghcr.io/YOUR_USERNAME/chord/api:latest
docker pull ghcr.io/YOUR_USERNAME/chord/frontend:latest

# Follow blue-green deployment workflow
```

## Troubleshooting

### Caddy Can't Bind to Port 80/443

**Error:** `bind: address already in use`

**Solution:**
```bash
# Check what's using the ports
sudo ss -tlnp | grep ':80\|:443'

# Stop conflicting service (e.g., apache2, nginx)
sudo systemctl stop apache2
sudo systemctl disable apache2
```

### Let's Encrypt Certificate Failure

**Error:** `acme: error: 400`

**Possible causes:**
1. Domain doesn't point to your server
2. Firewall blocking ports 80/443
3. Rate limit (5 certs per week for same domain)

**Solution:**
```bash
# Test domain resolution
nslookup your-domain.com

# Check firewall
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Use staging for testing (edit Caddyfile)
{
    acme_ca https://acme-staging-v02.api.letsencrypt.org/directory
}
```

### SQL Server Connection Failed

**Error:** `Login failed for user 'sa'`

**Solution:**
```bash
# Check SQL Server is running
docker logs chord-sqlserver

# Verify password in .env matches
cat .env | grep SQL_SA_PASSWORD

# Test connection
docker exec -it chord-sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "$SQL_SA_PASSWORD" -C -Q "SELECT @@VERSION"
```

### MinIO Access Denied

**Error:** `403 Forbidden`

**Solution:**
```bash
# Check MinIO is running
docker logs chord-minio

# Verify bucket exists
mc ls chord-minio

# Check bucket policy
mc anonymous get chord-minio/chord-uploads
```

### LiveKit Connection Issues

**Error:** `Failed to connect to LiveKit`

**Solution:**
```bash
# Check LiveKit logs
docker logs chord-livekit

# Verify LIVEKIT_URL in .env
cat .env | grep LIVEKIT_URL

# Should be: ws://livekit:7880 (internal) or wss://your-domain.com/livekit (external)

# Test WebSocket connection
wscat -c ws://localhost:7880
```

## Security Recommendations

1. **Change default passwords** - Never use default passwords in production
2. **Restrict SQL Server port** - Consider closing port 1433 to public internet
3. **Enable firewall** - Use UFW or iptables to restrict access
4. **Regular updates** - Keep Docker and system packages updated
5. **Monitor logs** - Set up log aggregation and alerting
6. **Backup regularly** - Automate database backups

## Performance Tuning

### SQL Server Memory

Edit SQL Server memory limits in `docker-compose.standalone.yml`:

```yaml
sqlserver:
  deploy:
    resources:
      limits:
        memory: 4G
      reservations:
        memory: 2G
```

### Redis Persistence

Redis is configured with AOF (Append-Only File) for durability. For high-performance scenarios, adjust in `docker-compose.standalone.yml`:

```yaml
redis:
  command: redis-server --save 60 1000 --appendonly no
```

## Next Steps

- Set up monitoring (Prometheus + Grafana)
- Configure automated backups
- Set up CI/CD pipeline for automated deployments
- Enable CDN for static assets
- Configure log aggregation (ELK stack)

## Support

For issues or questions:
- GitHub Issues: https://github.com/YOUR_USERNAME/chord/issues
- Documentation: https://github.com/YOUR_USERNAME/chord/docs
