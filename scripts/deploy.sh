#!/bin/bash
# Chord Blue-Green Deployment Script
# Performs zero-downtime deployment using blue-green strategy
#
# Usage:
#   ./deploy.sh --image-tag <tag> --registry <registry> --repo <repo> [compose-files...]
#
# Examples:
#   ./deploy.sh --image-tag abc123 --registry ghcr.io --repo username/chord
#   ./deploy.sh --image-tag abc123 --registry ghcr.io --repo username/chord -f docker-compose.deploy.yml -f docker-compose.yunohost.yml

set -e

# ===========================================
# Configuration
# ===========================================

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
STATE_FILE="$PROJECT_DIR/.deploy-state"
HEALTH_TIMEOUT=120
HEALTH_INTERVAL=5

# Default compose files
COMPOSE_FILES=("-f" "$PROJECT_DIR/docker-compose.deploy.yml")

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ===========================================
# Functions
# ===========================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_usage() {
    echo "Usage: $0 [OPTIONS] [-f compose-file ...]"
    echo ""
    echo "Options:"
    echo "  --image-tag TAG     Docker image tag (required)"
    echo "  --registry REG      Container registry (default: ghcr.io)"
    echo "  --repo REPO         GitHub repository (required)"
    echo "  -f FILE             Docker compose file (can be specified multiple times)"
    echo "                      Default: -f docker-compose.deploy.yml"
    echo "  --skip-infra        Skip infrastructure health check"
    echo "  --force             Force deployment even if health check fails"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --image-tag abc123 --registry ghcr.io --repo username/chord"
    echo "  $0 --image-tag abc123 --repo user/chord -f docker-compose.deploy.yml -f docker-compose.yunohost.yml"
}

get_active_stack() {
    if [ -f "$STATE_FILE" ]; then
        cat "$STATE_FILE"
    else
        echo "none"
    fi
}

set_active_stack() {
    echo "$1" > "$STATE_FILE"
}

get_inactive_stack() {
    local active=$(get_active_stack)
    if [ "$active" == "blue" ]; then
        echo "green"
    else
        echo "blue"
    fi
}

get_api_port() {
    local stack=$1
    if [ "$stack" == "blue" ]; then
        echo "5002"
    else
        echo "5003"
    fi
}

get_frontend_port() {
    local stack=$1
    if [ "$stack" == "blue" ]; then
        echo "3002"
    else
        echo "3003"
    fi
}

is_yunohost_deployment() {
    # Check if docker-compose.yunohost.yml is in COMPOSE_FILES
    for file in "${COMPOSE_FILES[@]}"; do
        if [[ "$file" == *"yunohost"* ]] || [[ "$file" == *"docker-compose.yunohost.yml"* ]]; then
            return 0  # true
        fi
    done
    # Also check if file exists in project directory
    if [ -f "$PROJECT_DIR/docker-compose.yunohost.yml" ]; then
        return 0  # true
    fi
    return 1  # false
}

health_check() {
    local stack=$1
    local api_port=$(get_api_port "$stack")
    local frontend_port=$(get_frontend_port "$stack")
    local elapsed=0
    
    log_info "Waiting for $stack stack to be healthy..."
    
    while [ $elapsed -lt $HEALTH_TIMEOUT ]; do
        local api_healthy=false
        local frontend_healthy=false
        
        # Check API health
        if curl -sf "http://localhost:$api_port/health" > /dev/null 2>&1; then
            api_healthy=true
        fi
        
        # Check Frontend health
        if curl -sf "http://localhost:$frontend_port/health" > /dev/null 2>&1; then
            frontend_healthy=true
        fi
        
        # Both must be healthy
        if [ "$api_healthy" = true ] && [ "$frontend_healthy" = true ]; then
            log_success "$stack stack is healthy!"
            return 0
        fi
        
        sleep $HEALTH_INTERVAL
        elapsed=$((elapsed + HEALTH_INTERVAL))
        echo -n "."
    done
    
    echo ""
    log_error "$stack stack health check failed after ${HEALTH_TIMEOUT}s"
    return 1
}

