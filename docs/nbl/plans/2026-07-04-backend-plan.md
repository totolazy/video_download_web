# 后端层实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use nbl.subagent-driven-development (recommended). Steps use checkbox (- [ ]) syntax.

**Goal:** 实现 FastAPI 完整后端：认证、全部 API 路由、下载引擎（6 平台策略）、ffmpeg 合并、错误映射、定时清理、CORS

**Architecture:** 分层架构。core/ 放认证和中间件；routers/ 放 API 路由（薄层）；services/ 放业务逻辑；schemas/ 定义 Pydantic 模型

**Tech Stack:** FastAPI, uvicorn, python-jose (JWT), passlib[bcrypt], aiosqlite + SQLAlchemy 2.0 async, APScheduler, pydantic v2, python-multipart

---

## 文件清单（31 个文件）

| # | 文件 | 职责 |
|---|------|------|
| 1 | backend/requirements.txt | Python 依赖清单 |
| 2 | backend/app/core/auth.py | JWT + bcrypt + 依赖注入 |
| 3 | backend/app/core/middleware.py | CORS 配置 |
| 4 | backend/app/schemas/auth.py | 登录/用户信息 Pydantic |
| 5 | backend/app/schemas/video.py | 检测/分辨率 Pydantic |
| 6 | backend/app/schemas/download.py | 下载任务 Pydantic |
| 7 | backend/app/schemas/cookie.py | Cookies Pydantic |
| 8 | backend/app/schemas/admin.py | 管理后台 Pydantic |
| 9 | backend/app/routers/auth.py | POST /api/auth/login, GET /api/auth/me |
| 10 | backend/app/routers/videos.py | POST /api/videos/detect, GET /api/videos/resolutions |
| 11 | backend/app/routers/downloads.py | 下载 CRUD + SSE 进度 + 文件流 + retry |
| 12 | backend/app/routers/cookies.py | 上传/查看/删除 cookies |
| 13 | backend/app/routers/admin.py | root 专属用户管理 |
| 14 | backend/app/services/platform_detector.py | URL 平台识别 |
| 15 | backend/app/services/downloader.py | 下载调度器 |
| 16 | backend/app/services/merger.py | ffmpeg 合并器 |
| 17 | backend/app/services/error_mapper.py | 错误消息中文映射 |
| 18 | backend/app/services/cleanup.py | 定时清理 |
| 19 | backend/app/services/platforms/__init__.py | 策略注册表 |
| 20 | backend/app/services/platforms/base.py | 抽象基类 DownloadStrategy |
| 21 | backend/app/services/platforms/youtube.py | YouTube 策略 |
| 22 | backend/app/services/platforms/bilibili.py | B站 策略 |
| 23 | backend/app/services/platforms/instagram.py | Instagram 策略 |
| 24 | backend/app/services/platforms/facebook.py | Facebook 策略 |
| 25 | backend/app/services/platforms/douyin.py | 抖音 策略 |
| 26 | backend/app/services/platforms/tiktok.py | TikTok 策略 |
| 27 | backend/app/utils/file_utils.py | 安全路径工具 |
| 28 | backend/app/main.py | FastAPI 入口 |

加上 __init__.py 共 31 个文件

---

## Task 1: requirements.txt

**Dependencies:** None | **Parallelizable:** Yes

依赖：fastapi, uvicorn[standard], sqlalchemy[asyncio], aiosqlite, python-jose[cryptography], passlib[bcrypt], python-multipart, apscheduler, pydantic-settings

---

## Task 2: core/auth.py — 认证模块

**Dependencies:** None | **Parallelizable:** Yes

实现函数：
- hash_password(password) / verify_password(plain, hashed) — bcrypt
- create_access_token(user_id, is_root) — JWT，payload {sub, is_root, exp}，24h过期
- decode_token(token) — JWT 解码，异常返回 None
- get_current_user(Depends) — 解析 HTTPBearer token，查 User 表，返回 User 对象
  - token无效: 401 "登录已过期，请重新登录"
  - 用户禁用(is_active=False): 403 "账号已被禁用"
