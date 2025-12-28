#!/bin/bash
# Chord Quick IP Update Script
# Use this when changing networks without full setup
#
# Usage:
#   ./update-ip.sh
#
# This script updates IP-related settings in .env files
# without running the full setup process.

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║     Chord Quick IP Update             ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# Check if .env files exist
if [ ! -f "$SCRIPT_DIR/backend/.env" ]; then
    echo -e "${RED}Error: backend/.env not found${NC}"
    echo "Run ./setup-env.sh first to create configuration files."
    exit 1
fi

# Detect LAN IP
get_lan_ip() {
    if command -v ip &> /dev/null; then
        ip route get 1 2>/dev/null | awk '{print $7; exit}' | head -1
    elif command -v hostname &> /dev/null; then
        hostname -I 2>/dev/null | awk '{print $1}'
    fi
}

LAN_IP=$(get_lan_ip)

# Show current IP
CURRENT_IP=$(grep "^HOST=" "$SCRIPT_DIR/backend/.env" 2>/dev/null | cut -d= -f2)
if [ -n "$CURRENT_IP" ]; then
    echo -e "Current IP: ${BLUE}$CURRENT_IP${NC}"
    echo ""
fi

echo "Select IP configuration:"
echo ""
if [ -n "$LAN_IP" ]; then
    echo "  1) Use $LAN_IP (LAN access enabled)"
else
    echo -e "  1) ${YELLOW}(No LAN IP detected)${NC}"
fi
echo "  2) Use localhost (portable, no LAN access)"
echo "  3) Enter custom IP"
echo ""

read -p "Choice [1]: " choice
choice=${choice:-1}

case $choice in
    1)
        if [ -z "$LAN_IP" ]; then
            echo -e "${RED}No LAN IP detected. Please choose another option.${NC}"
            exit 1
        fi
        NEW_IP="$LAN_IP"
        ;;
    2)
        NEW_IP="localhost"
        ;;
    3)
        read -p "Enter IP: " NEW_IP
        if [ -z "$NEW_IP" ]; then
            echo -e "${RED}No IP entered.${NC}"
            exit 1
        fi
        ;;
    *)
        if [ -n "$LAN_IP" ]; then
            NEW_IP="$LAN_IP"
        else
            echo -e "${RED}Invalid choice.${NC}"
            exit 1
        fi
        ;;
esac

echo ""
echo -e "${GREEN}Updating to: $NEW_IP${NC}"
echo ""

# Update backend .env
if [ -f "$SCRIPT_DIR/backend/.env" ]; then
    # Detect OS for sed compatibility
    if [[ "$OSTYPE" == "darwin"* ]]; then
        SED_CMD="sed -i ''"
    else
        SED_CMD="sed -i"
    fi
    
    $SED_CMD "s|^HOST=.*|HOST=$NEW_IP|" "$SCRIPT_DIR/backend/.env"
    $SED_CMD "s|^LAN_IP=.*|LAN_IP=$NEW_IP|" "$SCRIPT_DIR/backend/.env"
    $SED_CMD "s|^LIVEKIT_NODE_IP=.*|LIVEKIT_NODE_IP=$NEW_IP|" "$SCRIPT_DIR/backend/.env"
    $SED_CMD "s|^LIVEKIT_URL=.*|LIVEKIT_URL=ws://$NEW_IP:7880|" "$SCRIPT_DIR/backend/.env"
    $SED_CMD "s|^CORS_ORIGINS=.*|CORS_ORIGINS=http://localhost:5173,http://$NEW_IP:5173|" "$SCRIPT_DIR/backend/.env"
    $SED_CMD "s|^MINIO_PUBLIC_ENDPOINT=.*|MINIO_PUBLIC_ENDPOINT=http://$NEW_IP:9000|" "$SCRIPT_DIR/backend/.env"
    echo "  ✓ Updated backend/.env"
fi

# Update frontend .env
if [ -f "$SCRIPT_DIR/frontend/.env" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        SED_CMD="sed -i ''"
    else
        SED_CMD="sed -i"
    fi
    
    $SED_CMD "s|^VITE_API_BASE_URL=.*|VITE_API_BASE_URL=http://$NEW_IP:5049/api|" "$SCRIPT_DIR/frontend/.env"
    $SED_CMD "s|^VITE_SIGNALR_BASE_URL=.*|VITE_SIGNALR_BASE_URL=http://$NEW_IP:5049|" "$SCRIPT_DIR/frontend/.env"
    echo "  ✓ Updated frontend/.env"
fi

echo ""
echo -e "${GREEN}Done!${NC}"
echo ""
echo "Access URLs:"
echo "  Local:      http://localhost:5173"
if [ "$NEW_IP" != "localhost" ]; then
    echo "  Network:    http://$NEW_IP:5173"
fi
echo ""
echo "Restart services to apply changes:"
echo "  ./stop.sh && ./start-dev.sh"
echo ""
echo "Or restart apps individually:"
echo "  Backend:  cd backend && dotnet run"
echo "  Frontend: cd frontend && npm run dev"
echo ""


