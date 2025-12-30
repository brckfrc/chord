cd ~/chord
cat > generate-configs.sh << 'SCRIPT_END'
#!/bin/bash
# Minimal Config Generator for Chord Production (GitHub Actions)

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

generate_secret() {
    local length=${1:-32}
    LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c $length
}

echo ""
read -p "Domain: " DOMAIN
read -p "Public IP: " PUBLIC_IP
read -p "GitHub username: " GITHUB_USER

# Check existing secrets
if [ -f "$SCRIPT_DIR/backend/.env" ]; then
    read -p "Existing .env found. Preserve secrets? [Y/n]: " preserve
    if [[ ! "$preserve" =~ ^[Nn]$ ]]; then
        SQL_SA_PASSWORD=$(grep "^SQL_SA_PASSWORD=" "$SCRIPT_DIR/backend/.env" 2>/dev/null | cut -d= -f2)
        JWT_SECRET=$(grep "^JWT_SECRET=" "$SCRIPT_DIR/backend/.env" 2>/dev/null | cut -d= -f2)
        LIVEKIT_API_SECRET=$(grep "^LIVEKIT_API_SECRET=" "$SCRIPT_DIR/backend/.env" 2>/dev/null | cut -d= -f2)
        MINIO_ROOT_PASSWORD=$(grep "^MINIO_ROOT_PASSWORD=" "$SCRIPT_DIR/backend/.env" 2>/dev/null | cut -d= -f2)
        TURN_SECRET=$(grep "^TURN_SECRET=" "$SCRIPT_DIR/backend/.env" 2>/dev/null | cut -d= -f2)
    fi
fi

[ -z "$SQL_SA_PASSWORD" ] && SQL_SA_PASSWORD=$(generate_secret 24)
[ -z "$JWT_SECRET" ] && JWT_SECRET=$(generate_secret 64)
[ -z "$LIVEKIT_API_SECRET" ] && LIVEKIT_API_SECRET=$(generate_secret 32)
[ -z "$MINIO_ROOT_PASSWORD" ] && MINIO_ROOT_PASSWORD=$(generate_secret 24)
[ -z "$TURN_SECRET" ] && TURN_SECRET=$(generate_secret 24)

# Backend .env
cat > "$SCRIPT_DIR/backend/.env" << EOF
SQL_SA_PASSWORD=$SQL_SA_PASSWORD
SQL_SERVER_HOST=sqlserver
SQL_SERVER_PORT=1433
DATABASE_NAME=ChordDB

REDIS_CONNECTION=redis:6379

JWT_SECRET=$JWT_SECRET
JWT_ISSUER=ChordAPI
JWT_AUDIENCE=ChordClient
JWT_EXPIRY_MINUTES=60
JWT_REFRESH_TOKEN_EXPIRY_DAYS=7

CORS_ORIGINS=https://$DOMAIN

MINIO_ENDPOINT=minio:9000
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=$MINIO_ROOT_PASSWORD
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=$MINIO_ROOT_PASSWORD
MINIO_BUCKET_NAME=chord-uploads
MINIO_USE_SSL=false

LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=$LIVEKIT_API_SECRET
LIVEKIT_URL=ws://livekit:7880
LIVEKIT_PUBLIC_URL=wss://$DOMAIN/livekit
LIVEKIT_NODE_IP=$PUBLIC_IP

TURN_SECRET=$TURN_SECRET
TURN_REALM=chord.local
TURN_NETWORK_MODE=host
TURN_PORT=3478

DOMAIN=$DOMAIN
REGISTRY=ghcr.io
GITHUB_REPO=$GITHUB_USER/chord
IMAGE_TAG=latest

# Port mappings (empty = no external binding)
SQL_PORT=
REDIS_PORT=
MINIO_API_PORT=
MINIO_CONSOLE_PORT=
LIVEKIT_WS_PORT=7880
LIVEKIT_RTC_PORT=7881
EOF

# Frontend .env
cat > "$SCRIPT_DIR/frontend/.env" << EOF
VITE_API_BASE_URL=https://$DOMAIN/api
VITE_SIGNALR_BASE_URL=https://$DOMAIN
VITE_PORT=5173
EOF

# LiveKit config
cat > "$SCRIPT_DIR/backend/livekit.yaml" << EOF
port: 7880
rtc:
  port_range_start: 7881
  port_range_end: 7881
  use_external_ip: false
  node_ip: $PUBLIC_IP
redis:
  address: redis:6379
turn:
  enabled: true
  domain: $DOMAIN
  tls_port: 5349
  udp_port: 3478
EOF

# Turnserver config
cat > "$SCRIPT_DIR/backend/turnserver.conf" << EOF
listening-port=3478
fingerprint
lt-cred-mech
user=chord:$TURN_SECRET
realm=chord.local
external-ip=$PUBLIC_IP
relay-ip=$PUBLIC_IP
listening-ip=0.0.0.0
no-tcp-relay
no-multicast-peers
EOF

log_info "✓ Configuration files created!"
echo ""
echo "Secrets: (save these!)"
echo "  SQL_SA_PASSWORD=$SQL_SA_PASSWORD"
echo "  JWT_SECRET=$JWT_SECRET"
echo "  MINIO_ROOT_PASSWORD=$MINIO_ROOT_PASSWORD"
echo ""
SCRIPT_END

chmod +x generate-configs.sh
