#!/bin/bash
# Video Downloader - One-Click Deploy
# Target: Ubuntu 20.04+ / Debian 11+
# Usage:  sudo bash deploy.sh

set -e

RD="\033[0;31m"; GR="\033[0;32m"; YL="\033[1;33m"; CY="\033[0;36m"; NC="\033[0m"
AD="/opt/video-downloader"; AU="vdl"; SN="video-dl"

echo -e "${CY}==================================================${NC}"
echo -e "${CY}  Video Downloader - Deploy${NC}"
echo -e "${CY}==================================================${NC}"
echo ""
# Clean stale state from previous runs
systemctl stop video-dl 2>/dev/null || true
systemctl stop caddy 2>/dev/null || true
rm -f /etc/apt/sources.list.d/caddy-stable.list

[ "$(id -u)" -ne 0 ] && echo -e "${RD}Run with: sudo bash deploy.sh${NC}" && exit 1

echo -e "${YL}[Config]${NC}"
if [ -n "${DEPLOY_DOMAIN}" ]; then DOMAIN="${DEPLOY_DOMAIN}"; echo "  Domain: ${DOMAIN}"; else read -p "  Domain (e.g. video.example.com): " DOMAIN; fi
[ -z "${DOMAIN}" ] && echo -e "${RD}Domain required${NC}" && exit 1
if [ -n "${DEPLOY_ROOT_PASS}" ]; then RP="${DEPLOY_ROOT_PASS}"; echo "  Root password: ****"; else read -s -p "  Root password (blank = auto-generate): " RP; fi
echo ""
[ -z "${RP}" ] && RP=$(openssl rand -base64 12 | tr -d "=+/") && echo -e "${GR}  Generated: ${RP}${NC}"
JS=$(openssl rand -hex 32)
echo ""; echo -e "Domain: ${GR}${DOMAIN}${NC}  Password: ${GR}${RP}${NC}"
if [ -n "${DEPLOY_CONFIRM}" ]; then CF="${DEPLOY_CONFIRM}"; echo "  Confirm: ${CF}"; else read -p "Confirm? (y/n): " CF; fi; [ "${CF}" != "y" ] && echo "Cancelled" && exit 0

echo ""; echo -e "${YL}[1/8] System deps...${NC}"
apt-get update -qq; apt-get install -y -qq python3 python3-venv python3-pip ffmpeg curl git openssl > /dev/null
command -v node &> /dev/null || (curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1 && apt-get install -y -qq nodejs > /dev/null)
rm -f /etc/apt/sources.list.d/caddy-stable.list 2>/dev/null; command -v caddy &> /dev/null || (apt-get install -y -qq debian-keyring debian-archive-keyring && curl -fsSL "https://dl.cloudsmith.io/public/caddy/stable/gpg.key" -o /tmp/caddy.gpg && gpg --dearmor < /tmp/caddy.gpg > /usr/share/keyrings/caddy-stable-archive-keyring.gpg && rm -f /tmp/caddy.gpg && curl -fsSL "https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt" | tee /etc/apt/sources.list.d/caddy-stable.list && apt-get update -qq > /dev/null && apt-get install -y -qq caddy > /dev/null)
command -v yt-dlp &> /dev/null || pip3 install -q yt-dlp --break-system-packages
echo -e "${GR}  [OK]${NC}"

echo -e "${YL}[2/8] User + dirs...${NC}"
id -u "$AU" > /dev/null 2>&1 || useradd -r -s /bin/false "$AU"
mkdir -p "$AD/data/videos" "$AD/data/cookies" "$AD/logs/backend" "$AD/logs/frontend" "$AD/logs/database"
echo -e "${GR}  [OK]${NC}"

echo -e "${YL}[3/8] Clone code from GitHub...${NC}"
rm -rf "$AD/backend" "$AD/frontend" 2>/dev/null
git clone --depth 1 https://github.com/totolazy/video_download_web.git /tmp/vdl_clone
cp -r /tmp/vdl_clone/backend "$AD/"
cp -r /tmp/vdl_clone/frontend "$AD/"
rm -rf /tmp/vdl_clone
echo 'Code cloned from GitHub'; 
echo -e "${GR}  [OK]${NC}"

echo -e "${YL}[4/8] Python venv...${NC}"
cd "$AD/backend"; python3 -m venv venv
source venv/bin/activate; pip install -q -r requirements.txt; pip install -q --force-reinstall bcrypt==4.0.1; pip install -q yt-dlp --break-system-packages; deactivate
echo -e "${GR}  [OK]${NC}"

echo -e "${YL}[5/8] Frontend build...${NC}"
# Ensure swap for low-memory servers
if [ ! -f /swapfile ]; then fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile; fi
cd "$AD/frontend"; NODE_OPTIONS='--max-old-space-size=256' npm install --prefer-offline --no-audit --no-fund; NODE_OPTIONS=--max-old-space-size=512 npx vite build
echo -e "${GR}  [OK]${NC}"

echo -e "${YL}[6/8] Database init...${NC}"
cd "$AD/backend"; source venv/bin/activate
python3 -c "
import sys,asyncio; sys.path.insert(0,'.')
from app.database import init_db
asyncio.run(init_db())
" > "$AD/logs/database/init.log" 2>&1

python3 << PYPWD
import sys,asyncio; sys.path.insert(0,'.')
from app.database import async_session_factory
from app.models.user import User
from app.core.auth import hash_password
from sqlalchemy import select
async def s():
    async with async_session_factory() as db:
        r = await db.execute(select(User).where(User.is_root == True))
        u = r.scalar_one_or_none()
        if u: u.password_hash = hash_password('$RP'); await db.commit()
asyncio.run(s())
PYPWD
deactivate
echo -e "${GR}  [OK]${NC}"

echo -e "${YL}[7/8] systemd...${NC}"
cat > /etc/systemd/system/${SN}.service << SYS
[Unit]
Description=Video Downloader
After=network.target
[Service]
Type=simple
User=${AU}
Group=${AU}
WorkingDirectory=${AD}/backend
ExecStart=${AD}/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
SYS
chown -R "${AU}:${AU}" "$AD"
systemctl daemon-reload; systemctl enable "${SN}"; systemctl start "${SN}"
echo -e "${GR}  [OK] (auto-restart on boot)${NC}"

echo -e "${YL}[8/8] Caddy HTTPS...${NC}"
cat > /etc/caddy/Caddyfile << CAD
\ {
    reverse_proxy 127.0.0.1:8000
    encode gzip
}
CAD
${DOMAIN} { reverse_proxy 127.0.0.1:8000; encode gzip }
CAD
systemctl reload caddy || systemctl start caddy
echo -e "${GR}  [OK]${NC}"

echo ""
echo -e "${GR}=== Deploy Complete! ===${NC}"
echo -e "URL: ${CY}https://${DOMAIN}${NC}"
echo -e "User: root  Pass: ${GR}${RP}${NC}"
echo -e "Videos auto-deleted after 30min | Restart=always"










