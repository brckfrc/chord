# Chord Deployment Guide

> **Purpose:** Choose the right deployment method for your server setup and follow detailed scenario-specific guides.

## Quick Decision Tree

```
Do you have a server?
  NO  → Use cloud provider (AWS, DigitalOcean, etc.) and follow Standalone guide
  YES → Continue below

Do you have an existing reverse proxy?
  NO  → Use Standalone Deployment (includes Caddy)
  YES → Continue below

What reverse proxy are you using?
  YunoHost     → YunoHost Deployment
  Other        → Standard VPS Deployment (Nginx, Traefik, Apache)
```

## Deployment Scenarios

| Scenario | When to Use | Compose Files | Guide |
|----------|-------------|---------------|-------|
| **Standalone** | Fresh server, no infrastructure | `docker-compose.standalone.yml` | [DEPLOYMENT-STANDALONE.md](./DEPLOYMENT-STANDALONE.md) |
| **Standard VPS** | Have Nginx, Traefik, or Apache | `docker-compose.deploy.yml` | [DEPLOYMENT-STANDARD.md](./DEPLOYMENT-STANDARD.md) |
| **YunoHost** | Using YunoHost for self-hosting | `docker-compose.deploy.yml`<br>`docker-compose.yunohost.yml` | [DEPLOYMENT-YUNOHOST.md](./DEPLOYMENT-YUNOHOST.md) |

### Scenario 1: Standalone Deployment

**You should use this if:**
- ✅ You have a fresh server with nothing installed
- ✅ You want an all-in-one solution
- ✅ You don't have an existing reverse proxy
- ✅ You want automatic HTTPS with Caddy

**Includes:**
- Caddy reverse proxy with automatic Let's Encrypt SSL
- Blue-green deployment support
- All infrastructure services (SQL, Redis, MinIO, LiveKit)

**Quick Start:**
```bash
docker compose -f docker-compose.standalone.yml --profile infra up -d
docker compose -f docker-compose.standalone.yml --profile blue --profile caddy up -d
```

**[→ Full Standalone Guide](./DEPLOYMENT-STANDALONE.md)**

---

### Scenario 2: Standard VPS Deployment

**You should use this if:**
- ✅ You already have Nginx, Traefik, or Apache running
- ✅ You manage your own SSL certificates
- ✅ You want to integrate Chord into existing infrastructure
- ✅ You're comfortable configuring your reverse proxy

**Includes:**
- Blue-green deployment support
- All infrastructure services
- No Caddy (you provide reverse proxy)

**Quick Start:**
```bash
docker compose -f docker-compose.deploy.yml --profile infra up -d
docker compose -f docker-compose.deploy.yml --profile blue up -d

# Configure your reverse proxy to route to:
# - API: localhost:5000
# - Frontend: localhost:3000
```

**[→ Full Standard VPS Guide](./DEPLOYMENT-STANDARD.md)**

---

### Scenario 3: YunoHost Deployment

**You should use this if:**
- ✅ You're using YunoHost for self-hosting
- ✅ YunoHost Nginx handles your SSL and domains
- ✅ You want Docker containers alongside YunoHost apps
- ✅ You need port conflict avoidance

**Includes:**
- Blue-green deployment support
- YunoHost-safe port configuration
- Integration with YunoHost Nginx
- Security-hardened (SQL/Redis ports closed)

**Quick Start:**
```bash
docker compose -f docker-compose.deploy.yml \
               -f docker-compose.yunohost.yml \
               --profile infra up -d

docker compose -f docker-compose.deploy.yml \
               -f docker-compose.yunohost.yml \
               --profile blue up -d

# Configure YunoHost Nginx in:
# /etc/nginx/conf.d/chord.your-domain.com.d/chord.conf
```

**[→ Full YunoHost Guide](./DEPLOYMENT-YUNOHOST.md)**

---

## Feature Comparison

