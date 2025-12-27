#!/bin/bash
# Chord Environment Setup Script
# This script configures the development or production environment
# Run: ./setup-env.sh [dev|prod]

set -e

# ============================================
# Colors
# ============================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================
# Logging Functions
# ============================================
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# ============================================
# Global Variables
# ============================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODE=""
HOST=""
LAN_IP=""
PROTOCOL=""
WS_PROTOCOL=""
CORS_ORIGINS=""
HAVE_SUDO=false
PKG_MGR="npm"
PKG_INSTALL="npm install"
PKG_DEV="npm run dev"

# Secrets
SQL_SA_PASSWORD=""
JWT_SECRET=""
LIVEKIT_API_SECRET=""
MINIO_ROOT_PASSWORD=""
TURN_SECRET=""

# ============================================
# OS Detection
# ============================================
detect_os() {
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        OS="windows"
    else
        OS="unknown"
    fi
    log_info "Detected OS: $OS"
}

# ============================================
# Sudo Check
# ============================================
check_sudo() {
    if [ "$EUID" -eq 0 ]; then
        HAVE_SUDO=true
        return
    fi
    
    if sudo -v 2>/dev/null; then
        HAVE_SUDO=true
        log_info "sudo access available"
    else
        HAVE_SUDO=false
        log_warn "sudo access not available (firewall config may be skipped)"
    fi
}

# ============================================
# Docker Check
# ============================================
check_docker() {
    log_step "Checking Docker..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker not installed"
        log_error "Install from: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_warn "Docker not running, attempting to start..."
        
        if [[ "$OS" == "linux" ]]; then
            if [ "$HAVE_SUDO" = true ]; then
                sudo systemctl start docker 2>/dev/null || sudo service docker start 2>/dev/null || true
            fi
        elif [[ "$OS" == "macos" ]]; then
            open -a Docker 2>/dev/null || true
            log_info "Waiting for Docker to start..."
            sleep 10
        fi
        
        if ! docker info &> /dev/null; then
            log_error "Could not start Docker. Please start it manually."
            exit 1
        fi
    fi
    
    log_info "Docker is running"
}

# ============================================
# Node.js / nvm Check
# ============================================
check_node() {
    log_step "Checking Node.js..."
    
    # Check if nvm is installed
    if [ -s "$HOME/.nvm/nvm.sh" ]; then
        log_info "nvm detected, loading..."
        export NVM_DIR="$HOME/.nvm"
        source "$NVM_DIR/nvm.sh"
        
        # Use .nvmrc if exists
        if [ -f "$SCRIPT_DIR/.nvmrc" ]; then
            log_info "Installing Node.js version from .nvmrc..."
            nvm install 2>/dev/null || true
            nvm use 2>/dev/null || true
        fi
        log_info "Node.js $(node -v) ready"
        return 0
    fi
    
    # Check if node is available without nvm
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -lt 18 ]; then
            log_warn "Node.js v$NODE_VERSION detected (< 18 recommended)"
            log_warn "Consider installing nvm for easier version management"
        else
            log_info "Node.js $(node -v) detected"
        fi
        return 0
    fi
    
    # Neither nvm nor node found - offer to install nvm
    log_error "Node.js not found"
    echo ""
    read -p "Install nvm (Node Version Manager)? [Y/n]: " install_nvm
    if [[ ! "$install_nvm" =~ ^[Nn]$ ]]; then
        log_info "Installing nvm..."
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
        
        export NVM_DIR="$HOME/.nvm"
        source "$NVM_DIR/nvm.sh"
        
        log_info "Installing Node.js LTS..."
        nvm install --lts
        nvm use --lts
        
        log_info "Node.js $(node -v) installed successfully"
    else
        log_error "Node.js is required. Please install manually."
        exit 1
    fi
}

# ============================================
# .NET Check
# ============================================
check_dotnet() {
    log_step "Checking .NET SDK..."
    
    if ! command -v dotnet &> /dev/null; then
        log_error ".NET SDK not installed"
        log_error "Install from: https://dotnet.microsoft.com/download"
        exit 1
    fi
    
    # Check EF Core Tools
    if ! dotnet ef --version &> /dev/null 2>&1; then
        log_info "Installing EF Core tools..."
        dotnet tool install --global dotnet-ef
        export PATH="$PATH:$HOME/.dotnet/tools"
    fi
    
    log_info ".NET $(dotnet --version) ready"
}