- require_root(Depends) — 检查 is_root，否则 403 "仅管理员可执行此操作"

---

## Task 3: core/middleware.py — CORS

**Dependencies:** None | **Parallelizable:** Yes

setup_cors(app): CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]

---

## Task 4: Pydantic Schemas（5 个文件）

**Dependencies:** None | **Parallelizable:** Yes

- schemas/auth.py: LoginRequest(username,password), UserInfo(id,username,is_root,note,created_at), LoginResponse(token,user)
- schemas/video.py: DetectRequest(url), DetectResponse(detected,platforms), ResolutionOption(format_id,description), ResolutionsResponse
- schemas/download.py: DownloadCreate(url,platform,resolution?), DownloadResponse(全字段), DownloadListResponse(items,total), ProgressEvent
- schemas/cookie.py: CookieStatusItem(exists,uploaded_at,last_used_at), CookieStatusResponse(cookies:dict[str,CookieStatusItem]), CookieUploadResponse
- schemas/admin.py: UserCreate(username,password,note), UserListItem, UserListResponse, CreateUserResponse

---

## Task 5: utils/file_utils.py

**Dependencies:** None | **Parallelizable:** Yes

- safe_path(base_dir, *segments): resolve后检查前缀，防目录穿越
- get_file_info(path): 返回 {size, name}

---

## Task 6: services/platform_detector.py

**Dependencies:** None | **Parallelizable:** Yes

- PLATFORM_RULES: [(domains, platform)] 6平台域名映射
- detect_platform(url): urllib.parse hostname 匹配，返回平台名或 None

---

## Task 7: services/error_mapper.py

**Dependencies:** None | **Parallelizable:** Yes

- ERROR_RULES: 18条 (pattern, 中文提示) 映射
- map_error(stderr, exit_code): 遍历规则，返回中文提示

---

## Task 8: 6 平台下载策略（7 个文件）

**Dependencies:** None | **Parallelizable:** Yes

- platforms/__init__.py: get_strategy(platform) 注册表
- platforms/base.py: DownloadStrategy 抽象类
  - build_args(url,cookies,resolution,output_dir) abstract -> list[str]
  - parse_progress(line) -> float|None 默认解析 [download] xx.x%
  - needs_merge(info) -> bool 默认 False
  - get_format_string(resolution) -> str 默认 "best"
- platforms/youtube.py: -f "bestvideo[height<=?1080]+bestaudio/best", needs_merge=True
- platforms/bilibili.py: -f "bestvideo+bestaudio/best" 带分辨率支持
- platforms/instagram.py: -f "best" 基础策略
- platforms/facebook.py: 带分辨率支持的通用策略
- platforms/douyin.py: -f "best" 基础策略
- platforms/tiktok.py: -f "best" 基础策略

所有策略共同参数：--cookies, -o output/%(title)s.%(ext)s, --merge-output-format mp4, --no-playlist, --extractor-retries 3, --retries 3, --no-warnings, --print 输出title/ext/filesize

---

## Task 9: services/merger.py

**Dependencies:** None | **Parallelizable:** Yes

merge_audio_video(video_path, audio_path, output_path): ffmpeg -i video -i audio -c:v copy -c:a aac -y output，成功删原文件，失败保留

---

## Task 10: services/downloader.py — 核心下载引擎

**Dependencies:** Task 7, 8, 9 | **Parallelizable:** No

- create_download_task(db,user_id,url,platform,resolution,cookies_path): 创建Download记录，asyncio.create_task启动后台下载，返回download_id
- _run_download: 独立AsyncSession，获取策略构建参数，asyncio.create_subprocess_exec启动yt-dlp，实时解析stdout进度更新DB，检查returncode，成功找输出文件更新completed，失败map_error更新failed
- get_download_progress(db,download_id): 简单查询DB返回进度dict

---

## Task 11: services/cleanup.py