| Feature | Standalone | Standard VPS | YunoHost |
|---------|------------|--------------|----------|
| **Reverse Proxy** | Caddy (included) | Your own | YunoHost Nginx |
| **SSL Management** | Automatic (Let's Encrypt) | Manual | YunoHost (auto) |
| **Blue-Green** | ✅ Yes | ✅ Yes | ✅ Yes |
| **SQL Port Exposed** | Yes (can close) | Yes (can close) | No (secure) |
| **Redis Port Exposed** | Yes (can close) | Yes (can close) | No (secure) |
| **Complexity** | Low | Medium | Medium |
| **Best For** | New deployments | Existing infra | YunoHost users |

## What is Blue-Green Deployment?

All three scenarios support **blue-green deployment** for zero-downtime updates:

1. **Blue stack** runs on ports 5000 (API), 3000 (Frontend)
2. Deploy **green stack** on ports 5002 (API), 3002 (Frontend)
3. Test green stack
4. Switch reverse proxy to point to green
5. Stop blue stack
6. Next deployment: deploy to blue, switch, stop green

**Benefits:**
- Zero downtime during updates
- Easy rollback (just switch back)
- Test new version before switching traffic

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Reverse Proxy Layer                      │
│  (Caddy / Nginx / Traefik / YunoHost Nginx)                  │
│                   Ports 80, 443 (HTTPS)                       │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┴────────────────┐
        │                                 │
┌───────▼─────────┐            ┌─────────▼────────┐
│   Blue Stack    │            │   Green Stack     │
│                 │            │                   │
│ API:      :5000 │            │ API:       :5002  │
│ Frontend: :3000 │            │ Frontend:  :3002  │
└───────┬─────────┘            └─────────┬────────┘
        │                                │
        └────────────┬───────────────────┘
                     │
        ┌────────────▼────────────────┐
        │  Infrastructure (Shared)     │
        │                             │
        │  SQL Server  (internal)      │
        │  Redis       (internal)      │
        │  MinIO       :9000-9001      │
        │  LiveKit     :7880-7881      │
        │  Coturn      :3478           │
        └──────────────────────────────┘
```

## Common Infrastructure Services

All deployment scenarios include:

| Service | Purpose | Ports | Access |
|---------|---------|-------|--------|
| **SQL Server** | Database | Internal only* | Docker network |
| **Redis** | Cache & messaging | Internal only* | Docker network |
| **MinIO** | S3-compatible storage | 9000, 9001 | Public (API), Internal (Console) |
| **LiveKit** | Voice/video SFU | 7880, 7881 | WebSocket, RTC |
| **Coturn** | TURN server | 3478 | UDP/TCP |

**Internal only* means:** Services accessed via Docker network (`sqlserver:1433`, `redis:6379`) without exposing ports to host. YunoHost deployment enforces this for security.

## Local Development

For development without Docker Compose:

### 1. Start Infrastructure Only

```bash
cd backend
docker compose -f docker-compose.dev.yml up -d
```

### 2. Run API (Hot Reload)

```bash
cd backend
cp .env.example .env
dotnet watch run
```

### 3. Run Frontend (Hot Reload)

```bash
cd frontend
npm install
npm run dev
```

**Access:**
- Frontend: http://localhost:5173
- API: http://localhost:5049
- Swagger: http://localhost:5049/swagger

## Automated Deployment with GitHub Actions

All scenarios can be automated with GitHub Actions. See `.github/workflows/deploy.yml`.

### Required GitHub Secrets

| Secret | Description | Example |
|--------|-------------|---------|
| `VPS_HOST` | Server IP/hostname | `your-server.com` |
| `VPS_USER` | SSH username | `deploy` |
| `VPS_SSH_KEY` | SSH private key | `-----BEGIN...` |
| `VPS_DEPLOY_PATH` | Project path on server | `/home/user/chord` |

### Required GitHub Variables (for YunoHost)

| Variable | Description | Value |
|----------|-------------|-------|
| `COMPOSE_FILES` | Compose files to use | `-f docker-compose.deploy.yml -f docker-compose.yunohost.yml` |

**Set this in:** Repository Settings → Secrets and variables → Actions → Variables

## Migration Between Scenarios

### From Standalone → Standard VPS

1. Stop Caddy: `docker compose -f docker-compose.standalone.yml --profile caddy down`
2. Configure your reverse proxy to point to ports 5000, 3000
3. Continue using same compose file or switch to `docker-compose.deploy.yml`

### From Standard VPS → YunoHost

1. Stop current deployment
2. Add `docker-compose.yunohost.yml` to compose command
3. Configure YunoHost Nginx
4. Restart services

### From Standalone → YunoHost

1. Stop Caddy and current stacks
2. Switch to `docker-compose.deploy.yml` + `docker-compose.yunohost.yml`
3. Configure YunoHost Nginx
4. Restart services

## Troubleshooting

### Port Conflicts

**Error:** `bind: address already in use`

```bash
# Find what's using the port
sudo ss -tlnp | grep :PORT_NUMBER

# Stop conflicting service
sudo systemctl stop SERVICE_NAME
```

### Health Check Failures

```bash
# Check container status
docker ps

# Check logs
docker logs CONTAINER_NAME

# Test health endpoints
curl http://localhost:5000/health
curl http://localhost:3000/health
```

### SSL Certificate Issues

**Standalone (Caddy):**
- Ensure domain points to your server
- Check firewall allows ports 80, 443
- Use staging for testing: Add `acme_ca` directive in Caddyfile

**Standard VPS:**
- Check your reverse proxy SSL config
- Verify certificate paths
- Test with `openssl s_client -connect your-domain.com:443`

**YunoHost:**
- Check: `sudo yunohost domain cert status DOMAIN`
- Renew: `sudo yunohost domain cert renew DOMAIN`

### Docker Network Issues

```bash
# Recreate network
docker network rm chord_chord-network
docker compose -f docker-compose.*.yml --profile infra up -d
```

## Security Best Practices

1. **Use strong passwords** - Generate with `openssl rand -base64 32`
2. **Close unnecessary ports** - Especially SQL Server (1433) and Redis (6379)
3. **Keep Docker updated** - `sudo apt update && sudo apt upgrade docker.io`
4. **Use firewall** - UFW, iptables, or cloud provider firewall
5. **Regular backups** - Automate database backups
6. **Monitor logs** - Set up log aggregation

## Support and Resources

- **Detailed Guides:**
  - [Standalone Deployment](./DEPLOYMENT-STANDALONE.md)
  - [Standard VPS Deployment](./DEPLOYMENT-STANDARD.md)
  - [YunoHost Deployment](./DEPLOYMENT-YUNOHOST.md)

- **Project Resources:**
  - [Main README](../README.md)
  - [Backend Documentation](../backend/README.md)
  - [GitHub Issues](https://github.com/YOUR_USERNAME/chord/issues)

## FAQ

**Q: Which deployment method should I choose?**
A: Use the decision tree at the top of this guide. In general: Standalone for new servers, Standard VPS if you have existing infrastructure, YunoHost if you're using YunoHost.

**Q: Can I switch between blue and green stacks manually?**
A: Yes! Just update your reverse proxy configuration to point to the other stack's ports.

**Q: Do I need to close SQL Server and Redis ports?**
A: For production, yes! Especially SQL Server. YunoHost deployment closes them automatically. For others, edit compose files or use firewall.

**Q: Can I use this without Docker?**
A: Not recommended for production. Docker ensures consistent environment and easy updates. For development, see [Local Development](#local-development).

**Q: How do I rollback a deployment?**
A: With blue-green: switch your reverse proxy back to the old stack. The old stack is still running until you explicitly stop it.