check_infra() {
    log_info "Checking infrastructure services..."
    
    # Check if infra containers are running
    local infra_containers=("chord-sqlserver" "chord-redis" "chord-minio" "chord-livekit")
    local all_running=true
    
    for container in "${infra_containers[@]}"; do
        if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
            echo "  ✓ $container running"
        else
            echo "  ✗ $container not running"
            all_running=false
        fi
    done
    
    if [ "$all_running" = false ]; then
        log_warn "Some infrastructure services are not running"
        log_info "Starting infrastructure..."
        docker compose "${COMPOSE_FILES[@]}" --profile infra up -d
        sleep 10
    fi
}

update_caddy() {
    local stack=$1
    local api_port=$(get_api_port "$stack")
    local frontend_port=$(get_frontend_port "$stack")
    
    log_info "Updating Caddy to route to $stack stack..."
    
    # Generate Caddyfile with correct upstream
    cat > "$PROJECT_DIR/backend/Caddyfile" << EOF
# Chord Caddy Configuration
# Auto-generated by deploy.sh - Active stack: $stack

{
    admin off
}

\${DOMAIN:localhost} {
    # API endpoints
    handle /api/* {
        reverse_proxy localhost:$api_port
    }

    # SignalR WebSocket hubs
    handle /hubs/* {
        reverse_proxy localhost:$api_port
    }

    # Health check
    handle /health {
        reverse_proxy localhost:$api_port
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
        reverse_proxy localhost:$frontend_port
    }
}
EOF
    
    # Reload Caddy
    if docker ps --format '{{.Names}}' | grep -q "chord-caddy"; then
        docker exec chord-caddy caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || \
        docker restart chord-caddy
    fi
    
    log_success "Caddy updated to route to $stack stack"
}

deploy_stack() {
    local stack=$1
    
    log_info "Deploying $stack stack..."
    log_info "  Registry: $REGISTRY"
    log_info "  Repo: $GITHUB_REPO"
    log_info "  Tag: $IMAGE_TAG"
    
    # Export variables for docker-compose
    export REGISTRY
    export GITHUB_REPO
    export IMAGE_TAG
    
    # Pull new images
    log_info "Pulling new images..."
    docker pull "${REGISTRY}/${GITHUB_REPO}/api:${IMAGE_TAG}"
    docker pull "${REGISTRY}/${GITHUB_REPO}/frontend:${IMAGE_TAG}"
    
    # Start the stack
    log_info "Starting $stack stack..."
    docker compose "${COMPOSE_FILES[@]}" --profile "$stack" up -d
    
    return 0
}

stop_stack() {
    local stack=$1
    
    log_info "Stopping $stack stack..."
    docker compose "${COMPOSE_FILES[@]}" --profile "$stack" down --remove-orphans 2>/dev/null || true
}

rollback() {
    local failed_stack=$1
    local active_stack=$(get_active_stack)
    
    log_error "Deployment failed! Rolling back..."
    
    # Stop failed stack
    stop_stack "$failed_stack"
    
    # Ensure active stack is still running
    if [ "$active_stack" != "none" ]; then
        log_info "Ensuring $active_stack stack is running..."
        docker compose "${COMPOSE_FILES[@]}" --profile "$active_stack" up -d

        # Only update Caddy if not YunoHost
        if ! is_yunohost_deployment; then
            update_caddy "$active_stack"
        fi
    fi
    
    log_warn "Rollback complete. System is running on $active_stack stack."
}

# ===========================================
# Main
# ===========================================

# Parse arguments
REGISTRY="ghcr.io"
SKIP_INFRA=false
FORCE=false
CUSTOM_COMPOSE_FILES=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --image-tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        --registry)
            REGISTRY="$2"
            shift 2
            ;;
        --repo)
            GITHUB_REPO="$2"
            shift 2
            ;;
        -f)
            if [ "$CUSTOM_COMPOSE_FILES" = false ]; then
                COMPOSE_FILES=()
                CUSTOM_COMPOSE_FILES=true
            fi
            COMPOSE_FILES+=("-f" "$2")
            shift 2
            ;;
        --skip-infra)
            SKIP_INFRA=true
            shift
            ;;
        --force)
            FORCE=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate required arguments
if [ -z "$IMAGE_TAG" ]; then
    log_error "Missing required argument: --image-tag"
    show_usage
    exit 1
fi

if [ -z "$GITHUB_REPO" ]; then
    log_error "Missing required argument: --repo"
    show_usage
    exit 1
fi

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║     Chord Blue-Green Deployment       ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# Get current state
ACTIVE_STACK=$(get_active_stack)

# Detect YunoHost deployment
IS_YUNOHOST=false
if is_yunohost_deployment; then
    IS_YUNOHOST=true
    log_info "YunoHost deployment detected - using green stack strategy"
fi

# Determine deployment strategy
if [ "$IS_YUNOHOST" = true ]; then
    # YunoHost: Deploy to blue first (staging), then green (production)
    DEPLOY_STACK="blue"
    log_info "Deploying to blue stack (staging) first..."
else
    # Standard: Deploy to inactive stack
    DEPLOY_STACK=$(get_inactive_stack)
fi

log_info "Current active stack: $ACTIVE_STACK"
log_info "Deploying to: $DEPLOY_STACK"

# Check infrastructure
if [ "$SKIP_INFRA" = false ]; then
    check_infra
fi

# Deploy to stack
deploy_stack "$DEPLOY_STACK"

# Health check
if health_check "$DEPLOY_STACK"; then
    # For YunoHost: Deploy to green stack after blue succeeds
    if [ "$IS_YUNOHOST" = true ] && [ "$DEPLOY_STACK" == "blue" ]; then
        log_info "Blue stack healthy. Deploying to green stack (production)..."
        deploy_stack "green"

        if health_check "green"; then
            log_success "Green stack deployed and healthy!"
            DEPLOY_STACK="green"  # Update for state tracking
            
            # Green is healthy, stop blue stack (no longer needed)
            log_info "Green stack is healthy. Stopping blue stack (staging)..."
            stop_stack "blue"
        else
            log_error "Green stack deployment failed!"
            log_warn "Blue stack (staging) is still running, but green (production) failed"
            log_warn "Manual intervention required to fix green stack"
            log_warn "Blue stack will remain running until green is fixed"
            # Don't exit - but deployment is incomplete
            exit 1
        fi
    fi

    # Switch traffic (only for Caddy/standalone deployments)
    if [ "$IS_YUNOHOST" = false ]; then
        update_caddy "$DEPLOY_STACK"
    else
        log_info "Skipping Caddy update (YunoHost uses Nginx)"
    fi

    # Update state
    set_active_stack "$DEPLOY_STACK"

    # Stop old stack (for standard deployments)
    if [ "$IS_YUNOHOST" = false ] && [ "$ACTIVE_STACK" != "none" ] && [ "$ACTIVE_STACK" != "$DEPLOY_STACK" ]; then
        log_info "Stopping old $ACTIVE_STACK stack..."
        stop_stack "$ACTIVE_STACK"
    fi
    
    echo ""
    log_success "Deployment complete!"
    log_success "Active stack: $DEPLOY_STACK"
    log_success "Image tag: $IMAGE_TAG"
    echo ""
else
    if [ "$FORCE" = true ]; then
        log_warn "Health check failed but --force was specified. Continuing..."
        if [ "$IS_YUNOHOST" = false ]; then
            update_caddy "$DEPLOY_STACK"
        fi
        set_active_stack "$DEPLOY_STACK"
        
        if [ "$IS_YUNOHOST" = false ] && [ "$ACTIVE_STACK" != "none" ] && [ "$ACTIVE_STACK" != "$DEPLOY_STACK" ]; then
            stop_stack "$ACTIVE_STACK"
        fi
    else
        rollback "$DEPLOY_STACK"
        exit 1
    fi
fi


