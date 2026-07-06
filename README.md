<div align="center">
  <h1>🎬 视频下载网站</h1>
  <p><strong>Video Downloader</strong> — 多平台视频下载，自建专属服务</p>

  <p>
    <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=fff" alt="React 18" />
    <img src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=fff" alt="Vite 8" />
    <img src="https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript&logoColor=fff" alt="TypeScript 6.0" />
    <img src="https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=fff" alt="FastAPI" />
    <img src="https://img.shields.io/badge/SQLAlchemy-2.0-D71F00?logo=sqlalchemy&logoColor=fff" alt="SQLAlchemy 2.0" />
    <img src="https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=fff" alt="Python 3.11+" />
    <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT" />
  </p>
</div>

---

## 📖 目录

- [功能特性](#-功能特性)
- [技术架构](#-技术架构)
- [数据库设计](#-数据库设计)
- [API 一览](#-api-一览)
- [一键部署](#-一键部署)
- [本地开发](#-本地开发)
- [项目结构](#-项目结构)
- [清理规则](#-清理规则)

---

## ✨ 功能特性

### 多平台视频下载

支持六个主流视频平台，粘贴链接自动识别，无需手动选择：

| 平台 | 识别方式 |
|------|----------|
| Bilibili | URL 自动识别 |
| YouTube | URL 自动识别 |
| Instagram | URL 自动识别 |
| Facebook | URL 自动识别 |
| 抖音 | URL 自动识别 |
| TikTok | URL 自动识别 |

### 完整下载流程

1. **粘贴链接** → 自动识别平台
2. **选择画质** → 获取可用分辨率列表
3. **服务端下载** → yt-dlp 子进程异步下载，SSE 实时推送进度
4. **音视频合并** → ffmpeg 自动合并为 MP4
5. **下载到本地** → 浏览器直接下载文件

### Cookies 管理

部分平台需要登录凭证才能下载高清视频。本系统支持**每用户、每平台独立上传 Cookies**，互不干扰：

- 支持手动导出平台 Cookies 为 `.txt` 文件（Netscape 格式）
- 上传前可查看各平台 Cookies 状态
- 随时上传、覆盖、删除

### 用户与权限

| 角色 | 权限 |
|------|------|
| **root** | 创建用户、修改用户密码、查看所有用户 |
| **普通用户** | 下载视频、管理自己的 Cookies、查看下载历史、修改自己的密码 |

初始 root 账号由部署脚本设置。

### 下载历史

- 所有下载任务记录在案：链接、平台、分辨率、状态、进度、文件大小
- 支持重试失败任务
- 已完成视频可直接下载/再次下载

### 自动清理

- 视频文件服务端只保留 **30 分钟**，超时自动删除
- 卡住的处理中任务超 **24 小时**自动标记为失败
- 后台定时任务（每 15 分钟），无需人工干预

---

## 🏗️ 技术架构

```
┌──────────────────────────────────────────────────────┐
│                     Browser                          │
│          React 18 + Vite + TypeScript                │
│    shadcn/ui · TanStack Query · React Router v6      │
└──────────────────┬───────────────────────────────────┘
                   │  HTTPS / REST + SSE
                   ▼
┌──────────────────────────────────────────────────────┐
│                    Caddy (HTTPS)                     │
└──────────────────┬───────────────────────────────────┘
                   │  reverse proxy
                   ▼
┌──────────────────────────────────────────────────────┐
│              FastAPI (Python 3.11+)                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │  Auth    │  │  Videos  │  │    Downloads      │  │
│  │  (JWT)   │  │  (yt-dlp)│  │  (history + SSE)  │  │
│  ├──────────┤  ├──────────┤  ├───────────────────┤  │
│  │  Admin   │  │  Cookies │  │  Cleanup          │  │
│  │(user mgt)│  │(per-user)│  │(APScheduler)      │  │
│  └──────────┘  └──────────┘  └───────────────────┘  │
└──────────────────┬───────────────────────────────────┘
                   │  async
                   ▼
┌──────────────────────────────────────────────────────┐
│           SQLite (aiosqlite + SQLAlchemy 2.0)        │
│           ┌────────┬──────────┬────────────┐        │
│           │ users  │ cookies  │ downloads  │        │
│           └────────┴──────────┴────────────┘        │
└──────────────────────────────────────────────────────┘
```

### 后端技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| Web 框架 | **FastAPI** 0.115 | 异步高性能，自动 OpenAPI 文档 |
| ORM | **SQLAlchemy** 2.0 (async) | 异步模型操作 |
| 数据库 | **SQLite** + **aiosqlite** | 嵌入式数据库，无需额外服务 |
| 认证 | **JWT** (python-jose + bcrypt) | 无状态 Token 认证 |
| 定时任务 | **APScheduler** | 视频自动清理 |
| 下载引擎 | **yt-dlp** (子进程) | 多平台视频下载 |
| 音视频合并 | **ffmpeg** | 自动合并为 MP4 |
| HTTPS | **Caddy** | 自动申请/续签 Let's Encrypt 证书 |
| 部署 | **systemd** | 进程守护 + 崩溃自动重启 |

### 前端技术栈

| 组件 | 技术 |
|------|------|
| 框架 | React 19 |
| 构建工具 | Vite 8 |
| 语言 | TypeScript 6.0 |
| UI 组件库 | shadcn/ui (Radix UI + TailwindCSS 4) |
| 服务端状态 | TanStack Query v5 |
| 应用状态 | React Context |
| 路由 | React Router v7 |
| HTTP 客户端 | axios |
| 图标 | lucide-react |
| Toast 通知 | sonner |

---

## 🗄️ 数据库设计

### users 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 用户 ID |
| `username` | VARCHAR(100) UNIQUE | 用户名 |
| `password_hash` | VARCHAR(255) | bcrypt 哈希密码 |
| `note` | VARCHAR(500) | 备注 |
| `is_root` | BOOLEAN | 是否 root 用户 |
| `is_active` | BOOLEAN | 是否启用 |
| `created_at` | DATETIME | 创建时间 |

### cookies 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 主键 |
| `user_id` | INTEGER FK → users.id | 所属用户 |
| `platform` | VARCHAR(50) | 平台名 |
| `file_path` | VARCHAR(500) | 文件路径 |
| `uploaded_at` | DATETIME | 上传时间 |
| `last_used_at` | DATETIME | 最近使用时间 |

> 联合唯一约束: `(user_id, platform)` — 每个用户每个平台只有一份 Cookies

### downloads 表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 下载任务 ID |
| `user_id` | INTEGER FK → users.id | 所属用户 |
| `url` | TEXT | 原始链接 |
| `platform` | VARCHAR(50) | 平台 |
| `resolution` | VARCHAR(50) | 分辨率 |
| `status` | VARCHAR(20) | pending / processing / completed / failed |
| `progress` | INTEGER | 进度百分比 0-100 |
| `file_path` | VARCHAR(500) | 服务端文件路径 |
| `file_name` | VARCHAR(500) | 文件名 |
| `file_size` | INTEGER | 文件大小 (bytes) |
| `error_message` | TEXT | 错误信息 |
| `created_at` | DATETIME | 创建时间 |
| `completed_at` | DATETIME | 完成时间 |

---

## 📡 API 一览

### 认证 `/api/auth`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 登录 |
| GET | `/api/auth/me` | 获取当前用户信息 |
| POST | `/api/auth/change-password` | 修改密码 |

### 视频 `/api/videos`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/videos/detect` | 识别视频链接平台 |
| GET | `/api/videos/resolutions` | 获取可用分辨率 |

### 下载 `/api/downloads`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/downloads` | 提交下载任务 |
| GET | `/api/downloads` | 获取下载历史 |
| GET | `/api/downloads/{id}/progress` | SSE 实时进度 |
| GET | `/api/downloads/{id}/file` | 下载视频文件 |
| POST | `/api/downloads/{id}/retry` | 重试失败任务 |

### Cookies `/api/cookies`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/cookies/status` | 查看各平台 Cookies 状态 |
| POST | `/api/cookies/upload` | 上传 Cookies 文件 |
| DELETE | `/api/cookies/{platform}` | 删除指定平台 Cookies |

### 管理 `/api/admin` — 仅 root

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/users` | 用户列表 |
| POST | `/api/admin/users` | 创建用户 |
| DELETE | `/api/admin/users/{id}` | 禁用用户 |
| POST | `/api/admin/users/{id}/change-password` | 重置用户密码 |

---

## 🚀 一键部署

> 适用于 **Ubuntu 20.04+** / **Debian 11+**

**一键命令（推荐）：**

```bash
curl -fsSL https://raw.githubusercontent.com/totolazy/video_download_web/main/deploy.sh -o deploy.sh && sudo bash deploy.sh
```

仅需这一条命令，下载 `deploy.sh` 并运行，脚本会自动完成剩余所有步骤（安装依赖、克隆项目、构建、配置 HTTPS 等）。

### 国外服务器

```bash
git clone https://github.com/totolazy/video_download_web.git
cd video_download_web
sudo bash deploy.sh
```

### 国内服务器

**方法 A — ghproxy 代理**

```bash
git clone https://ghproxy.com/https://github.com/totolazy/video_download_web.git
cd video_download_web
sudo bash deploy.sh
```

**方法 B — 下载 ZIP 上传**

```bash
# 1. 从 GitHub 下载项目 ZIP 上传到服务器
scp video_download_web.zip root@你的服务器IP:/opt/
# 2. SSH 解压并部署
cd /opt && apt install unzip -y
unzip video_download_web.zip -d video_download_web
cd video_download_web && sudo bash deploy.sh
```

### 部署过程

脚本会依次询问并完成以下步骤：

| 步骤 | 操作 |
|:----:|------|
| 询问 | **域名**（例如 `video.example.com`） |
| 询问 | **root 密码**（留空则自动生成随机密码） |
| 1/8 | 安装系统依赖 (Python, Node.js, ffmpeg, yt-dlp) |
| 2/8 | 创建专用用户与数据目录 |
| 3/8 | 克隆/复制项目代码 |
| 4/8 | 创建 Python 虚拟环境并安装依赖 |
| 5/8 | 构建前端 |
| 6/8 | 初始化数据库 + 设置 root 密码 |
| 7/8 | 配置 systemd 服务 (自启动 + 崩溃重启) |
| 8/8 | 配置 Caddy 自动 HTTPS |

部署完成后访问 `https://你的域名` 即可使用。

```bash
# 查看服务日志
sudo journalctl -u video-dl -f
```

### 环境变量

部署脚本支持以下环境变量实现非交互式部署：

| 变量 | 说明 |
|------|------|
| `DEPLOY_DOMAIN` | 域名 |
| `DEPLOY_ROOT_PASS` | root 密码 |
| `DEPLOY_CONFIRM` | 设为 `y` 跳过确认 |

---

## 💻 本地开发

### 环境要求

- **Python** 3.11+
- **Node.js** 18+
- **ffmpeg** (加入 PATH)

### 启动

```bash
# 1. 后端
cd backend
python -m venv venv
source venv/bin/activate  # venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 2. 前端 (新终端)
cd ../frontend
npm install
npx vite --port 5173
```

浏览器打开 `http://127.0.0.1:5173`，默认账号 `root` / `Admin123!`。

---

## 📁 项目结构

```
.
├── deploy.sh                     # 一键部署脚本
├── backend/                      # 后端 (FastAPI)
│   ├── requirements.txt
│   └── app/
│       ├── main.py               # 应用入口 + 生命周期
│       ├── config.py             # 全局配置
│       ├── database.py           # 异步引擎 + Session
│       ├── core/
│       │   ├── auth.py           # JWT + 密码哈希
│       │   └── middleware.py      # CORS
│       ├── models/
│       │   ├── user.py           # 用户模型
│       │   ├── cookie.py         # Cookies 模型
│       │   └── download.py       # 下载记录模型
│       ├── schemas/              # Pydantic 请求/响应模型
│       ├── routers/              # API 路由
│       │   ├── auth.py           # 认证相关
│       │   ├── videos.py         # 视频探测
│       │   ├── downloads.py      # 下载管理
│       │   ├── cookies.py        # Cookies 管理
│       │   └── admin.py          # 管理接口 (root)
│       ├── services/
│       │   ├── downloader.py     # yt-dlp 下载服务
│       │   ├── merger.py         # ffmpeg 合并
│       │   ├── cleanup.py        # 定时清理
│       │   ├── platform_detector.py  # URL 平台识别
│       │   ├── error_mapper.py   # 错误码映射
│       │   └── platforms/        # 各平台下载配置
│       │       ├── bilibili.py
│       │       ├── youtube.py
│       │       ├── instagram.py
│       │       ├── facebook.py
│       │       ├── douyin.py
│       │       └── tiktok.py
│       └── utils/
│           └── file_utils.py
├── frontend/                     # 前端 (React)
│   └── src/
│       ├── App.tsx               # 路由配置
│       ├── api/                  # API 层 (axios)
│       │   ├── client.ts         # axios 实例 (JWT 拦截)
│       │   ├── auth.ts
│       │   ├── videos.ts
│       │   ├── downloads.ts
│       │   ├── cookies.ts
│       │   └── admin.ts
│       ├── contexts/
│       │   └── AuthContext.tsx    # 认证状态管理
│       ├── hooks/                # 自定义 Hooks
│       ├── components/
│       │   ├── layout/           # 布局组件 (Sidebar, AppLayout)
│       │   ├── download/         # 下载相关组件
│       │   ├── history/          # 历史记录组件
│       │   ├── admin/            # 管理面板组件
│       │   └── ui/               # shadcn/ui 基础组件
│       ├── pages/
│       │   ├── HomePage.tsx      # 首页 - 下载
│       │   ├── HistoryPage.tsx   # 下载历史
│       │   ├── CookiesPage.tsx   # Cookies 管理
│       │   ├── AdminPage.tsx     # 管理面板 (root)
│       │   └── LoginPage.tsx     # 登录
│       └── lib/                  # 工具函数 & 常量
└── data/                         # 运行时数据 (自动生成)
    ├── app.db                    # SQLite 数据库
    ├── videos/                   # 视频文件
    └── cookies/                  # Cookies 文件
```

---

## 🧹 清理规则

| 状态 \ 时长 | < 30 分钟 | 30 分钟 ~ 24 小时 | > 24 小时 |
|:-----------:|:---------:|:-----------------:|:---------:|
| **completed** | 保留 | 删除 | 删除 |
| **failed** | 保留 | 删除 | 删除 |
| **pending** | 保留 | 删除 | 删除 |
| **processing** | 保留 | 保留 | 取消 + 删除 |

---

## 📄 License

[MIT](LICENSE)
