# 视频下载网站

> 输入链接下载 B站 / YouTube / Instagram / Facebook / 抖音 / TikTok 平台的视频

---

## 部署（Ubuntu 20.04+ / Debian 11+）

### 国外服务器

`ash
git clone https://github.com/totolazy/video_download_web.git
cd video_download_web
sudo bash deploy.sh
`

### 国内服务器

**方法A — ghproxy 代理**

`ash
git clone https://ghproxy.com/https://github.com/totolazy/video_download_web.git
cd video_download_web
sudo bash deploy.sh
`

**方法B — 下载 ZIP 上传**

`ash
# 1. 从 GitHub 下载项目 ZIP
# 2. 上传到服务器
scp video_download_web.zip root@你的服务器IP:/opt/
# 3. SSH 解压部署
cd /opt && apt install unzip -y
unzip video_download_web.zip -d video_download_web
cd video_download_web && sudo bash deploy.sh
`

部署过程输入域名和 root 密码（留空自动生成）。Caddy 自动 HTTPS，systemd 自启动+崩溃重启。访问 https://你的域名 即可使用。

查看日志：sudo journalctl -u video-dl -f

---

## 功能

- B站 / YouTube / Instagram / Facebook / 抖音 / TikTok 多平台
- 粘贴链接自动识别平台
- 自选分辨率下载
- 每用户独立上传管理 Cookies
- root 创建账号、禁用、重置密码
- SSE 实时进度条
- 视频 30 分钟自动清理（processing 超 24 小时取消）

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 18 + Vite + TypeScript + shadcn/ui + Tailwind |
| 后端 | Python FastAPI + SQLAlchemy + APScheduler |
| 数据库 | SQLite |
| 下载 | yt-dlp + ffmpeg |
| HTTPS | Caddy |

---

## 本地测试

要求：Python 3.11+ / Node.js 18+ / ffmpeg

Windows 双击 	est_start.bat 一键启动。

手动启动：

`ash
# 后端
cd backend
python -m venv venv
source venv/bin/activate  # venv\Scripts\activate on Windows
pip install -r requirements.txt
pip install yt-dlp
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# 前端
cd ../frontend
npm install
npx vite --host 127.0.0.1 --port 5173
`

浏览器 http://127.0.0.1:5173，默认账号 oot / Admin123!

---

## API

| 端点 | 方法 | 说明 |
|------|------|------|
| /api/auth/login | POST | 登录 |
| /api/auth/me | GET | 个人信息 |
| /api/auth/change-password | POST | 修改密码 |
| /api/videos/detect | POST | URL 识别平台 |
| /api/videos/resolutions | GET | 分辨率列表 |
| /api/downloads | POST | 提交下载 |
| /api/downloads | GET | 下载历史 |
| /api/downloads/{id}/progress | GET | SSE 实时进度 |
| /api/downloads/{id}/file | GET | 下载文件 |
| /api/downloads/{id}/retry | POST | 重试失败 |
| /api/cookies/status | GET | Cookies 状态 |
| /api/cookies/upload | POST | 上传 Cookies |
| /api/cookies/{platform} | DELETE | 删除 Cookies |
| /api/admin/users | GET | 用户列表 (root) |
| /api/admin/users | POST | 创建用户 (root) |
| /api/admin/users/{id} | DELETE | 禁用用户 (root) |
| /api/admin/users/{id}/change-password | POST | 重置密码 (root) |

---

## 清理规则

| 状态 | <30min | 30min~24h | >24h |
|------|--------|-----------|------|
| completed | 保留 | 删除 | 删除 |
| failed | 保留 | 删除 | 删除 |
| pending | 保留 | 删除 | 删除 |
| processing | 保留 | 保留 | 取消+删除 |

---

MIT
