# Chord API - Backend

ASP.NET Core backend for Chord, a Discord-like real-time chat application.

**Repository:** [https://github.com/brckfrc/chord.git](https://github.com/brckfrc/chord.git)

## Tech Stack

- **.NET 9.0** - Web API
- **Entity Framework Core 9** - ORM
- **SQL Server** - Database
- **Redis** - Caching & SignalR backplane
- **SignalR** - Real-time communication
- **JWT 8.2** - Authentication
- **BCrypt** - Password hashing
- **Serilog 9** - Logging
- **AutoMapper 12** - Object mapping
- **FluentValidation 11** - Input validation

## Prerequisites

- .NET 9 SDK
- Docker & Docker Compose (for SQL Server & Redis)

## Getting Started

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

- SQL Server on `localhost:1433`
- Redis on `localhost:6379`

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
├── Hubs/             # SignalR hubs
├── Models/
│   ├── Entities/     # Database entities
│   └── DTOs/         # Data transfer objects
├── Data/             # DbContext
├── Services/         # Business logic
├── Middleware/       # Custom middleware
├── Extensions/       # Extension methods
├── appsettings.json  # Configuration
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
```

## Development

- Use C# extension for VSCode/Cursor
- Hot reload is enabled by default
- Check `Logs/` directory for application logs

## Next Steps

- [ ] Implement Auth endpoints
- [ ] Create Guild/Channel management
- [ ] Setup SignalR hubs
- [ ] Add unit tests
