#!/bin/bash
# ============================================================================
#  ?????? - ??????
#  ??: Ubuntu 20.04+ / Debian 11+
#  ??: ???? ? ?? venv ? ??? DB ? ???? ? Caddy HTTPS ? systemd
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

APP_DIR="/opt/video-downloader"
APP_USER="vdl"
SERVICE_NAME="video-dl"

echo -e "${CYAN}==================================================${NC}"
echo -e "${CYAN}  ?????? - ????${NC}"
echo -e "${CYAN}==================================================${NC}"
echo ""

# ==================== 1. ?? root ?? ====================
if [ "$(id -u)" -ne 0 ]; then
    echo -e "${RED}[??] ??? root ????: sudo bash deploy.sh${NC}"
    exit 1
fi

# ==================== 2. ?????? ====================
echo -e "${YELLOW}[??] ?????????:${NC}"
echo ""

read -p "  ?? (? video.example.com): " DOMAIN
if [ -z "$DOMAIN" ]; then
    echo -e "${RED}[??] ??????${NC}"
    exit 1
fi

read -s -p "  root ????? (?????????): " ROOT_PASSWORD
echo ""
if [ -z "$ROOT_PASSWORD" ]; then
    ROOT_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/")
    echo -e "${GREEN}  ???????: ${ROOT_PASSWORD}${NC}"
fi

# ?? JWT secret
JWT_SECRET=$(openssl rand -hex 32)

echo ""
echo -e "${CYAN}----------------------------------------${NC}"
echo -e "  ??:     ${GREEN}${DOMAIN}${NC}"
echo -e "  ????: ${APP_DIR}"
echo -e "  ????: ${APP_USER}"
echo -e "  root ??: ${GREEN}${ROOT_PASSWORD}${NC}"
echo -e "${CYAN}----------------------------------------${NC}"
echo ""

read -p "??????? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ]; then
    echo "????"
    exit 0
fi

echo ""
echo -e "${YELLOW}[1/8] ??????...${NC}"

# ==================== 3. ?????? ====================
apt-get update -qq

# ??????
apt-get install -y -qq python3 python3-venv python3-pip ffmpeg curl git openssl > /dev/null

# ?? Node.js (NodeSource)
if ! command -v node &> /dev/null; then
    echo "  ?? Node.js 20.x..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
    apt-get install -y -qq nodejs > /dev/null
fi

# ?? Caddy
if ! command -v caddy &> /dev/null; then
    echo "  ?? Caddy..."
    apt-get install -y -qq debian-keyring debian-archive-keyring > /dev/null
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
    apt-get update -qq > /dev/null
    apt-get install -y -qq caddy > /dev/null
fi

# ?? yt-dlp (?? pip ??????????)
if ! command -v yt-dlp &> /dev/null; then
    echo "  ?? yt-dlp..."
    pip3 install -q yt-dlp
fi

echo -e "${GREEN}  [OK] ????????${NC}"

# ==================== 4. ??????? ====================
echo -e "${YELLOW}[2/8] ?????????...${NC}"

if ! id -u "$APP_USER" > /dev/null 2>&1; then
    useradd -r -s /bin/false "$APP_USER"
fi

mkdir -p "$APP_DIR"
mkdir -p "$APP_DIR/data/videos"
mkdir -p "$APP_DIR/data/cookies"

echo -e "${GREEN}  [OK] ??????${NC}"

# ==================== 5. ???? ====================
echo -e "${YELLOW}[3/8] ??????...${NC}"

# ???????????? deploy.sh ???????
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp -r "$SCRIPT_DIR/backend" "$APP_DIR/"
cp -r "$SCRIPT_DIR/frontend" "$APP_DIR/"
cp "$SCRIPT_DIR/requirements.txt" "$APP_DIR/backend/" 2>/dev/null || true

echo -e "${GREEN}  [OK] ?????${NC}"

# ==================== 6. Python ???? ====================
echo -e "${YELLOW}[4/8] ?? Python ????...${NC}"

