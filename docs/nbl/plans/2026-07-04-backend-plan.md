# 后端层实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use nbl.subagent-driven-development (recommended). Steps use checkbox (- [ ]) syntax.

**Goal:** 实现 FastAPI 完整后端：认证、全部 API 路由、下载引擎（6 平台策略）、ffmpeg 合并、错误映射、定时清理、CORS

**Architecture:** 分层架构。core/ 放认证和中间件；routers/ 放 API 路由（薄层）；services/ 放业务逻辑；schemas/ 定义 Pydantic 模型。models/ 和 config.py、database.py 由数据库计划实现

**Tech Stack:** FastAPI, uvicorn, python-jose (JWT), passlib[bcrypt], aiosqlite + SQLAlchemy 2.0 async, APScheduler, pydantic v2, python-multipart

---

## 文件清单（34 个文件）

| # | 文件 | 职责 |
|---|------|------|
| 1 | backend/requirements.txt | Python 依赖清单 |
| 2 | backend/app/__init__.py | 空文件（包标记） |
| 3 | backend/app/core/__init__.py | 空文件（包标记） |
| 4 | backend/app/core/auth.py | JWT + bcrypt + 依赖注入 |
| 5 | backend/app/core/middleware.py | CORS 配置 |
| 6 | backend/app/schemas/__init__.py | 空文件（包标记） |
| 7 | backend/app/schemas/auth.py | 登录/用户信息 Pydantic |
| 8 | backend/app/schemas/video.py | 检测/分辨率 Pydantic |
| 9 | backend/app/schemas/download.py | 下载任务 Pydantic |
| 10 | backend/app/schemas/cookie.py | Cookies Pydantic |
| 11 | backend/app/schemas/admin.py | 管理后台 Pydantic |
| 12 | backend/app/routers/__init__.py | 空文件（包标记） |
| 13 | backend/app/routers/auth.py | POST /api/auth/login, GET /api/auth/me |
| 14 | backend/app/routers/videos.py | POST /api/videos/detect, GET /api/videos/resolutions |
| 15 | backend/app/routers/downloads.py | 下载 CRUD + SSE 进度 + 文件流 + retry |
| 16 | backend/app/routers/cookies.py | 上传/查看/删除 cookies |
| 17 | backend/app/routers/admin.py | root 专属用户管理 |
| 18 | backend/app/services/__init__.py | 空文件（包标记） |
| 19 | backend/app/services/platform_detector.py | URL 平台识别 |
| 20 | backend/app/services/downloader.py | 下载调度器 |
| 21 | backend/app/services/merger.py | ffmpeg 合并器 |
| 22 | backend/app/services/error_mapper.py | 错误消息中文映射 |
| 23 | backend/app/services/cleanup.py | 定时清理 |
| 24 | backend/app/services/platforms/__init__.py | 策略注册表 |
| 25 | backend/app/services/platforms/base.py | 抽象基类 DownloadStrategy |
| 26 | backend/app/services/platforms/youtube.py | YouTube 策略（最复杂） |
| 27 | backend/app/services/platforms/bilibili.py | B站 策略 |
| 28 | backend/app/services/platforms/instagram.py | Instagram 策略 |
| 29 | backend/app/services/platforms/facebook.py | Facebook 策略 |
| 30 | backend/app/services/platforms/douyin.py | 抖音 策略 |
| 31 | backend/app/services/platforms/tiktok.py | TikTok 策略 |
| 32 | backend/app/utils/__init__.py | 空文件（包标记） |
| 33 | backend/app/utils/file_utils.py | 安全路径工具 |
| 34 | backend/app/main.py | FastAPI 入口 |

**注意：** config.py、database.py 和 models/ 三个文件由数据库计划实现，后端计划不重复创建。

---

## Task 1: 依赖清单 + 空包文件

**Dependencies:** None | **Parallelizable:** Yes

创建 backend/requirements.txt：
fastapi==0.115.0
uvicorn[standard]==0.30.6
sqlalchemy[asyncio]==2.0.35
aiosqlite==0.20.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.12
apscheduler==3.10.4
pydantic-settings==2.5.2

同时创建所有 __init__.py 空文件（backend/app/, core/, schemas/, routers/, services/, utils/）

git commit -m "feat: add requirements and package init files"

---

## Task 2: core/auth.py — 认证模块

**Dependencies:** Task 1 | **Parallelizable:** No

