#!/bin/bash
# Chord Setup Script
# This script helps you set up Chord for standalone deployment

set -e

echo "========================================"
echo "        Chord Setup Script             "
echo "========================================"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if docker compose is available
if ! docker compose version &> /dev/null; then
    echo "Error: Docker Compose is not available. Please install Docker Compose."
    exit 1
fi

# Step 1: Create .env file if it doesn't exist
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✓ Created .env file from .env.example"
    else
        echo "Warning: .env.example not found. Creating minimal .env file..."
        cat > .env << 'EOF'
# Database
SQL_SA_PASSWORD=YourStrongPassword123!

# JWT
JWT_SECRET=YourJWTSecretKeyAtLeast32CharactersLongHere!

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin

# LiveKit
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
LIVEKIT_URL=ws://livekit:7880

# TURN
TURN_SECRET=turnpassword123

# Domain (for Caddy)
DOMAIN=localhost
EOF
        echo "✓ Created minimal .env file"
    fi
else
    echo "✓ .env file already exists"
fi

# Step 2: Ask for domain/IP
echo ""
read -p "Enter your domain or IP (default: localhost): " DOMAIN
DOMAIN=${DOMAIN:-localhost}

# Update DOMAIN in .env
if grep -q "^DOMAIN=" .env; then
    sed -i "s/^DOMAIN=.*/DOMAIN=$DOMAIN/" .env
else
    echo "DOMAIN=$DOMAIN" >> .env
fi
echo "✓ Domain set to: $DOMAIN"

# Step 3: Generate secure secrets if using defaults
echo ""
echo "Checking secrets..."

generate_secret() {
    openssl rand -hex 32
}

# Check JWT_SECRET
if grep -q "JWT_SECRET=YourJWTSecretKeyAtLeast32CharactersLongHere!" .env; then
    NEW_JWT_SECRET=$(generate_secret)
    sed -i "s/JWT_SECRET=.*/JWT_SECRET=$NEW_JWT_SECRET/" .env
    echo "✓ Generated new JWT secret"
fi

# Check LIVEKIT_API_SECRET
if grep -q "LIVEKIT_API_SECRET=secret" .env; then
    NEW_LIVEKIT_SECRET=$(generate_secret)
    sed -i "s/LIVEKIT_API_SECRET=.*/LIVEKIT_API_SECRET=$NEW_LIVEKIT_SECRET/" .env
    echo "✓ Generated new LiveKit API secret"
fi

# Check TURN_SECRET
if grep -q "TURN_SECRET=turnpassword123" .env; then
    NEW_TURN_SECRET=$(generate_secret)
    sed -i "s/TURN_SECRET=.*/TURN_SECRET=$NEW_TURN_SECRET/" .env
    echo "✓ Generated new TURN secret"
fi

# Check SQL_SA_PASSWORD
if grep -q "SQL_SA_PASSWORD=YourStrongPassword123!" .env; then
    NEW_SQL_PASSWORD="Chord$(generate_secret | cut -c1-16)!"
    sed -i "s/SQL_SA_PASSWORD=.*/SQL_SA_PASSWORD=$NEW_SQL_PASSWORD/" .env
    echo "✓ Generated new SQL Server password"
fi

# Step 4: Choose deployment mode
echo ""
echo "Choose deployment mode:"
echo "  1) Standalone (with Caddy - recommended for single server)"
echo "  2) Behind proxy (for YunoHost, Traefik, nginx, etc.)"
read -p "Enter choice (1 or 2): " DEPLOY_MODE
DEPLOY_MODE=${DEPLOY_MODE:-1}

# Step 5: Start containers
echo ""
echo "Starting Docker containers..."

if [ "$DEPLOY_MODE" = "1" ]; then
    docker compose -f docker-compose.standalone.yml up -d
    echo ""
    echo "✓ Started in standalone mode with Caddy"
    echo ""
    echo "========================================"
    echo "         Setup Complete!               "
    echo "========================================"
    echo ""
    echo "Access your Chord instance:"
    if [ "$DOMAIN" = "localhost" ]; then
        echo "  API: http://localhost:5000"
        echo "  MinIO Console: http://localhost:9001"
    else
        echo "  API: https://$DOMAIN"
        echo "  MinIO Console: https://$DOMAIN/minio-console"
    fi
else
    docker compose -f docker-compose.prod.yml up -d
    echo ""
    echo "✓ Started in behind-proxy mode"
    echo ""
    echo "========================================"
    echo "         Setup Complete!               "
    echo "========================================"
    echo ""
    echo "Services are running on internal Docker network."
    echo "Configure your reverse proxy to forward to:"
    echo "  API: http://chord-api:80"
    echo "  LiveKit: ws://chord-livekit:7880"
    echo "  MinIO: http://chord-minio:9000"
fi

echo ""
echo "Useful commands:"
echo "  View logs:      docker compose logs -f"
echo "  Stop:           docker compose down"
echo "  Restart:        docker compose restart"
echo ""


