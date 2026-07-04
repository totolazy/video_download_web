# 视频下载网站 — 测试文档

> **测试环境**：Windows 10/11，Python 3.11+，Node.js 18+
> **所有测试在虚拟环境中进行，不污染系统环境**

---

## 一、项目结构总览

### backend/ — FastAPI 后端（34个文件）
| 文件 | 路径 | 职责 |
|------|------|------|
| main.py | app/main.py | FastAPI 入口：注册路由、APScheduler定时清理、静态文件fallback |
| config.py | app/config.py | 全局配置：路径、JWT密钥、平台列表、清理周期 |
| database.py | app/database.py | SQLAlchemy async引擎+session工厂+自动建表+root初始化 |
| auth.py | app/core/auth.py | JWT令牌+bcrypt密码+认证/root权限依赖注入 |
| middleware.py | app/core/middleware.py | CORS跨域中间件配置 |
| user.py | app/models/user.py | 用户表(id,username,password_hash,note,is_root,is_active) |
| cookie.py | app/models/cookie.py | Cookies表(user_id,platform,file_path) |
| download.py | app/models/download.py | 下载表(url,platform,status,progress,file_path) |
| auth.py | app/schemas/auth.py | LoginRequest/Response, ChangePasswordRequest, UserInfo |
| video.py | app/schemas/video.py | DetectRequest/Response, ResolutionOption/Response |
| download.py | app/schemas/download.py | DownloadCreate/Response/ListResponse |
| cookie.py | app/schemas/cookie.py | CookieStatusItem/Response, CookieUploadResponse |
| admin.py | app/schemas/admin.py | UserCreate, UserListItem/Response, CreateUserResponse |
| auth.py | app/routers/auth.py | POST login, GET me, POST change-password |
| videos.py | app/routers/videos.py | POST detect(URL识别), GET resolutions(yt-dlp -F) |
| downloads.py | app/routers/downloads.py | 下载CRUD+SSE进度+文件流+重试 |
| cookies.py | app/routers/cookies.py | 上传/查看/删除cookies |
| admin.py | app/routers/admin.py | root专属:用户列表/创建/禁用/重置密码 |
| downloader.py | app/services/downloader.py | 核心:创建任务→asyncio子进程→yt-dlp→进度更新DB |
| merger.py | app/services/merger.py | ffmpeg音视频合并兜底 |
| platform_detector.py | app/services/platform_detector.py | URL hostname匹配→6平台识别 |
| error_mapper.py | app/services/error_mapper.py | 18条yt-dlp错误→中文友好提示 |
| cleanup.py | app/services/cleanup.py | APScheduler每60分钟清理过期视频 |
| base.py | app/services/platforms/base.py | DownloadStrategy抽象基类 |
| youtube.py | app/services/platforms/youtube.py | YouTube策略(分离下载+合并) |
| bilibili.py | app/services/platforms/bilibili.py | B站策略 |
| instagram.py | app/services/platforms/instagram.py | Instagram策略 |
| facebook.py | app/services/platforms/facebook.py | Facebook策略 |
| douyin.py | app/services/platforms/douyin.py | 抖音策略 |
| tiktok.py | app/services/platforms/tiktok.py | TikTok策略 |
| file_utils.py | app/utils/file_utils.py | 安全路径拼接(防目录穿越) |
| requirements.txt | requirements.txt | Python依赖(含bcrypt==4.0.1) |

### frontend/ — React+Vite前端（39个文件）
| 文件 | 路径 | 职责 |
|------|------|------|
| main.tsx | src/main.tsx | React入口 |
| App.tsx | src/App.tsx | 路由:5页面+保护路由+QueryClientProvider |
| index.css | src/index.css | TailwindCSS全局样式 |
| client.ts | src/api/client.ts | axios实例(baseURL=/api)+JWT自动附加+401跳转登录 |
| auth.ts | src/api/auth.ts | login(),getMe() |
| videos.ts | src/api/videos.ts | detect(),getResolutions() |
| downloads.ts | src/api/downloads.ts | submit(),list(),getOne(),retry() |
| cookies.ts | src/api/cookies.ts | getStatus(),upload(),remove() |
| admin.ts | src/api/admin.ts | listUsers(),createUser(),deleteUser(),resetPassword() |
| AuthContext.tsx | src/contexts/AuthContext.tsx | 认证Provider:user,token,login,logout,isRoot |
| useAuth.ts | src/hooks/useAuth.ts | 认证hook封装 |
| useDownload.ts | src/hooks/useDownload.ts | 下载hook:提交+历史+SSE进度(EventSource) |
| useCookies.ts | src/hooks/useCookies.ts | Cookies hook |
| utils.ts | src/lib/utils.ts | formatFileSize,formatDate |
| constants.ts | src/lib/constants.ts | PLATFORMS常量 |
| AppLayout.tsx | src/components/layout/AppLayout.tsx | Sidebar+Outlet布局 |
| Sidebar.tsx | src/components/layout/Sidebar.tsx | 导航栏+改密码+退出登录 |
| ProtectedRoute.tsx | src/components/layout/ProtectedRoute.tsx | 未登录→/login |
| ChangePasswordDialog.tsx | src/components/layout/ChangePasswordDialog.tsx | 修改密码弹窗(需原密码) |
| DownloadCard.tsx | src/components/download/DownloadCard.tsx | 下载主卡片(状态机:idle→ready→downloading) |
| UrlInput.tsx | src/components/download/UrlInput.tsx | URL输入+检测 |
| PlatformSelect.tsx | src/components/download/PlatformSelect.tsx | 平台选择器 |
| ResolutionSelect.tsx | src/components/download/ResolutionSelect.tsx | 分辨率选择(由父组件传入resolutions) |
| CookiesStatus.tsx | src/components/download/CookiesStatus.tsx | Cookies状态+上传(含onUploaded回调) |
| ProgressBar.tsx | src/components/download/ProgressBar.tsx | SSE进度条+完成下载+失败重试 |
| HistoryTable.tsx | src/components/history/HistoryTable.tsx | 下载历史表格(分页) |
| UserTable.tsx | src/components/admin/UserTable.tsx | 用户列表(含重置密码按钮) |
| CreateUserDialog.tsx | src/components/admin/CreateUserDialog.tsx | 创建用户弹窗 |
| LoginPage.tsx | src/pages/LoginPage.tsx | 登录页 |
| HomePage.tsx | src/pages/HomePage.tsx | 首页/下载页 |
| HistoryPage.tsx | src/pages/HistoryPage.tsx | 下载历史页 |
| CookiesPage.tsx | src/pages/CookiesPage.tsx | Cookies管理页(6平台卡片) |
| AdminPage.tsx | src/pages/AdminPage.tsx | 用户管理页(仅root) |
| package.json | package.json | npm依赖 |
| vite.config.ts | vite.config.ts | Vite配置(proxy /api→127.0.0.1:8000) |