实现函数：
- hash_password(password) / verify_password(plain, hashed) — bcrypt via passlib
- create_access_token(user_id, is_root) — JWT payload {sub, is_root, exp} 24h过期
- decode_token(token) — JWT 解码，异常返回 None
- get_current_user(Depends) — 解析 HTTPBearer token，通过 get_db() session 查 User 表
  - token无效: 401 "登录已过期，请重新登录"
  - 用户不存在或被禁用(is_active=False): 403 "账号已被禁用"
- require_root(Depends) — 检查 current_user.is_root，否则 403 "仅管理员可执行此操作"

**关键依赖**：函数内动态 import app.models.user.User 和 app.database.get_db

git commit -m "feat: add JWT auth module with bcrypt and FastAPI deps"

---

## Task 3: core/middleware.py — CORS

**Dependencies:** Task 1 | **Parallelizable:** Yes

setup_cors(app): CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]

git commit -m "feat: add CORS middleware"

---

## Task 4: 5 个 Pydantic Schemas

**Dependencies:** Task 1 | **Parallelizable:** Yes

- schemas/auth.py: LoginRequest(username,password), UserInfo(id,username,is_root,note,created_at), LoginResponse(token,user:UserInfo)
- schemas/video.py: DetectRequest(url), DetectResponse(detected:str|None,platforms:list[str]), ResolutionOption(format_id,description), ResolutionsResponse(resolutions:list[ResolutionOption])
- schemas/download.py: DownloadCreate(url,platform,resolution:str|None), DownloadResponse(所有字段:id,url,platform,resolution,status,progress,file_name,file_size,error_message,created_at,completed_at), DownloadListResponse(items,total)
- schemas/cookie.py: CookieStatusItem(exists:bool,uploaded_at:str|None,last_used_at:str|None), CookieStatusResponse(cookies:dict[str,CookieStatusItem]), CookieUploadResponse(platform,message)
- schemas/admin.py: UserCreate(username,password,note), UserListItem(id,username,note,is_active,created_at), UserListResponse(users:list[UserListItem],total), CreateUserResponse(id,username,message)

git commit -m "feat: add all Pydantic schemas"

---

## Task 5: utils/file_utils.py — 路径安全

**Dependencies:** Task 1 | **Parallelizable:** Yes

- safe_path(base_dir, *segments): resolve后检查前缀防目录穿越，异常抛 ValueError
- get_file_info(path): 返回 {size, name} dict

git commit -m "feat: add file utilities with path traversal protection"

---

## Task 6: services/platform_detector.py — URL 平台检测

**Dependencies:** Task 1 | **Parallelizable:** Yes

- PLATFORM_RULES: [(domains列表, platform名)] 6组映射
  - youtube: youtube.com, youtu.be
  - bilibili: bilibili.com, b23.tv
  - instagram: instagram.com
  - facebook: facebook.com, fb.watch, fb.com
  - douyin: douyin.com, iesdouyin.com
  - tiktok: tiktok.com
- ALL_PLATFORMS: 从规则提取的 ["youtube","bilibili",...]
- detect_platform(url): urllib.parse hostname 提取 → removeprefix("www.") → 遍历规则匹配 → 返回平台名或 None

git commit -m "feat: add URL-to-platform detector"

---

## Task 7: services/error_mapper.py — 错误消息中文映射

**Dependencies:** Task 1 | **Parallelizable:** Yes

- ERROR_RULES: 18条 (pattern, 中文提示) 元组列表
  403→"访问被拒绝", 404→"视频不存在", 429→"请求过于频繁", 
  unavailable→"视频不可用", private→"私密视频", age→"年龄限制",
  cookies/sign in→"Cookies过期或无效", format not available→"分辨率不可用",
  ffmpeg→"服务器未安装ffmpeg", unsupported→"不支持的链接",
  member-only→"会员专属", login required→"需要登录",
  rate limit→"触发限流", timeout→"下载超时", connection→"网络失败",
  extractor+error→"解析失败", default→"下载失败请稍后重试"
- map_error(stderr, exit_code): 遍历规则在 stderr.lower() 中匹配

git commit -m "feat: add error message mapper"

---

## Task 8: 6 个平台下载策略（7 个文件）

**Dependencies:** Task 1 | **Parallelizable:** Yes