cd "$APP_DIR/backend"
python3 -m venv venv
source venv/bin/activate
pip install -q -r requirements.txt
pip install -q yt-dlp
deactivate

echo -e "${GREEN}  [OK] Python ??????${NC}"

# ==================== 7. ???? ====================
echo -e "${YELLOW}[5/8] ????...${NC}"

cd "$APP_DIR/frontend"
npm install --silent
npm run build

echo -e "${GREEN}  [OK] ??????${NC}"

# ==================== 8. ?????? ====================
echo -e "${YELLOW}[6/8] ??????? root ??...${NC}"

cd "$APP_DIR/backend"
# ???????????
source venv/bin/activate
python3 -c "
import sys; sys.path.insert(0, '.')
from app.database import init_db
import asyncio
asyncio.run(init_db())
"
# ??????????? root ??
python3 -c "
import sys; sys.path.insert(0, '.')
import asyncio
from app.database import async_session_factory
from app.models.user import User
from app.core.auth import hash_password
from sqlalchemy import select

async def set_root_password():
    async with async_session_factory() as db:
        result = await db.execute(select(User).where(User.is_root == True))
        root = result.scalar_one_or_none()
        if root:
            root.password_hash = hash_password('$ROOT_PASSWORD')
            await db.commit()
            print('root ?????')
        else:
            # ?? root ??????
            root = User(username='root', password_hash=hash_password('$ROOT_PASSWORD'), note='?????', is_root=True)
            db.add(root)
            await db.commit()
            print('root ?????')

asyncio.run(set_root_password())
"
deactivate

echo -e "${GREEN}  [OK] ????????${NC}"

# ==================== 9. ???? ====================
echo -e "${YELLOW}[7/8] ??????...${NC}"

cat > "$APP_DIR/.env" << EOF
JWT_SECRET=$JWT_SECRET
EOF

echo -e "${GREEN}  [OK] ???????${NC}"

# ==================== 10. systemd ?? ====================
echo -e "${YELLOW}[8/8] ?? systemd ??...${NC}"

cat > "/etc/systemd/system/${SERVICE_NAME}.service" << EOF
[Unit]
Description=??????????
After=network.target

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${APP_DIR}/backend
EnvironmentFile=${APP_DIR}/.env
ExecStart=${APP_DIR}/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# ????
chown -R "${APP_USER}:${APP_USER}" "$APP_DIR"

# ????
systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
systemctl start "${SERVICE_NAME}"

echo -e "${GREEN}  [OK] systemd ?????${NC}"

# ==================== 11. Caddy ?? ====================
echo ""
echo -e "${YELLOW}?? Caddy HTTPS ????...${NC}"

cat > "/etc/caddy/Caddyfile" << EOF
${DOMAIN} {
    reverse_proxy 127.0.0.1:8000
    encode gzip
}
EOF

systemctl reload caddy

echo -e "${GREEN}  [OK] Caddy ????${NC}"

# ==================== 12. ???? ====================
echo ""
echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}  ?????${NC}"
echo -e "${GREEN}==================================================${NC}"
echo ""
echo -e "  ????:   ${CYAN}https://${DOMAIN}${NC}"
echo -e "  API ??:   ${CYAN}https://${DOMAIN}/docs${NC}"
echo ""
echo -e "  root ??:  root"
echo -e "  root ??:  ${GREEN}${ROOT_PASSWORD}${NC}"
echo ""
echo -e "  ${YELLOW}??????????${NC}"
echo ""
echo -e "  ????:"
echo -e "    ??: sudo systemctl status ${SERVICE_NAME}"
echo -e "    ??: sudo systemctl restart ${SERVICE_NAME}"
echo -e "    ??: sudo journalctl -u ${SERVICE_NAME} -f"
echo -e "    Caddy: sudo systemctl reload caddy"
echo ""
echo -e "  ????: ${APP_DIR}"
echo -e "=================================================="