### 根目录文件
| 文件 | 职责 |
|------|------|
| deploy.sh | Ubuntu/Debian服务器一键部署(Caddy+systemd) |
| test_start.bat | Windows本地一键启动(装依赖→初始化DB→启动前后端) |
| test_cleanup.bat | 清理虚拟环境、node_modules、数据、日志 |
| .gitignore | 排除data/ venv/ node_modules/ logs/ |
| docs/TEST.md | 本文档 |


---

## 二、开发环境准备

- Python 3.11+
- Node.js 18+
- ffmpeg

创建虚拟环境:
`
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
pip install yt-dlp
`
前端:
`
cd frontend
npm install
`

---

## 三、一键测试

双击 test_start.bat 自动完成依赖安装、数据库初始化、前后端启动。

日志位置:
- 后端: logs/backend/server.log
- 前端: logs/frontend/server.log
- 数据库: logs/database/init.log

---

## 四、手动启动

终端1: cd backend && venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

终端2: cd frontend && npx vite --host 127.0.0.1 --port 5173

浏览器: http://127.0.0.1:5173

---

## 五、功能测试清单

### 登录
- [/] root / Admin123! 登录成功
- [/] 错误密码显示提示
- [/] root侧边栏钥匙改密码
- [/] 新密码可登录

### 用户管理(仅root)
- [/] 创建用户(用户名/密码/备注)
- [/] 同名校验
- [/] 重置密码
- [/] 禁用用户
- [/] root不可禁用

### Cookies
- [/] 6平台状态显示
- [/] 上传/替换/删除

### URL检测
- [/] YouTube/B站自动识别
- [/] 手动切换平台

### 下载(需cookies+网络)
- [/] 粘贴链接检测
- [/] 上传cookies
- [/] 点击下载
- [/] SSE进度实时更新
- [/] 完成下载到本地
- [/] 失败重试

### 历史
- [/] 列表显示
- [/] 下载按钮
- [/] 重试按钮
- [/] 分页

---

## 六、API接口

| 端点 | 方法 | 认证 | 用途 |
|------|------|------|------|
| /api/auth/login | POST | - | 登录 |
| /api/auth/me | GET | JWT | 个人信息 |
| /api/auth/change-password | POST | JWT | 改密码 |
| /api/videos/detect | POST | JWT | URL识别 |
| /api/videos/resolutions | GET | JWT | 分辨率 |
| /api/downloads | POST | JWT | 提交下载 |
| /api/downloads | GET | JWT | 历史列表 |
| /api/downloads/{id}/progress | GET | - | SSE进度 |
| /api/downloads/{id}/file | GET | - | 下载文件 |
| /api/downloads/{id}/retry | POST | JWT | 重试 |
| /api/cookies/status | GET | JWT | cookies状态 |
| /api/cookies/upload | POST | JWT | 上传cookies |
| /api/cookies/{platform} | DELETE | JWT | 删除cookies |
| /api/admin/users | GET | JWT+root | 用户列表 |
| /api/admin/users | POST | JWT+root | 创建用户 |
| /api/admin/users/{id} | DELETE | JWT+root | 禁用用户 |
| /api/admin/users/{id}/change-password | POST | JWT+root | 重置密码 |

---

## 七、常见问题

**登录失败**: 检查 bcrypt==4.0.1
**URL检测失败**: 检查后端是否运行(netstat -ano | findstr 8000)
**分辨率超时**: yt-dlp需访问境外网站，需代理/VPN
**下载失败**: 检查cookies是否有效，查看logs/backend/server.log
**前端空白**: F5刷新

---

## 八、清理

双击 test_cleanup.bat

---

## 九、deploy.sh

Ubuntu/Debian服务器一键部署脚本。
用法: sudo bash deploy.sh
功能: 交互式输入域名+密码，自动安装所有依赖+Caddy HTTPS+systemd
