#!/bin/bash
# Chord Production Infrastructure Setup
# Automates config generation and service startup for GitHub Actions deployment

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║   Chord Infrastructure Setup          ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# Step 1: Generate config files
if [ ! -f "$PROJECT_DIR/backend/.env" ]; then
    log_info "Config files not found. Running generate-configs.sh..."
    if [ -f "$PROJECT_DIR/generate-configs.sh" ]; then
        cd "$PROJECT_DIR"
        ./generate-configs.sh
    else
        log_error "generate-configs.sh not found!"
        exit 1
    fi
else
    log_info "Config files already exist"
fi

# Step 2: Verify Docker is running
if ! docker info > /dev/null 2>&1; then
    log_error "Docker is not running!"
    exit 1
fi

# Step 3: Create Docker network if needed
if ! docker network inspect chord_chord-network > /dev/null 2>&1; then
    log_info "Creating Docker network..."
    docker network create chord_chord-network
fi

# Step 4: Start infrastructure services
log_info "Starting infrastructure services..."
cd "$PROJECT_DIR"

# Source .env file
if [ -f "$PROJECT_DIR/backend/.env" ]; then
    set -a
    source "$PROJECT_DIR/backend/.env"
    set +a
fi

# Start services one by one with proper network aliases
log_info "Starting SQL Server..."
docker compose -f docker-compose.deploy.yml up -d sqlserver

log_info "Waiting for SQL Server to be healthy..."
for i in {1..30}; do
    if docker exec chord-sqlserver /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "$SQL_SA_PASSWORD" -Q "SELECT 1" -C > /dev/null 2>&1; then
        log_success "SQL Server is ready"
        break
    fi
    sleep 2
done

log_info "Starting Redis..."
docker compose -f docker-compose.deploy.yml up -d redis

log_info "Starting MinIO..."
docker compose -f docker-compose.deploy.yml up -d minio

log_info "Waiting for MinIO to be healthy..."
sleep 5

# Step 5: Create MinIO bucket
log_info "Creating MinIO bucket..."
docker run --rm --network chord_chord-network \
    --entrypoint=/bin/sh \
    minio/mc:latest \
    -c "mc alias set myminio http://minio:9000 ${MINIO_ROOT_USER:-minioadmin} ${MINIO_ROOT_PASSWORD} && \
        mc mb myminio/${MINIO_BUCKET_NAME:-chord-uploads} --ignore-existing && \
        mc anonymous set download myminio/${MINIO_BUCKET_NAME:-chord-uploads}"

log_success "MinIO bucket created"

# Step 6: Start LiveKit (with fix)
log_info "Starting LiveKit..."
docker compose -f docker-compose.deploy.yml up -d livekit

# Step 7: Start Coturn
log_info "Starting Coturn..."
docker compose -f docker-compose.deploy.yml up -d coturn

# Step 8: Verify services
log_info "Verifying services..."
sleep 5

SERVICES=("chord-sqlserver" "chord-redis" "chord-minio" "chord-livekit" "chord-coturn")
ALL_RUNNING=true

for service in "${SERVICES[@]}"; do
    if docker ps | grep -q "$service"; then
        echo "  ✓ $service running"
    else
        echo "  ✗ $service NOT running"
        ALL_RUNNING=false
    fi
done

# Step 9: Setup Nginx config (if not exists)
NGINX_CONF="/etc/nginx/conf.d/chord.borak.dev.d/chord.conf"
if [ -f "$NGINX_CONF" ]; then
    log_info "Nginx config already exists"
else
    log_warn "Nginx config not found. Creating template..."
    
    # Check if we have sudo access
    if [ "$(id -u)" -ne 0 ] && ! sudo -n true 2>/dev/null; then
        log_warn "Sudo required to create Nginx config"
        log_info "Create this file manually: $NGINX_CONF"
        cat << 'EOF'

location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location /api {
    proxy_pass http://127.0.0.1:5000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location /hubs {
    proxy_pass http://127.0.0.1:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

EOF
    else
        log_info "Creating Nginx config..."
        sudo mkdir -p /etc/nginx/conf.d/chord.borak.dev.d
        sudo tee "$NGINX_CONF" > /dev/null << 'EOF'
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location /api {
    proxy_pass http://127.0.0.1:5000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}

location /hubs {
    proxy_pass http://127.0.0.1:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
EOF
        sudo nginx -t && sudo systemctl reload nginx
        log_success "Nginx config created and reloaded"
    fi
fi

echo ""
if [ "$ALL_RUNNING" = true ]; then
    log_success "Infrastructure setup complete!"
    echo ""
    echo "Services running:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep chord
else
    log_error "Some services failed to start"
    exit 1
fi