- platforms/__init__.py: _STRATEGIES dict + get_strategy(platform) 注册表
- platforms/base.py: DownloadStrategy 抽象类
  - build_args(url,cookies,resolution,output_dir) → abstract list[str]
  - parse_progress(line) → float|None 默认解析 "[download]  xx.x%"
  - needs_merge(info) → bool 默认 False
  - get_format_string(resolution) → str 默认 "best"
  - parse_extracted_info(stdout) → dict 默认解析 JSON 行

**共同参数（所有策略）**：--cookies, -o f"{output_dir}/%(title)s.%(ext)s", --merge-output-format mp4, --no-playlist, --extractor-retries 3, --retries 3, --no-warnings, --print "%(title)s||%(ext)s||%(filesize)s"

- platforms/youtube.py: YouTubeStrategy
  - get_format_string: "bestvideo[height<=?{h}]+bestaudio/best[height<=?{h}]/best"
  - needs_merge: True
- platforms/bilibili.py: BilibiliStrategy
  - get_format_string: "bestvideo[height<=?{h}]+bestaudio/best[height<=?{h}]/best"
- platforms/instagram.py: InstagramStrategy, -f "best"
- platforms/facebook.py: FacebookStrategy, 同 bilibili 参数
- platforms/douyin.py: DouyinStrategy, -f "best"
- platforms/tiktok.py: TikTokStrategy, -f "best"

git commit -m "feat: add 6 platform download strategies with base class"

---

## Task 9: services/merger.py — ffmpeg 兜底合并

**Dependencies:** Task 1 | **Parallelizable:** Yes

merge_audio_video(video_path, audio_path, output_path):
- 命令: ffmpeg -i video -i audio -c:v copy -c:a aac -y output
- asyncio.create_subprocess_exec 执行
- 成功: 删除 video_path 和 audio_path 原文件，返回 True
- 失败: 返回 False，保留原文件
- FileNotFoundError/其他异常: 返回 False

git commit -m "feat: add ffmpeg merger fallback"

---

## Task 10: services/downloader.py — 核心下载引擎

**Dependencies:** Task 6, 7, 8, 9 | **Parallelizable:** No

- create_download_task(db,user_id,url,platform,resolution,cookies_path):
  1. 创建 Download 记录（status=pending）→ commit → refresh 获取 id
  2. asyncio.create_task(_run_download(...)) 启动后台下载
  3. 返回 download_id

- _run_download(download_id,url,platform,resolution,cookies_path):
  1. 独立 async_session_factory() 创建 db session
  2. status→"processing"，commit
  3. output_dir = settings.VIDEOS_DIR / str(download_id)，mkdir
  4. strategy = get_strategy(platform)
  5. args = ["yt-dlp"] + strategy.build_args(...)
  6. asyncio.create_subprocess_exec(yt-dlp, stdout=PIPE, stderr=PIPE)
  7. 逐行读取 stdout: 调 strategy.parse_progress() 解析进度 → 0-99 写 DB → commit
  8. 收集 stdout/stderr 到 buffer
  9. await process.wait() → returncode
  10. returncode==0: 在 output_dir 查找输出文件(.mp4/.mkv/.webm)
      - 找到: status="completed", progress=100, file_path, file_name, file_size, completed_at=now
      - 未找到: status="failed", error_message="下载完成但未找到生成的文件"
  11. returncode!=0: status="failed", error_message=map_error(stderr,returncode)
  12. 异常捕获: status="failed", error_message=str(e)
  13. 每次状态变更后 commit

- get_download_progress(db,download_id): db.get(Download,download_id) → 返回 progress/status/file_name/file_size/error_message dict

git commit -m "feat: add download orchestrator with async yt-dlp"

---

## Task 11: services/cleanup.py — 定时清理

**Dependencies:** Task 1 | **Parallelizable:** Yes

cleanup_expired_videos():
- 遍历 settings.VIDEOS_DIR 子目录
- stat().st_mtime 超过 VIDEO_RETENTION_MINUTES*60 秒 → shutil.rmtree
- 异常: pass 吞掉

git commit -m "feat: add scheduled video cleanup"

---

## Task 12: routers/auth.py

**Dependencies:** Task 2, 4 | **Parallelizable:** No

- POST /api/auth/login: 
  - 查 User 表 where username==body.username
  - verify_password(body.password, user.password_hash)
  - 用户不存在或密码错: 401 "用户名或密码错误"
  - is_active==False: 403 "账号已被禁用"
  - 成功: create_access_token(), 返回 LoginResponse(token, UserInfo)