**Dependencies:** None | **Parallelizable:** Yes

cleanup_expired_videos(): 遍历VIDEOS_DIR，超过60分钟目录rmtree删除

---

## Task 12: routers/auth.py

**Dependencies:** Task 2, 4 | **Parallelizable:** No

- POST /api/auth/login: 查User，verify_password，返回 {token, user:UserInfo}
- GET /api/auth/me: 返回当前用户信息

---

## Task 13: routers/videos.py

**Dependencies:** Task 4, 6 | **Parallelizable:** No

- POST /api/videos/detect: 调用detect_platform
- GET /api/videos/resolutions: 校验cookies -> yt-dlp -F -> 解析分辨率列表 -> 去重返回

---

## Task 14: routers/downloads.py

**Dependencies:** Task 4, 10 | **Parallelizable:** No

- POST /api/downloads: 校验cookies -> create_download_task -> {download_id}
- GET /api/downloads: 分页列表（按created_at DESC），仅当前用户
- GET /api/downloads/{id}: 单条详情
- GET /api/downloads/{id}/progress: SSE StreamingResponse，0.5s轮询DB推送
- GET /api/downloads/{id}/file: FileResponse 触发浏览器下载
- POST /api/downloads/{id}/retry: 仅failed可重试，创建新download_id

---

## Task 15: routers/cookies.py

**Dependencies:** Task 4 | **Parallelizable:** Yes

- GET /api/cookies/status: 6平台状态汇总
- POST /api/cookies/upload: multipart(platform+file)，保存到 data/cookies/{uid}/{platform}/cookies.txt，db upsert
- DELETE /api/cookies/{platform}: 删文件+记录

---

## Task 16: routers/admin.py

**Dependencies:** Task 2, 4 | **Parallelizable:** Yes

- GET /api/admin/users (require_root): 全用户列表
- POST /api/admin/users (require_root): 创建用户，用户名重复409
- DELETE /api/admin/users/{id} (require_root): 软删除is_active=false，root不可删

---

## Task 17: app/main.py — 入口

**Dependencies:** Task 12-16 | **Parallelizable:** No

- lifespan: 启动init_db() + APScheduler(interval=CLEANUP_INTERVAL_MINUTES)，关闭scheduler.shutdown()
- app = FastAPI(title="视频下载网站", lifespan=lifespan)
- setup_cors(app)
- include_router 5个路由
- 如果 frontend/dist 存在则 mount StaticFiles

---

## 前后端接口对齐表

| 路由 | 前端组件 | 请求 | 响应 |
|------|----------|------|------|
| POST /api/auth/login | LoginPage | {username,password} | {token,user} |
| GET /api/auth/me | AuthContext | — | {id,username,is_root,...} |
| POST /api/videos/detect | UrlInput | {url} | {detected,platforms} |
| GET /api/videos/resolutions | ResolutionSelect | ?platform=&url= | {resolutions:[{format_id,desc}]} |
| POST /api/downloads | DownloadCard | {url,platform,resolution} | {download_id} |
| GET /api/downloads | HistoryTable | ?page=&page_size= | {items,total} |
| GET /api/downloads/{id} | HistoryRow | — | DownloadResponse |
| GET /api/downloads/{id}/progress | ProgressBar(SSE) | — | SSE流 |
| GET /api/downloads/{id}/file | ProgressBar(下载) | — | 文件流 |
| POST /api/downloads/{id}/retry | HistoryRow | — | {download_id} |
| GET /api/cookies/status | CookiesStatus | — | {cookies:{platform:{...}}} |
| POST /api/cookies/upload | CookiesStatus | multipart | {platform,message} |
| DELETE /api/cookies/{platform} | CookiesPage | — | {message} |
| GET /api/admin/users | UserTable | — | {users,total} |
| POST /api/admin/users | CreateUserDialog | {username,password,note} | {id,username,message} |
| DELETE /api/admin/users/{id} | UserTable | — | {message} |

---

**Execution Mode:** serial
