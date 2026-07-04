<!--
  ============================================================================
  设计文档：视频下载网站
  创建时间：2026-07-04
  ============================================================================
-->

# 视频下载网站 — 设计文档

## 1. 概述

一个多平台视频下载网站，用户登录后粘贴视频链接，自动识别平台，选择分辨率，利用 yt-dlp 下载视频到服务器，再从服务器下载到用户本地。

- **支持平台**：B站 (bilibili)、YouTube、Instagram、Facebook、抖音 (douyin)、TikTok
- **用户体系**：只有一个 root 用户（部署时创建），root 可在后台创建/查看/删除普通用户；不支持自主注册
- **Cookies**：每个用户自己上传各平台 cookies，按用户+平台隔离存储，不可共享
- **部署**：轻量公网服务器，Caddy 自动 HTTPS，一键部署脚本

### 技术栈

| 层 | 技术 |
|---|------|
| 前端 | React 18 + Vite + TypeScript + shadcn/ui + Tailwind CSS |
| 后端 | Python 3.11+ + FastAPI + SQLAlchemy + APScheduler |
| 数据库 | SQLite (aiosqlite) |
| 下载引擎 | yt-dlp + ffmpeg |
| 反向代理 | Caddy (自动 Let's Encrypt HTTPS) |
| 认证 | JWT (python-jose + passlib[bcrypt]) |
| 部署 | `deploy.sh` 交互式一键脚本 |

---

## 2. 项目目录结构

```
视频下载网站/
├── frontend/                        # React + Vite 前端
│   ├── public/
│   │   └── favicon.ico
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                  # shadcn/ui 基础组件 (button, input, select, dialog, etc.)
│   │   │   ├── layout/
│   │   │   │   ├── AppLayout.tsx        # 整体布局：侧边栏 + 顶栏 + Outlet
│   │   │   │   ├── Sidebar.tsx          # 侧边导航
│   │   │   │   └── ProtectedRoute.tsx   # 路由守卫：未登录跳 /login
│   │   │   ├── download/
│   │   │   │   ├── UrlInput.tsx         # 视频链接输入 + 检测按钮
│   │   │   │   ├── PlatformSelect.tsx   # 平台选择器（自动识别 + 手动切换）
│   │   │   │   ├── ResolutionSelect.tsx # 分辨率选择器
│   │   │   │   ├── CookiesStatus.tsx    # Cookies 状态展示 + 上传
│   │   │   │   ├── ProgressBar.tsx      # 下载进度条 0-100%
│   │   │   │   └── DownloadCard.tsx     # 下载卡片（组装以上组件）
│   │   │   ├── history/
│   │   │   │   ├── HistoryTable.tsx     # 下载历史表格
│   │   │   │   └── HistoryRow.tsx       # 单条历史记录行
│   │   │   └── admin/
│   │   │       ├── UserTable.tsx        # 用户列表表格
│   │   │       └── CreateUserDialog.tsx # 创建用户弹窗
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx            # 登录页
│   │   │   ├── HomePage.tsx             # 首页/下载页
│   │   │   ├── HistoryPage.tsx          # 下载历史页
│   │   │   ├── CookiesPage.tsx          # Cookies 管理页
│   │   │   └── AdminPage.tsx            # 用户管理页（仅 root）
│   │   ├── hooks/
│   │   │   ├── useAuth.ts              # 认证 hook：login, logout, user, isRoot
│   │   │   ├── useDownload.ts          # 下载 hook：detect, submit, SSE progress
│   │   │   └── useCookies.ts           # cookies CRUD + 上传
│   │   ├── api/
│   │   │   ├── client.ts               # axios 实例：baseURL, JWT 拦截器, 错误处理
│   │   │   ├── auth.ts                 # 登录 API
│   │   │   ├── videos.ts               # 检测 URL、获取分辨率 API
│   │   │   ├── downloads.ts            # 下载任务 CRUD API
│   │   │   ├── cookies.ts              # Cookies 管理 API
│   │   │   └── admin.ts               # 用户管理 API（root 专属）
│   │   ├── lib/
│   │   │   ├── utils.ts                # 工具函数：formatFileSize, formatDate, etc.
│   │   │   └── constants.ts            # 常量：平台列表、支持的分辨率选项
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx         # 认证上下文 Provider
│   │   ├── App.tsx                     # 路由定义
│   │   ├── main.tsx                    # 入口
│   │   └── index.css                   # Tailwind + 全局样式
│   ├── components.json                 # shadcn/ui 配置
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── vite.config.ts                  # proxy /api → 后端
│   └── index.html
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                     # FastAPI 应用入口，注册路由、中间件、事件
│   │   ├── config.py                   # 配置：数据库路径、视频目录、JWT secret 等
│   │   ├── database.py                 # SQLAlchemy engine + session 工厂 + 初始化
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                 # JWT 生成/验证、密码哈希、get_current_user 依赖
│   │   │   └── middleware.py           # CORS 中间件配置
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user.py                 # User 模型
│   │   │   ├── cookie.py               # Cookie 模型
│   │   │   └── download.py             # Download 模型
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                 # LoginRequest, LoginResponse, UserInfo
│   │   │   ├── video.py                # DetectRequest, DetectResponse, ResolutionOption
│   │   │   ├── download.py             # DownloadCreate, DownloadResponse, DownloadList
│   │   │   ├── cookie.py               # CookieStatus, CookieUploadResponse
│   │   │   └── admin.py               # UserCreate, UserListResponse, UserDelete
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                 # /api/auth/*
│   │   │   ├── videos.py               # /api/videos/* (detect, resolutions)
│   │   │   ├── downloads.py            # /api/downloads/* (CRUD + progress SSE + file)
│   │   │   ├── cookies.py              # /api/cookies/*
│   │   │   └── admin.py               # /api/admin/* (root only)
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── downloader.py           # 下载调度器：任务创建、进度回调、完成处理
│   │   │   ├── platform_detector.py    # URL → platform 识别
│   │   │   ├── platforms/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── base.py             # 抽象基类 DownloadStrategy
│   │   │   │   ├── youtube.py          # YouTube 策略（最复杂：格式选择 + ffmpeg 合并）
│   │   │   │   ├── bilibili.py         # B站 策略
│   │   │   │   ├── instagram.py        # Instagram 策略
│   │   │   │   ├── facebook.py         # Facebook 策略
│   │   │   │   ├── douyin.py           # 抖音 策略
│   │   │   │   └── tiktok.py           # TikTok 策略
│   │   │   ├── merger.py               # ffmpeg 合并器
│   │   │   ├── cleanup.py              # APScheduler 定时清理任务
│   │   │   └── error_mapper.py         # yt-dlp 错误 → 中文友好提示
│   │   └── utils/
│   │       ├── __init__.py
│   │       └── file_utils.py           # 文件工具：安全路径拼接、大小计算
│   ├── requirements.txt
│   └── main.py                         # 启动入口（仅用于 uvicorn 命令行，实际入口在 app/main.py）
├── data/                               # 运行时数据（已被 .gitignore）
│   ├── cookies/                        # 按 user_id/platform/ 存放 cookies.txt
│   ├── videos/                         # 临时视频文件
│   └── app.db                          # SQLite 数据库
├── deploy.sh                           # 一键部署脚本
├── .gitignore
└── README.md
```

---

## 3. 数据库设计

### 3.1 users 表

```sql
CREATE TABLE users (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    username     TEXT    NOT NULL UNIQUE,
    password_hash TEXT   NOT NULL,           -- bcrypt hash
    note         TEXT    DEFAULT '',         -- 备注（root 创建时填写）
    is_root      BOOLEAN DEFAULT FALSE,
    is_active    BOOLEAN DEFAULT TRUE,       -- 软删除标记
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3.2 cookies 表

```sql
CREATE TABLE cookies (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER  NOT NULL REFERENCES users(id),
    platform      TEXT     NOT NULL,         -- youtube/bilibili/instagram/facebook/douyin/tiktok
    file_path     TEXT     NOT NULL,         -- 服务器上文件路径
    uploaded_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at  DATETIME                  -- 最后一次使用时间
);

-- 同一用户对同一平台只有一份 cookies（上传覆盖旧文件）
CREATE UNIQUE INDEX idx_user_platform ON cookies(user_id, platform);
```

### 3.3 downloads 表

```sql
CREATE TABLE downloads (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER  NOT NULL REFERENCES users(id),
    url            TEXT     NOT NULL,        -- 原始视频链接
    platform       TEXT     NOT NULL,        -- 平台标识
    resolution     TEXT,                     -- 用户选择的分辨率，如 "1080p"
    status         TEXT     DEFAULT 'pending', -- pending/processing/completed/failed
    progress       INTEGER  DEFAULT 0,       -- 0-100
    file_path      TEXT,                     -- 服务器上视频文件路径
    file_name      TEXT,                     -- 视频文件名
    file_size      INTEGER,                  -- 文件大小(字节)
    error_message  TEXT,                     -- 友好的错误描述
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at   DATETIME
);
```

---

## 4. 后端设计（FastAPI）

### 4.1 配置 `app/config.py`

```python
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATA_DIR: Path = Path("data")
    VIDEOS_DIR: Path = DATA_DIR / "videos"
    COOKIES_DIR: Path = DATA_DIR / "cookies"
    DB_PATH: Path = DATA_DIR / "app.db"
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_HOURS: int = 24
    VIDEO_RETENTION_MINUTES: int = 60     # 视频清理周期
    CLEANUP_INTERVAL_MINUTES: int = 60     # 清理任务执行间隔
```

### 4.2 应用入口 `app/main.py`

- 创建 FastAPI app
- 注册所有 router（前缀 `/api`）
- 配置 CORS
- 注册生命周期事件：启动时创建目录 + 初始化数据库 + 启动 APScheduler
- 静态文件服务：非 `/api` 路径 fallback 到前端构建产物

### 4.3 认证 `app/core/auth.py`

- `create_access_token(user_id, is_root)` → JWT string
- `hash_password(password)` / `verify_password(plain, hashed)` → bcrypt
- `get_current_user(Depends)` → 从 Authorization header 解析 JWT，返回 User 对象
- `require_root(Depends)` → 校验 is_root，否则 403

### 4.4 API 路由详细设计

#### 4.4.1 `routers/auth.py`

| 方法 | 路径 | 功能 | 请求体 | 响应 |
|------|------|------|--------|------|
| POST | `/api/auth/login` | 登录 | `{username, password}` | `{token, user: {id, username, is_root}}` |
| GET | `/api/auth/me` | 当前用户信息 | — | `{id, username, is_root, note, created_at}` |

认证失败返回 401 `{"detail": "用户名或密码错误"}`。
用户被禁用（is_active=false）返回 403。

#### 4.4.2 `routers/videos.py`

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/api/videos/detect` | 传入 `{url}` → 返回识别平台 + 所有可选平台列表 |
| GET | `/api/videos/resolutions` | 传入 `?platform=&url=` → 用 yt-dlp --list-formats 获取可选分辨率列表 |

**detect 逻辑**：`platform_detector.py` 对 URL hostname 做匹配：

| 规则 | 平台 |
|------|------|
| `youtube.com`, `youtu.be` | youtube |
| `bilibili.com`, `b23.tv` | bilibili |
| `instagram.com` | instagram |
| `facebook.com`, `fb.watch` | facebook |
| `douyin.com`, `iesdouyin.com` | douyin |
| `tiktok.com` | tiktok |

**resolutions 逻辑**：调用 `yt-dlp --cookies <path> -F <url>`，解析输出，提取 `format_id` + 分辨率描述，过滤无效项，返回列表。

#### 4.4.3 `routers/downloads.py`

| 方法 | 路径 | 功能 |
|------|------|------|
| POST | `/api/downloads` | 提交下载任务 |
| GET | `/api/downloads` | 下载历史列表（按时间倒序，分页） |
| GET | `/api/downloads/{id}` | 下载详情 |
| GET | `/api/downloads/{id}/progress` | **SSE** 实时进度推送 |
| GET | `/api/downloads/{id}/file` | 文件下载 → StreamingResponse + Content-Disposition |
| POST | `/api/downloads/{id}/retry` | 重试失败任务 |

**POST `/api/downloads` 请求体**：
```json
{
  "url": "https://...",
  "platform": "youtube",
  "resolution": "1080p"
}
```
后端流程：
1. 校验该用户对 platform 是否有 cookies → 无则返回 400 "请先上传该平台的 cookies"
2. 创建 Download 记录（status=pending）
3. 通过 BackgroundTasks 启动 yt-dlp 子进程
4. 立即返回 download_id 给前端

**SSE `GET /api/downloads/{id}/progress`**：
```
data: {"progress": 45, "status": "processing"}
data: {"progress": 100, "status": "completed", "file_name": "xxx.mp4", "file_size": 12345678}
```
前端通过 EventSource 订阅，完成后自动断开。

每次 SSE 请求时，后端检查当前 db 中的 progress 并推送初始值，然后进入轮询（0.5s 间隔查 db），状态变为 completed/failed 时推送最终状态并关闭连接。

#### 4.4.4 `routers/cookies.py`

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/cookies/status` | 返回各平台 cookies 状态 |
| POST | `/api/cookies/upload` | 上传 cookies 文件 |
| DELETE | `/api/cookies/{platform}` | 删除某平台 cookies |

**POST upload**：multipart/form-data，字段 `platform` + 文件 `file`。后保存到 `data/cookies/{user_id}/{platform}/cookies.txt`，创建/更新 cookies 表记录。

**GET status 响应**：
```json
{
  "cookies": {
    "youtube":   {"exists": true,  "uploaded_at": "2026-07-01T10:00:00"},
    "bilibili":  {"exists": true,  "uploaded_at": "2026-07-02T08:30:00"},
    "instagram": {"exists": false, "uploaded_at": null},
    ...
  }
}
```

#### 4.4.5 `routers/admin.py`（root only）

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/admin/users` | 用户列表（id, username, note, is_active, created_at） |
| POST | `/api/admin/users` | 创建用户 `{username, password, note}` |
| DELETE | `/api/admin/users/{id}` | 禁用用户（软删除，is_active=false）。不可删除 root |

### 4.5 下载引擎 `services/downloader.py`

```python
class DownloadTask:
    async def run(self, download_id: int, url: str, platform: str,
                  resolution: str, cookies_path: str, output_dir: Path):
        # 1. 获取平台策略
        strategy = get_strategy(platform)   # → youtube.py / bilibili.py / ...

        # 2. 构建 yt-dlp 参数
        args = strategy.build_args(url, cookies_path, resolution, output_dir)

        # 3. 启动子进程
        process = await asyncio.create_subprocess_exec(
            "yt-dlp", *args,
            stdout=PIPE, stderr=PIPE
        )

        # 4. 实时读取 stdout，解析 yt-dlp 的进度输出
        #    计算 0-100% progress，更新 DB，SSE 轮询自然会读到

        # 5. 等待完成 → 检查是否需要 ffmpeg 合并
        #    strategy.needs_merge() → merger.merge()

        # 6. 更新 DB status=completed, file_path, file_name, file_size
```

### 4.6 平台策略 `services/platforms/base.py`

```python
class DownloadStrategy(ABC):
    @abstractmethod
    def build_args(self, url: str, cookies: str, resolution: str, out_dir: str) -> list:
        """构建 yt-dlp 命令行参数"""

    @abstractmethod
    def parse_progress(self, line: str) -> float | None:
        """从 yt-dlp 输出行解析进度百分比，返回 None 表示非进度行"""

    @abstractmethod
    def needs_merge(self, info: dict) -> bool:
        """下载完成后是否需要 ffmpeg 合并"""

    def get_format_string(self, resolution: str) -> str:
        """分辨率 → yt-dlp -f 格式字符串，平台可覆盖"""
```

**YouTube 策略特殊处理**：
- `build_args()` 使用 `-f "bestvideo[height<=?1080]+bestaudio/best"` 格式字符串
- 下载完成后检测到是分离的音频+视频，自动调用 ffmpeg 合并
- 进度解析需处理 "Downloading" + "[download]" 行

**其他平台**：使用 `-f "best"` 或者 `-f "bv*[height<=?{height}]+ba/b"` 等通用参数，大部分不需要合并。

### 4.7 错误映射 `services/error_mapper.py`

常见 yt-dlp 错误码/输出 → 中文提示：

| 特征 | 中文提示 |
|------|----------|
| "HTTP Error 403" | "访问被拒绝，可能视频需要登录或已失效" |
| "Video unavailable" | "视频不可用，可能已被删除或设为私密" |
| "This video is private" | "该视频为私密视频，无法下载" |
| "cookies" / "Sign in" / "age" | "Cookies 已过期或无效，请重新上传" |
| "Requested format is not available" | "所选分辨率不可用，请尝试其他分辨率" |
| "ffmpeg not found" | "服务器未安装 ffmpeg，请联系管理员" |
| 超时 | "下载超时，请检查网络或稍后重试" |
| 其他 | "下载失败，请稍后重试" |

### 4.8 清理任务 `services/cleanup.py`

APScheduler `AsyncIOScheduler`，每 60 分钟执行：
1. 扫描 `data/videos/` 下所有文件
2. 文件修改时间超过 60 分钟 → 删除文件
3. 对应 downloads 记录中 status=completed 的，更新 file_path 为 NULL，标记文件已过期

---

## 5. 前端设计（React + Vite）

### 5.1 路由结构

```typescript
// App.tsx
<Routes>
  <Route path="/login" element={<LoginPage />} />
  <Route element={<ProtectedRoute />}>
    <Route element={<AppLayout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="/cookies" element={<CookiesPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Route>
  </Route>
  <Route path="*" element={<Navigate to="/" />} />
</Routes>
```

### 5.2 组件树

```
App
├── LoginPage
│   └── 登录表单（username + password → POST /api/auth/login）
└── ProtectedRoute (检查 token，无效则 redirect /login)
    └── AppLayout
        ├── Sidebar (导航链接：下载、历史、Cookies、管理)
        └── <Outlet>
            ├── HomePage
            │   └── DownloadCard
            │       ├── UrlInput       → POST /api/videos/detect
            │       ├── PlatformSelect → 下拉选平台，默认使用检测结果
            │       ├── CookiesStatus  → GET /api/cookies/status → 无则显示上传按钮
            │       ├── ResolutionSelect → GET /api/videos/resolutions
            │       ├── [开始下载]     → POST /api/downloads → SSE /progress
            │       └── ProgressBar    → EventSource 实时更新
            ├── HistoryPage
            │   └── HistoryTable       → GET /api/downloads
            │       └── HistoryRow     → [查看详情] [下载文件] [重试]
            ├── CookiesPage
            │   └── 各平台卡片         → GET /api/cookies/status + POST upload
            └── AdminPage (isRoot 才渲染)
                ├── UserTable          → GET /api/admin/users
                └── CreateUserDialog   → POST /api/admin/users
```

### 5.3 关键交互流程

**下载流程**：
```
1. 用户粘贴 URL → 点击"检测"
2. POST /api/videos/detect → 返回 {detected: "youtube", platforms: [...]}
3. 前端设置 platform = detected，用户可按需改为手动选择
4. 前端检查该平台 cookies 状态：
   - 无 cookies → 显示上传区域，用户上传后进入下一步
   - 有 cookies → 显示"已上传 (日期)"
5. GET /api/videos/resolutions?platform=youtube&url=... → 返回分辨率列表
6. 用户选择分辨率 → 点击"开始下载"
7. POST /api/downloads {url, platform, resolution} → 返回 {download_id}
8. new EventSource(`/api/downloads/${download_id}/progress`)
   → 实时更新 ProgressBar
9. 完成后 → 进度条 100%，显示 [下载到本地] 按钮
10. 点击下载 → GET /api/downloads/{id}/file → 浏览器触发下载
```

**错误流程**：
```
下载失败 → SSE 推送 {status: "failed", error_message: "Cookies 已过期..."}
→ 前端显示错误提示 + [重试] [清除Cookies并重新上传] 按钮
```

### 5.4 状态管理

| 状态类型 | 管理方式 |
|----------|----------|
| 认证状态 (user, token, isRoot) | React Context (AuthContext) |
| 服务端数据 (下载历史、cookies 状态) | React Query (TanStack Query) |
| 下载进度 (实时) | EventSource → useState |
| UI 状态 (弹窗开关等) | useState |

### 5.5 API 客户端 `api/client.ts`

```typescript
import axios from "axios";

const client = axios.create({ baseURL: "/api" });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);
```

### 5.6 开发代理

`vite.config.ts` 配置 proxy：
```typescript
server: {
  proxy: {
    "/api": "http://127.0.0.1:8000"
  }
}
```

---

## 6. 部署脚本 `deploy.sh`

交互式一键部署，运行在 Ubuntu/Debian 服务器上。

**执行流程**：
1. 询问 root 密码（留空则自动生成强密码并输出）
2. 询问服务器域名（用于 Caddy HTTPS）
3. 安装系统依赖：`python3`, `python3-venv`, `python3-pip`, `ffmpeg`, `nodejs`, `npm`, `caddy`
4. 安装 yt-dlp：通过 pip 或直接下载二进制
5. 创建 Python 虚拟环境，安装 requirements.txt
6. 安装前端依赖，构建前端
7. 初始化数据库（创建 root 用户）
8. 配置 systemd 服务（FastAPI uvicorn）
9. 配置 Caddyfile（反向代理 + 自动 HTTPS）
10. 启动服务
11. 输出访问地址和 root 密码

---

## 7. 安全与约束

- JWT token 24 小时过期
- 所有密码 bcrypt 哈希，root 也看不到明文
- Cookies 文件按 `user_id/platform/` 隔离，API 层禁止跨用户访问
- Caddy 自动处理 HTTPS
- root 用户不可被删除，不可被禁用
- 下载请求校验用户必须有对应平台 cookies
- 文件路径使用 `pathlib` 防目录穿越
- 视频文件 60 分钟自动清理

---

## 8. 开发与测试

- **本地测试**：`python -m venv venv` 创建虚拟环境，激活后 `pip install -r requirements.txt`
- 前端 `npm run dev` → Vite dev server (port 5173) → proxy API 到后端
- 后端 `uvicorn app.main:app --reload` → FastAPI (port 8000)
- 无需 Docker，直接本地跑两个进程即可