# ============================================
# Package Manager Detection
# ============================================
detect_package_manager() {
    cd "$SCRIPT_DIR/frontend"
    
    if [ -f "pnpm-lock.yaml" ]; then
        PKG_MGR="pnpm"
        PKG_INSTALL="pnpm install"
        PKG_DEV="pnpm dev"
    elif [ -f "yarn.lock" ]; then
        PKG_MGR="yarn"
        PKG_INSTALL="yarn install"
        PKG_DEV="yarn dev"
    else
        PKG_MGR="npm"
        PKG_INSTALL="npm install"
        PKG_DEV="npm run dev"
    fi
    
    cd "$SCRIPT_DIR"
    log_info "Package manager: $PKG_MGR"
}

# ============================================
# Install Dependencies
# ============================================
install_dependencies() {
    log_step "Installing dependencies..."
    
    # Frontend
    if [ ! -d "$SCRIPT_DIR/frontend/node_modules" ]; then
        log_info "Installing frontend dependencies..."
        cd "$SCRIPT_DIR/frontend"
        $PKG_INSTALL
        cd "$SCRIPT_DIR"
    else
        log_info "Frontend dependencies already installed"
    fi
    
    # Backend
    log_info "Restoring backend dependencies..."
    cd "$SCRIPT_DIR/backend"
    dotnet restore
    cd "$SCRIPT_DIR"
}

# ============================================
# Get LAN IP
# ============================================
get_lan_ip() {
    # Filter out Docker bridge (172.17.x.x, 172.18.x.x) and IPv6
    hostname -I 2>/dev/null | tr ' ' '\n' | \
        grep -E '^192\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\.' | \
        grep -v '^172\.17\.' | \
        grep -v '^172\.18\.' | \
        head -1
}

# ============================================
# Mode Selection
# ============================================
select_mode() {
    if [ -n "$1" ]; then
        case "$1" in
            dev|1) MODE="dev" ;;
            prod|2) MODE="prod" ;;
            *) MODE="dev" ;;
        esac
    else
        echo ""
        echo "Select environment mode:"
        echo "  1) dev  - Development with LAN access"
        echo "  2) prod - Production server"
        echo ""
        read -p "Choice [1-2]: " choice
        
        case $choice in
            1|dev) MODE="dev" ;;
            2|prod) MODE="prod" ;;
            *) MODE="dev" ;;
        esac
    fi
    
    log_info "Mode: $MODE"
}

# ============================================
# Network Configuration
# ============================================
configure_network() {
    log_step "Configuring network..."
    
    if [ "$MODE" == "dev" ]; then
        LAN_IP=$(get_lan_ip)
        
        echo ""
        echo "Select IP configuration:"
        echo ""
        if [ -n "$LAN_IP" ]; then
            echo "  1) Use $LAN_IP (LAN access enabled)"
        else
            echo "  1) (No LAN IP detected)"
        fi
        echo "  2) Use localhost (portable, no LAN access)"
        echo "  3) Enter custom IP"
        echo ""
        
        read -p "Choice [1]: " ip_choice
        ip_choice=${ip_choice:-1}
        
        case $ip_choice in
            1)
                if [ -z "$LAN_IP" ]; then
                    log_warn "No LAN IP detected"
                    read -p "Enter IP: " LAN_IP
                fi
                HOST=$LAN_IP
                ;;
            2)
                LAN_IP="localhost"
                HOST="localhost"
                ;;
            3)
                read -p "Enter IP: " LAN_IP
                HOST=$LAN_IP
                ;;
            *)
                HOST=${LAN_IP:-localhost}
                LAN_IP=${LAN_IP:-localhost}
                ;;
        esac
        
        PROTOCOL="http"
        WS_PROTOCOL="ws"
        CORS_ORIGINS="http://localhost:5173,http://$HOST:5173"
        DOMAIN="localhost"
        
        # Dev mode LiveKit settings
        USE_EXTERNAL_IP="false"
        ENABLE_LOOPBACK="true"
        TURN_ENABLED="false"
        TURN_DOMAIN="$HOST"
        LIVEKIT_NODE_IP="$HOST"
        
    else
        read -p "Enter domain (e.g., chord.example.com): " DOMAIN
        HOST=$DOMAIN
        
        read -p "Use SSL? [Y/n]: " use_ssl
        if [[ "$use_ssl" =~ ^[Nn]$ ]]; then
            PROTOCOL="http"
            WS_PROTOCOL="ws"
        else
            PROTOCOL="https"
            WS_PROTOCOL="wss"
        fi
        
        CORS_ORIGINS="$PROTOCOL://$DOMAIN"
        LAN_IP=""
        
        # Get public IP for production
        read -p "Enter public IP (for LiveKit/TURN): " PUBLIC_IP
        
        # Prod mode LiveKit settings
        USE_EXTERNAL_IP="true"
        ENABLE_LOOPBACK="false"
        TURN_ENABLED="true"
        TURN_DOMAIN="$DOMAIN"
        LIVEKIT_NODE_IP="$PUBLIC_IP"
    fi
    
    log_info "Host: $HOST"
    log_info "Protocol: $PROTOCOL"
}

