# 视频下载网站

> 一个多平台视频下载网站，输入链接即可下载 B站、YouTube、Instagram、Facebook、抖音、TikTok 等平台的视频。

---

## 功能

- **多平台支持**：B站、YouTube、Instagram、Facebook、抖音、TikTok
- **自动识别**：粘贴链接自动识别视频平台
- **分辨率选择**：支持自选分辨率，自动适配最佳质量
- **Cookies 管理**：每个用户独立上传/管理各平台 cookies
- **用户体系**：root 管理员创建账号，支持禁用/重置密码
- **实时进度**：下载进度条 + SSE 实时推送
- **自动清理**：已完成的视频 30 分钟后自动删除（processing 超过 24 小时自动取消）

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 18 + Vite + TypeScript + shadcn/ui + TailwindCSS |
| 后端 | Python FastAPI + SQLAlchemy + APScheduler |
| 数据库 | SQLite (aiosqlite) |
| 下载引擎 | yt-dlp + ffmpeg |
| 反向代理 | Caddy (自动 Let's Encrypt HTTPS) |

## 目录结构

`
backend/          FastAPI 后端
  app/
    core/         JWT认证、CORS中间件
    models/       SQLAlchemy 模型 (User/Cookie/Download)
    schemas/      Pydantic 请求/响应模型
    routers/      API 路由 (auth/videos/downloads/cookies/admin)
    services/     业务逻辑 (下载引擎/平台策略/清理器)
frontend/         React 前端
  src/
    api/          axios API 封装
    components/   UI 组件 (download/history/admin/layout)
    hooks/        自定义 Hooks (useAuth/useDownload/useCookies)
    pages/        页面 (Login/Home/History/Cookies/Admin)
data/             运行时数据 (自动生成，已 gitignore)
logs/             日志文件
deploy.sh         一键部署脚本
docs/TEST.md      测试文档
`

## 本地测试

要求：Python 3.11+、Node.js 18+、ffmpeg

`ash
# 安装后端依赖
cd backend
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
pip install yt-dlp

# 启动后端
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# 安装前端依赖
cd ../frontend
npm install

# 启动前端
npx vite --host 127.0.0.1 --port 5173
`

或直接双击 	est_start.bat (Windows) 一键启动。

浏览器打开 http://127.0.0.1:5173，默认账号 
oot / Admin123!。

---

## 一键部署

### 国外服务器 (访问 GitHub 正常)

`ash
git clone https://github.com/totolazy/video_download_web.git
cd video_download_web
sudo bash deploy.sh
`

### 国内服务器 (GitHub 访问受限)

**方法 A — 使用代理克隆**
`ash
git clone https://ghproxy.com/https://github.com/totolazy/video_download_web.git
cd video_download_web
sudo bash deploy.sh
`

**方法 B — 手动上传**
1. 将项目文件夹打包为 ideo_download_web.zip
2. scp video_download_web.zip root@你的服务器IP:/opt/
3. SSH 到服务器：
`ash
cd /opt
apt install unzip -y
unzip video_download_web.zip -d video_download_web
cd video_download_web
sudo bash deploy.sh
`

部署过程中输入域名和 root 管理员密码（留空自动生成）。

部署完成后：
- Caddy 自动申请 Let's Encrypt HTTPS 证书
- systemd 配置自动重启 + 开机自启
- 访问 https://你的域名 即可使用
- 日志：sudo journalctl -u video-dl -f

---

## API 接口

| 端点 | 方法 | 认证 | 说明 |
|------|------|------|------|
| /api/auth/login | POST | - | 登录 |
| /api/auth/me | GET | JWT | 个人信息 |
| /api/auth/change-password | POST | JWT | 修改密码 |
| /api/videos/detect | POST | JWT | URL 平台识别 |
| /api/videos/resolutions | GET | JWT | 获取分辨率列表 |
| /api/downloads | POST | JWT | 提交下载任务 |
| /api/downloads | GET | JWT | 下载历史 |
| /api/downloads/{id}/progress | GET | - | SSE 实时进度 |
| /api/downloads/{id}/file | GET | - | 下载视频文件 |
| /api/downloads/{id}/retry | POST | JWT | 重试失败任务 |
| /api/cookies/status | GET | JWT | cookies 状态 |
| /api/cookies/upload | POST | JWT | 上传 cookies |
| /api/cookies/{platform} | DELETE | JWT | 删除 cookies |
| /api/admin/users | GET | JWT+root | 用户列表 |
| /api/admin/users | POST | JWT+root | 创建用户 |
| /api/admin/users/{id} | DELETE | JWT+root | 禁用用户 |
| /api/admin/users/{id}/change-password | POST | JWT+root | 重置密码 |

---

## 清理规则

| 状态 | < 30 分钟 | 30 分钟 ~ 24 小时 | > 24 小时 |
|------|-----------|-------------------|-----------|
| completed | 保留 | 删除文件 | 删除文件 |
| failed | 保留 | 删除文件 | 删除文件 |
| pending | 保留 | 删除文件 | 删除文件 |
| processing | 保留 | 保留 | 取消 + 删除 |

---

## License

MIT