- GET /api/auth/me: get_current_user → UserInfo 返回

git commit -m "feat: add auth routes"

---

## Task 13: routers/videos.py

**Dependencies:** Task 4, 6 | **Parallelizable:** No

- POST /api/videos/detect: 调 detect_platform(url) → DetectResponse(detected, ALL_PLATFORMS)
- GET /api/videos/resolutions?platform=&url=:
  1. 查 Cookie 表 where user_id+platform，无则 400 "请先上传该平台的 Cookies"
  2. asyncio.create_subprocess_exec: yt-dlp -F url --cookies path
  3. asyncio.wait_for(process.communicate(), timeout=30)
  4. 解析 stdout 行: 提取 format_id(parts[0]) + description(parts[2:])
  5. 过滤纯音频(parts[1] in audio_exts)，保留含分辨率的行
  6. 去重(by description)，返回 ResolutionsResponse
  7. 超时: 500 "获取分辨率超时"，异常: 500 "获取分辨率失败"

git commit -m "feat: add video detect and resolution routes"

---

## Task 14: routers/downloads.py

**Dependencies:** Task 4, 10 | **Parallelizable:** No

- POST /api/downloads:
  1. get_current_user 获取 user_id
  2. 查 Cookie 表校验 cookies 存在且文件存在: 400 "请先上传该平台的 Cookies"
  3. create_download_task(db,user_id,url,platform,resolution,cookies.file_path)
  4. 返回 {"download_id": id}

- GET /api/downloads?page=1&page_size=20:
  1. select func.count + select order_by created_at DESC offset/limit
  2. 仅 where user_id==current_user.id
  3. 返回 DownloadListResponse(items, total)

- GET /api/downloads/{id}: db.get 校验归属 → DownloadResponse

- GET /api/downloads/{id}/progress (SSE):
  1. StreamingResponse(media_type="text/event-stream")
  2. event_generator: while True loop, 0.5s sleep
  3. 每次 async_session_factory() 创建独立 session 查 Download
  4. 校验 user_id 归属
  5. 推送 JSON: {"progress","status","file_name"?,"file_size"?,"error_message"?}
  6. status="completed"/"failed" → 推送后 break
  7. 检查 await request.is_disconnected()

- GET /api/downloads/{id}/file:
  1. status!="completed": 400 "视频尚未下载完成"
  2. 文件不存在: 404 "视频文件已过期，请重新下载"
  3. FileResponse(path,filename,media_type="application/octet-stream")

- POST /api/downloads/{id}/retry:
  1. status!="failed": 400 "只能重试失败的下载"
  2. 校验 cookies 仍存在
  3. create_download_task 创建新记录 → {"download_id":new_id, "message":"已重新提交下载"}

git commit -m "feat: add download routes with SSE progress"

---

## Task 15: routers/cookies.py

**Dependencies:** Task 4 | **Parallelizable:** Yes

- GET /api/cookies/status: 
  1. 查所有 Cookie where user_id
  2. 遍历 settings.SUPPORTED_PLATFORMS 构建 CookieStatusResponse
  3. 每个平台: {exists: bool(文件存在), uploaded_at, last_used_at}

- POST /api/cookies/upload (multipart: platform + file):
  1. 校验 platform ∈ SUPPORTED_PLATFORMS: 400 "不支持的平台"
  2. safe_path(COOKIES_DIR, str(user_id), platform) → mkdir
  3. await file.read() → 写入 cookies.txt
  4. DB: select or insert Cookie 记录 → file_path 更新 → commit
  5. 返回 CookieUploadResponse(platform, "xxx 的 Cookies 上传成功")

- DELETE /api/cookies/{platform}:
  1. 查 Cookie → 404 "未找到该平台的 Cookies"
  2. Path.unlink() 删除文件
  3. db.delete(cookie) → commit

git commit -m "feat: add cookies management routes"

---

## Task 16: routers/admin.py (root only)

**Dependencies:** Task 2, 4 | **Parallelizable:** Yes

- GET /api/admin/users (Depends(require_root)):
  1. select func.count + select all order_by created_at DESC
  2. 返回 UserListResponse(UserListItem: id,username,note,is_active,created_at)
  **不包含** password_hash

- POST /api/admin/users (Depends(require_root)):
  1. 查 username 是否已存在 → 409 "用户名已存在"
  2. User(username, hash_password(password), note, is_root=False)
  3. db.add → commit → refresh
  4. 返回 CreateUserResponse