# ============================================
# Stop Existing Services
# ============================================
stop_existing() {
    log_step "Stopping existing services..."
    
    # Kill running processes
    pkill -f "dotnet.*run" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    pkill -f "npm.*dev" 2>/dev/null || true
    
    # Stop docker if running
    cd "$SCRIPT_DIR/backend"
    if docker compose -f docker-compose.dev.yml ps -q 2>/dev/null | grep -q .; then
        docker compose -f docker-compose.dev.yml down 2>/dev/null || true
    fi
    cd "$SCRIPT_DIR"
    
    log_info "Existing services stopped"
}

# ============================================
# Port Check
# ============================================
check_ports() {
    log_step "Checking ports..."
    
    PORTS=(5049 5173 7880 7881 9000 3478 1433 6379)
    BLOCKED=false
    
    for port in "${PORTS[@]}"; do
        if command -v lsof &> /dev/null; then
            if lsof -i:$port &> /dev/null; then
                log_warn "Port $port is in use"
                BLOCKED=true
            fi
        elif command -v ss &> /dev/null; then
            if ss -tuln | grep -q ":$port "; then
                log_warn "Port $port is in use"
                BLOCKED=true
            fi
        fi
    done
    
    if [ "$BLOCKED" = true ]; then
        read -p "Some ports are in use. Continue anyway? [y/N]: " cont
        if [[ ! "$cont" =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        log_info "All ports available"
    fi
}

# ============================================
# Secret Generation
# ============================================
generate_secret() {
    local length=${1:-32}
    # Alphanumeric only - no special chars that break sed/shell
    LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c $length
}

# ============================================
# Secret Management
# ============================================
manage_secrets() {
    log_step "Managing secrets..."
    
    # Check for existing .env
    if [ -f "$SCRIPT_DIR/backend/.env" ]; then
        echo ""
        read -p "Existing .env found. Preserve secrets? [Y/n]: " preserve
        if [[ ! "$preserve" =~ ^[Nn]$ ]]; then
            log_info "Preserving existing secrets..."
            SQL_SA_PASSWORD=$(grep "^SQL_SA_PASSWORD=" "$SCRIPT_DIR/backend/.env" 2>/dev/null | cut -d= -f2 || echo "")
            JWT_SECRET=$(grep "^JWT_SECRET=" "$SCRIPT_DIR/backend/.env" 2>/dev/null | cut -d= -f2 || echo "")
            LIVEKIT_API_SECRET=$(grep "^LIVEKIT_API_SECRET=" "$SCRIPT_DIR/backend/.env" 2>/dev/null | cut -d= -f2 || echo "")
            MINIO_ROOT_PASSWORD=$(grep "^MINIO_ROOT_PASSWORD=" "$SCRIPT_DIR/backend/.env" 2>/dev/null | cut -d= -f2 || echo "")
            TURN_SECRET=$(grep "^TURN_SECRET=" "$SCRIPT_DIR/backend/.env" 2>/dev/null | cut -d= -f2 || echo "")
        fi
    fi
    
    # Generate missing secrets
    [ -z "$SQL_SA_PASSWORD" ] && SQL_SA_PASSWORD=$(generate_secret 24) && log_info "Generated SQL_SA_PASSWORD"
    [ -z "$JWT_SECRET" ] && JWT_SECRET=$(generate_secret 64) && log_info "Generated JWT_SECRET"
    [ -z "$LIVEKIT_API_SECRET" ] && LIVEKIT_API_SECRET=$(generate_secret 32) && log_info "Generated LIVEKIT_API_SECRET"
    [ -z "$MINIO_ROOT_PASSWORD" ] && MINIO_ROOT_PASSWORD=$(generate_secret 24) && log_info "Generated MINIO_ROOT_PASSWORD"
    [ -z "$TURN_SECRET" ] && TURN_SECRET=$(generate_secret 24) && log_info "Generated TURN_SECRET"
}

# ============================================
# Replace Placeholder in File
# ============================================
replace_placeholder() {
    local file=$1
    local placeholder=$2
    local value=$3
    
    if [[ "$OS" == "macos" ]]; then
        sed -i '' "s|{{$placeholder}}|$value|g" "$file"
    else
        sed -i "s|{{$placeholder}}|$value|g" "$file"
    fi
}

# ============================================
# Generate Configuration Files
# ============================================
generate_configs() {
    log_step "Generating configuration files..."
    
    # Backend .env
    cp "$SCRIPT_DIR/backend/.env.example" "$SCRIPT_DIR/backend/.env"
    replace_placeholder "$SCRIPT_DIR/backend/.env" "HOST" "$HOST"
    replace_placeholder "$SCRIPT_DIR/backend/.env" "LAN_IP" "$LAN_IP"
    replace_placeholder "$SCRIPT_DIR/backend/.env" "PROTOCOL" "$PROTOCOL"
    replace_placeholder "$SCRIPT_DIR/backend/.env" "WS_PROTOCOL" "$WS_PROTOCOL"
    replace_placeholder "$SCRIPT_DIR/backend/.env" "SQL_SA_PASSWORD" "$SQL_SA_PASSWORD"
    replace_placeholder "$SCRIPT_DIR/backend/.env" "JWT_SECRET" "$JWT_SECRET"
    replace_placeholder "$SCRIPT_DIR/backend/.env" "CORS_ORIGINS" "$CORS_ORIGINS"
    replace_placeholder "$SCRIPT_DIR/backend/.env" "MINIO_ROOT_PASSWORD" "$MINIO_ROOT_PASSWORD"
    replace_placeholder "$SCRIPT_DIR/backend/.env" "LIVEKIT_API_SECRET" "$LIVEKIT_API_SECRET"
    replace_placeholder "$SCRIPT_DIR/backend/.env" "LIVEKIT_NODE_IP" "$LIVEKIT_NODE_IP"
    replace_placeholder "$SCRIPT_DIR/backend/.env" "TURN_SECRET" "$TURN_SECRET"
    replace_placeholder "$SCRIPT_DIR/backend/.env" "DOMAIN" "$DOMAIN"
    log_info "Generated backend/.env"
    
    # Frontend .env
    cp "$SCRIPT_DIR/frontend/.env.example" "$SCRIPT_DIR/frontend/.env"
    replace_placeholder "$SCRIPT_DIR/frontend/.env" "HOST" "$HOST"
    replace_placeholder "$SCRIPT_DIR/frontend/.env" "PROTOCOL" "$PROTOCOL"
    replace_placeholder "$SCRIPT_DIR/frontend/.env" "API_PORT" "5049"
    replace_placeholder "$SCRIPT_DIR/frontend/.env" "FRONTEND_PORT" "5173"
    log_info "Generated frontend/.env"
    
    # LiveKit config
    cp "$SCRIPT_DIR/backend/livekit.yaml.template" "$SCRIPT_DIR/backend/livekit.yaml"
    replace_placeholder "$SCRIPT_DIR/backend/livekit.yaml" "USE_EXTERNAL_IP" "$USE_EXTERNAL_IP"
    replace_placeholder "$SCRIPT_DIR/backend/livekit.yaml" "ENABLE_LOOPBACK" "$ENABLE_LOOPBACK"
    replace_placeholder "$SCRIPT_DIR/backend/livekit.yaml" "TURN_ENABLED" "$TURN_ENABLED"
    replace_placeholder "$SCRIPT_DIR/backend/livekit.yaml" "TURN_DOMAIN" "$TURN_DOMAIN"
    log_info "Generated backend/livekit.yaml"
    
    # Turnserver config
    cp "$SCRIPT_DIR/backend/turnserver.conf.template" "$SCRIPT_DIR/backend/turnserver.conf"
    replace_placeholder "$SCRIPT_DIR/backend/turnserver.conf" "TURN_REALM" "chord.local"
    replace_placeholder "$SCRIPT_DIR/backend/turnserver.conf" "TURN_SECRET" "$TURN_SECRET"
    # Handle TURN_EXTERNAL_CONFIG (may contain newlines)
    if [ "$MODE" == "prod" ]; then
        # For production, insert actual config lines
        if [[ "$OS" == "macos" ]]; then
            sed -i '' "s|{{TURN_EXTERNAL_CONFIG}}|external-ip=$PUBLIC_IP\\
relay-ip=$PUBLIC_IP\\
listening-ip=0.0.0.0|g" "$SCRIPT_DIR/backend/turnserver.conf"
        else
            sed -i "s|{{TURN_EXTERNAL_CONFIG}}|external-ip=$PUBLIC_IP\nrelay-ip=$PUBLIC_IP\nlistening-ip=0.0.0.0|g" "$SCRIPT_DIR/backend/turnserver.conf"
        fi
    else
        # For dev, just add a comment
        replace_placeholder "$SCRIPT_DIR/backend/turnserver.conf" "TURN_EXTERNAL_CONFIG" "# Not needed for development"
    fi
    log_info "Generated backend/turnserver.conf"
    
    # Caddyfile (for prod)
    if [ "$MODE" == "prod" ]; then
        cp "$SCRIPT_DIR/backend/Caddyfile.template" "$SCRIPT_DIR/backend/Caddyfile"
        replace_placeholder "$SCRIPT_DIR/backend/Caddyfile" "DOMAIN" "$DOMAIN"
        log_info "Generated backend/Caddyfile"
    fi
}

# ============================================
# Start Docker Services
# ============================================
start_docker_services() {
    log_step "Starting Docker services..."
    
    cd "$SCRIPT_DIR/backend"
    docker compose -f docker-compose.dev.yml up -d
    
    log_info "Waiting for SQL Server to be ready..."
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker exec chord-sqlserver /opt/mssql-tools18/bin/sqlcmd \
            -S localhost -U sa -P "$SQL_SA_PASSWORD" -Q "SELECT 1" -C &>/dev/null 2>&1; then
            break
        fi
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    echo ""
    
    if [ $attempt -eq $max_attempts ]; then
        log_error "SQL Server failed to start"
        exit 1
    fi
    
    log_info "Docker services ready"
    cd "$SCRIPT_DIR"
}

# ============================================
# Run Database Migrations
# ============================================
run_migrations() {
    log_step "Running database migrations..."
    
    cd "$SCRIPT_DIR/backend"
    dotnet ef database update
    cd "$SCRIPT_DIR"
    
    log_info "Database migrations complete"
}

# ============================================
# Setup MinIO Bucket
# ============================================
setup_minio() {
    log_step "Setting up MinIO bucket..."
    
    # Wait a moment for MinIO to be ready
    sleep 3
    
    # Create bucket using mc inside the container
    docker exec chord-minio mc alias set local http://localhost:9000 minioadmin "$MINIO_ROOT_PASSWORD" 2>/dev/null || \
        docker exec chord-minio mc alias set local http://localhost:9000 minioadmin minioadmin 2>/dev/null || true
    
    docker exec chord-minio mc mb local/chord-uploads --ignore-existing 2>/dev/null || true
    docker exec chord-minio mc anonymous set download local/chord-uploads 2>/dev/null || true
    
    log_info "MinIO bucket ready"
}

# ============================================
# Configure Firewall
# ============================================
configure_firewall() {
    log_step "Configuring firewall..."
    
    if [ "$HAVE_SUDO" != "true" ]; then
        log_warn "Skipping firewall configuration (no sudo access)"
        show_firewall_instructions
        return
    fi
    
    if command -v ufw &> /dev/null; then
        log_info "Configuring ufw..."
        sudo ufw allow 5049/tcp comment 'Chord API' 2>/dev/null || true
        sudo ufw allow 5173/tcp comment 'Chord Frontend' 2>/dev/null || true
        sudo ufw allow 7880/tcp comment 'LiveKit WS' 2>/dev/null || true
        sudo ufw allow 7881/udp comment 'LiveKit RTC' 2>/dev/null || true
        sudo ufw allow 9000/tcp comment 'MinIO' 2>/dev/null || true
        sudo ufw allow 3478/udp comment 'TURN' 2>/dev/null || true
        sudo ufw allow 3478/tcp comment 'TURN' 2>/dev/null || true
        log_info "Firewall configured (ufw)"
    elif command -v firewall-cmd &> /dev/null; then
        log_info "Configuring firewalld..."
        for port in 5049/tcp 5173/tcp 7880/tcp 7881/udp 9000/tcp 3478/udp 3478/tcp; do
            sudo firewall-cmd --add-port=$port --permanent 2>/dev/null || true
        done
        sudo firewall-cmd --reload 2>/dev/null || true
        log_info "Firewall configured (firewalld)"
    else
        show_firewall_instructions
    fi
}

show_firewall_instructions() {
    echo ""
    log_warn "Manual firewall configuration may be needed:"
    echo "  - 5049/tcp  (Backend API)"
    echo "  - 5173/tcp  (Frontend)"
    echo "  - 7880/tcp  (LiveKit WebSocket)"
    echo "  - 7881/udp  (LiveKit RTC)"
    echo "  - 9000/tcp  (MinIO)"
    echo "  - 3478/udp  (TURN)"
    echo ""
}

# ============================================
# Generate Start/Stop Scripts
# ============================================
generate_scripts() {
    log_step "Generating start/stop scripts..."
    
    # Determine launch profile
    if [ "$MODE" == "dev" ]; then
        LAUNCH_PROFILE="lan"
    else
        LAUNCH_PROFILE="http"
    fi
    
    # Generate start-dev.sh
    cat > "$SCRIPT_DIR/start-dev.sh" << SCRIPT
#!/bin/bash
# Chord Development Start Script
# Generated by setup-env.sh

set -e
cd "\$(dirname "\$0")"

echo "Starting Chord Development Environment..."

# Load nvm if available
if [ -s "\$HOME/.nvm/nvm.sh" ]; then
    export NVM_DIR="\$HOME/.nvm"
    source "\$NVM_DIR/nvm.sh"
    [ -f ".nvmrc" ] && nvm use 2>/dev/null
fi

# Start Docker services
echo "Starting Docker services..."
cd backend
docker compose -f docker-compose.dev.yml up -d
cd ..

# Wait for services
echo "Waiting for services to be ready..."
sleep 5

# Start backend
echo "Starting backend..."
cd backend
dotnet run --launch-profile $LAUNCH_PROFILE &
BACKEND_PID=\$!
cd ..

# Start frontend
echo "Starting frontend..."
cd frontend
$PKG_DEV &
FRONTEND_PID=\$!
cd ..

echo ""
echo "=========================================="
echo "  Chord is running!"
echo "=========================================="
echo ""
echo "  Local:   http://localhost:5173"
echo "  Network: http://$HOST:5173"
echo ""
echo "  Press Ctrl+C to stop all services"
echo "=========================================="
echo ""

# Cleanup on exit
cleanup() {
    echo ""
    echo "Stopping services..."
    kill \$BACKEND_PID 2>/dev/null || true
    kill \$FRONTEND_PID 2>/dev/null || true
    cd backend
    docker compose -f docker-compose.dev.yml down
    cd ..
    echo "Stopped."
}

trap cleanup EXIT
wait
SCRIPT
    
    chmod +x "$SCRIPT_DIR/start-dev.sh"
    log_info "Generated start-dev.sh"
    
    # Generate stop.sh
    cat > "$SCRIPT_DIR/stop.sh" << 'SCRIPT'
#!/bin/bash
# Chord Stop Script
# Generated by setup-env.sh

cd "$(dirname "$0")"

echo "Stopping Chord services..."

# Stop running processes (dev mode)
pkill -f "dotnet.*run" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
pkill -f "npm.*dev" 2>/dev/null || true

# Stop Docker services (try all compose files)
cd backend
docker compose -f docker-compose.dev.yml down 2>/dev/null || true
docker compose -f docker-compose.prod.yml down 2>/dev/null || true
cd ..

# Stop blue-green deployment (production)
docker compose -f docker-compose.deploy.yml --profile infra down 2>/dev/null || true
docker compose -f docker-compose.deploy.yml --profile blue down 2>/dev/null || true
docker compose -f docker-compose.deploy.yml --profile green down 2>/dev/null || true

echo "All services stopped."
SCRIPT
    
    chmod +x "$SCRIPT_DIR/stop.sh"
    log_info "Generated stop.sh"
    
    # Generate start-prod.sh (only for prod mode)
    if [ "$MODE" == "prod" ]; then
        cat > "$SCRIPT_DIR/start-prod.sh" << SCRIPT
#!/bin/bash
# Chord Production Start Script (Blue-Green Compatible)
# Generated by setup-env.sh
#
# This script starts infrastructure services only.
# Application deployment is handled by GitHub Actions or scripts/deploy.sh

set -e
cd "\$(dirname "\$0")"

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║   Chord Production Infrastructure     ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# Start infrastructure services (DB, Redis, MinIO, LiveKit, Coturn, Caddy)
echo "Starting infrastructure services..."
docker compose -f docker-compose.deploy.yml --profile infra up -d

echo ""
echo "Waiting for services to be healthy..."
sleep 10

# Check health
docker ps --format "table {{.Names}}\t{{.Status}}" | grep chord

echo ""
echo "=========================================="
echo "  Infrastructure is running!"
echo "=========================================="
echo ""
echo "  Domain: $PROTOCOL://$DOMAIN"
echo ""
echo "  Next steps:"
echo "    1. Push to main branch for automatic deploy"
echo "    OR"
echo "    2. Manual deploy:"
echo "       ./scripts/deploy.sh --image-tag latest \\\\"
echo "         --registry ghcr.io --repo YOUR_GITHUB_USER/chord"
echo ""
echo "  Useful commands:"
echo "    - Status:   ./scripts/rollback.sh --status"
echo "    - Rollback: ./scripts/rollback.sh"
echo "    - Logs:     docker compose -f docker-compose.deploy.yml logs -f"
echo "    - Stop:     ./stop.sh"
echo ""
echo "=========================================="
SCRIPT
        
        chmod +x "$SCRIPT_DIR/start-prod.sh"
        log_info "Generated start-prod.sh"
    fi
}

# ============================================
# GitHub Actions CI/CD Setup (Production only)
# ============================================
setup_github_actions() {
    log_step "GitHub Actions CI/CD Setup..."
    
    echo ""
    echo "An SSH key will be generated for GitHub Actions automated deployment."
    echo "This key allows GitHub to connect to your VPS and deploy."
    echo ""
    
    read -p "Do you want to setup GitHub Actions CI/CD? [Y/n]: " setup_cicd
    if [[ "$setup_cicd" =~ ^[Nn]$ ]]; then
        log_info "GitHub Actions setup skipped"
        return 0
    fi
    
    SSH_DIR="$HOME/.ssh"
    SSH_KEY_PATH="$SSH_DIR/chord_deploy_key"
    
    # Ensure .ssh directory exists
    mkdir -p "$SSH_DIR"
    chmod 700 "$SSH_DIR"
    
    # Generate SSH key if not exists
    if [ ! -f "$SSH_KEY_PATH" ]; then
        log_info "Generating SSH deploy key..."
        ssh-keygen -t ed25519 -C "chord-deploy@github-actions" -f "$SSH_KEY_PATH" -N ""
        
        # Add to authorized_keys
        touch "$SSH_DIR/authorized_keys"
        chmod 600 "$SSH_DIR/authorized_keys"
        
        # Check if key already in authorized_keys
        if ! grep -q "chord-deploy@github-actions" "$SSH_DIR/authorized_keys" 2>/dev/null; then
            cat "${SSH_KEY_PATH}.pub" >> "$SSH_DIR/authorized_keys"
        fi
        
        log_success "SSH key created: $SSH_KEY_PATH"
    else
        log_info "SSH key already exists: $SSH_KEY_PATH"
    fi
    
    # Get current user and detect SSH port
    CURRENT_USER=$(whoami)
    SSH_PORT=${SSH_PORT:-22}
    
    echo ""
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║            GitHub Repository Setup Required                   ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Complete the following steps in your GitHub repository:"
    echo ""
    echo "1. Go to: GitHub repo → Settings → Secrets and variables → Actions"
    echo "   Click 'New repository secret' and add the following secrets:"
    echo ""
    echo "   ┌──────────────────┬────────────────────────────────────────────┐"
    echo "   │ Secret Name      │ Value                                      │"
    echo "   ├──────────────────┼────────────────────────────────────────────┤"
    echo "   │ VPS_HOST         │ $HOST                                      │"
    echo "   │ VPS_USER         │ $CURRENT_USER                              │"
    echo "   │ VPS_SSH_PORT     │ $SSH_PORT                                  │"
    echo "   │ VPS_DEPLOY_PATH  │ $SCRIPT_DIR                                │"
    echo "   └──────────────────┴────────────────────────────────────────────┘"
    echo ""
    echo "2. For VPS_SSH_KEY, copy the PRIVATE KEY below:"
    echo "   (Copy EVERYTHING including the BEGIN and END lines)"
    echo ""
    echo "════════════════════ PRIVATE KEY START ════════════════════"
    cat "$SSH_KEY_PATH"
    echo "════════════════════ PRIVATE KEY END ══════════════════════"
    echo ""
    echo "3. (Optional) Settings → Environments → New environment"
    echo "   Create an environment named 'production'."
    echo "   You can add protection rules (e.g., required reviewers)"
    echo ""
    echo "────────────────────────────────────────────────────────────"
    echo ""
    
    read -p "Have you added the GitHub secrets? [y/N]: " github_done
    if [[ "$github_done" =~ ^[Yy]$ ]]; then
        log_success "GitHub Actions CI/CD setup complete!"
        echo ""
        echo "Now pushing to main branch will trigger automatic deployment!"
        echo ""
    else
        log_warn "You can add the GitHub secrets later."
        echo ""
        echo "SSH Key files:"
        echo "   Private key: $SSH_KEY_PATH"
        echo "   Public key:  ${SSH_KEY_PATH}.pub"
        echo ""
        echo "To view the private key later:"
        echo "   cat $SSH_KEY_PATH"
        echo ""
    fi
}

# ============================================
# Main
# ============================================
main() {
    echo ""
    echo "╔═══════════════════════════════════════╗"
    echo "║      Chord Environment Setup          ║"
    echo "╚═══════════════════════════════════════╝"
    echo ""
    
    cd "$SCRIPT_DIR"
    
    detect_os
    check_sudo
    check_docker
    check_node
    check_dotnet
    detect_package_manager
    install_dependencies
    select_mode "$1"
    configure_network
    stop_existing
    check_ports
    manage_secrets
    generate_configs
    start_docker_services
    run_migrations
    setup_minio
    configure_firewall
    generate_scripts
    
    # Setup GitHub Actions CI/CD for production
    if [ "$MODE" == "prod" ]; then
        setup_github_actions
    fi
    
    echo ""
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║                   Setup Complete!                         ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo ""
    
    if [ "$MODE" == "dev" ]; then
        echo "Generated files:"
        echo "   - backend/.env"
        echo "   - frontend/.env"
        echo "   - backend/livekit.yaml"
        echo "   - backend/turnserver.conf"
        echo "   - start-dev.sh"
        echo "   - stop.sh"
        echo ""
        echo "To start Chord:"
        echo "   ./start-dev.sh"
        echo ""
        echo "Access URLs:"
        echo "   Local:      http://localhost:5173"
        echo "   Network:    http://$HOST:5173"
        echo "   API:        http://localhost:5049"
        echo "   Swagger:    http://localhost:5049/swagger"
        echo "   MinIO:      http://localhost:9001 (minioadmin / check .env for password)"
        echo ""
        echo "To stop all services:"
        echo "   ./stop.sh"
        echo ""
        echo "Tips:"
        echo "   - Access from other devices on LAN: http://$HOST:5173"
        echo "   - Changed networks? Run: ./update-ip.sh"
        echo "   - View logs: docker compose -f backend/docker-compose.dev.yml logs -f"
        echo "   - Recreate: rm backend/.env frontend/.env && ./setup-env.sh dev"
    else
        echo "Generated files:"
        echo "   - backend/.env"
        echo "   - frontend/.env"
        echo "   - backend/livekit.yaml"
        echo "   - backend/turnserver.conf"
        echo "   - backend/Caddyfile"
        echo "   - start-prod.sh (infrastructure only)"
        echo "   - stop.sh"
        echo ""
        echo "To start Chord Production:"
        echo ""
        echo "   Step 1: Start infrastructure"
        echo "      ./start-prod.sh"
        echo ""
        echo "   Step 2: Deploy application (choose one):"
        echo "      a) Push to main branch (automatic via GitHub Actions)"
        echo "      b) Manual: ./scripts/deploy.sh --image-tag latest \\"
        echo "           --registry ghcr.io --repo YOUR_USER/chord"
        echo ""
        echo "URL: $PROTOCOL://$DOMAIN"
        echo ""
        echo "CI/CD (Blue-Green Deployment):"
        echo "   - Complete the GitHub setup steps above for automatic deployment"
        echo "   - Push to main branch = automatic deploy"
        echo "   - Status: ./scripts/rollback.sh --status"
        echo "   - Rollback: ./scripts/rollback.sh"
        echo ""
        echo "Security Reminders:"
        echo "   - Ensure firewall allows ports: 80, 443, 7880, 7881/udp, 3478"
        echo "   - Caddy handles SSL automatically for your domain"
        echo "   - Keep .env file secure: chmod 600 backend/.env"
        echo ""
        echo "Useful commands:"
        echo "   - View logs: docker compose -f docker-compose.deploy.yml logs -f"
        echo "   - Stop all: ./stop.sh"
    fi
    echo ""
}

main "$@"