- DELETE /api/admin/users/{id} (Depends(require_root)):
  1. db.get(User,id) → 404 "用户不存在"
  2. user.is_root: 400 "无法禁用 root 用户"
  3. user.is_active=False → commit (软删除)
  4. 返回 {"message":"用户 xxx 已被禁用"}

git commit -m "feat: add admin routes"

---

## Task 17: app/main.py — FastAPI 入口

**Dependencies:** Task 12, 13, 14, 15, 16 | **Parallelizable:** No

- lifespan:
  - 启动: await init_db() (from app.database, 数据库计划提供)
  - AsyncIOScheduler: add_job(cleanup_expired_videos, "interval", minutes=CLEANUP_INTERVAL_MINUTES)
  - scheduler.start()
  - yield
  - 关闭: scheduler.shutdown(wait=False)

- app = FastAPI(title="视频下载网站", version="1.0.0", lifespan=lifespan)
- setup_cors(app)
- include_router(auth.router), include_router(videos.router), include_router(downloads.router), include_router(cookies.router), include_router(admin.router)
- 如果 frontend/dist 存在: app.mount("/", StaticFiles, html=True)

git commit -m "feat: add FastAPI app entry point with scheduler"

---

## 前后端接口对齐（16 个端点）

| # | 后端路由 | 前端调用 | 请求 | 响应 |
|---|----------|----------|------|------|
| 1 | POST /api/auth/login | api/auth.ts:login() | {username,password} | {token,user:{id,username,is_root,note,created_at}} |
| 2 | GET /api/auth/me | api/auth.ts:getMe() | — | {id,username,is_root,note,created_at} |
| 3 | POST /api/videos/detect | api/videos.ts:detect() | {url} | {detected,platforms} |
| 4 | GET /api/videos/resolutions | api/videos.ts:getResolutions() | ?platform=&url= | {resolutions:[{format_id,description}]} |
| 5 | POST /api/downloads | api/downloads.ts:submit() | {url,platform,resolution?} | {download_id} |
| 6 | GET /api/downloads | api/downloads.ts:list() | ?page=&page_size= | {items:[...],total} |
| 7 | GET /api/downloads/{id} | api/downloads.ts:getOne() | — | {id,url,platform,status,...} |
| 8 | GET /api/downloads/{id}/progress | EventSource (SSE) | — | SSE流 {progress,status,...} |
| 9 | GET /api/downloads/{id}/file | window.open() | — | 文件流 (Content-Disposition) |
| 10 | POST /api/downloads/{id}/retry | api/downloads.ts:retry() | — | {download_id} |
| 11 | GET /api/cookies/status | api/cookies.ts:getStatus() | — | {cookies:{platform:{exists,uploaded_at,...}}} |
| 12 | POST /api/cookies/upload | api/cookies.ts:upload() | multipart(platform+file) | {platform,message} |
| 13 | DELETE /api/cookies/{platform} | api/cookies.ts:remove() | — | {message} |
| 14 | GET /api/admin/users | api/admin.ts:listUsers() | — | {users:[{id,username,note,...}],total} |
| 15 | POST /api/admin/users | api/admin.ts:createUser() | {username,password,note} | {id,username,message} |
| 16 | DELETE /api/admin/users/{id} | api/admin.ts:deleteUser() | — | {message} |

**接口一致性验证**：16 个端点全部前后对齐 ✅

---

## 后端与数据库对齐

| 后端引用 | 数据库提供 |
|----------|-----------|
| app.core.auth: from app.models.user import User | app/models/user.py |
| app.core.auth: from app.database import get_db | app/database.py |
| app.routers.auth: User + get_db | models + database |
| app.routers.videos: Cookie + get_db | models/cookie.py + database.py |
| app.routers.downloads: Cookie + Download + get_db | models/cookie.py + models/download.py + database.py |
| app.routers.cookies: Cookie + get_db + settings + safe_path | models/cookie.py + database.py + config.py + utils |
| app.routers.admin: User + get_db | models/user.py + database.py |
| app.services.downloader: Download + settings + get_strategy | models/download.py + config.py + platforms/ |
| app.services.cleanup: settings.VIDEOS_DIR | config.py |
| app.main: init_db() + settings | database.py + config.py |

---

**Execution Mode:** serial (Task 1→2→3, 4+5+6+7+8+9+11 并行, 10→12+15+16→13→14→17)
