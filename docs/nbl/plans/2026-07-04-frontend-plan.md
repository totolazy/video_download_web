# 前端层实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use nbl.subagent-driven-development (recommended). Steps use checkbox (- [ ]) syntax.

**Goal:** 实现 React + Vite 完整前端：登录、下载、历史、Cookies管理、用户管理 5 个页面，含 SSE 实时进度、shadcn/ui 组件

**Architecture:** React 18 + TypeScript + Vite + shadcn/ui + Tailwind CSS + React Router v6 + TanStack Query + axios。状态管理：AuthContext (认证) + TanStack Query (服务端数据) + EventSource (实时进度)

**Tech Stack:** React 18, TypeScript, Vite, shadcn/ui, Tailwind CSS, React Router v6, @tanstack/react-query, axios, lucide-react

---

## 文件清单（30+ 个文件）

| # | 文件 | 职责 |
|---|------|------|
| frontend/package.json, tsconfig.json, vite.config.ts, etc. | 项目配置 |
| src/api/client.ts | axios 实例 + JWT 拦截器 |
| src/api/auth.ts | 登录 API |
| src/api/videos.ts | URL检测 + 分辨率 |
| src/api/downloads.ts | 下载 CRUD API |
| src/api/cookies.ts | Cookies 管理 API |
| src/api/admin.ts | 用户管理 API (root) |
| src/contexts/AuthContext.tsx | 认证状态 Provider |
| src/hooks/useAuth.ts | 认证 hook |
| src/hooks/useDownload.ts | 下载流程 hook |
| src/hooks/useCookies.ts | Cookies hook |
| src/lib/utils.ts | 工具函数 |
| src/lib/constants.ts | 常量（平台列表等） |
| src/components/layout/AppLayout.tsx | 布局：Sidebar + Outlet |
| src/components/layout/Sidebar.tsx | 侧边导航 |
| src/components/layout/ProtectedRoute.tsx | 路由守卫 |
| src/components/download/UrlInput.tsx | URL 输入 + 检测 |
| src/components/download/PlatformSelect.tsx | 平台选择器 |
| src/components/download/ResolutionSelect.tsx | 分辨率选择器 |
| src/components/download/CookiesStatus.tsx | Cookies 状态 + 上传 |
| src/components/download/ProgressBar.tsx | 进度条 + 下载按钮 |
| src/components/download/DownloadCard.tsx | 下载卡片（组装） |
| src/components/history/HistoryTable.tsx | 历史列表表格 |
| src/components/history/HistoryRow.tsx | 单条记录行 |
| src/components/admin/UserTable.tsx | 用户列表表格 |
| src/components/admin/CreateUserDialog.tsx | 创建用户弹窗 |
| src/pages/LoginPage.tsx | 登录页 |
| src/pages/HomePage.tsx | 首页/下载页 |
| src/pages/HistoryPage.tsx | 下载历史页 |
| src/pages/CookiesPage.tsx | Cookies 管理页 |
| src/pages/AdminPage.tsx | 用户管理页 |
| src/App.tsx | 路由定义 |
| src/main.tsx | 入口 |
| src/index.css | Tailwind + 全局样式 |

---

## Task 1: 项目初始化 (Vite + shadcn/ui)

**Dependencies:** None | **Parallelizable:** Yes

- npm create vite@latest frontend -- --template react-ts
- 安装依赖: react-router-dom, @tanstack/react-query, axios, lucide-react
- 安装 tailwindcss, postcss, autoprefixer
- npx shadcn@latest init (slate主题, css variables: yes)
- npx shadcn@latest add button, input, select, card, dialog, table, progress, badge, toast, separator, sheet
- 配置 vite.config.ts: server.proxy { '/api': 'http://127.0.0.1:8000' }
- 配置 tsconfig.json paths: "@/*" -> "./src/*"

---

## Task 2: 基础工具层 (api/ + lib/ + contexts/)

**Dependencies:** Task 1 | **Parallelizable:** No

### api/client.ts — axios 实例

- baseURL: "/api"
- 请求拦截器: 自动加 Authorization: Bearer {token}
- 响应拦截器: 401 时清除 localStorage token + 跳转 /login

### lib/constants.ts — 常量

- PLATFORMS: [{value: 'youtube', label: 'YouTube'}, ...] 6平台
- RESOLUTION_OPTIONS: ['2160p','1440p','1080p','720p','480p','360p']

### lib/utils.ts — 工具函数

- formatFileSize(bytes): 转 KB/MB/GB
- formatDate(iso): 友好时间格式

### contexts/AuthContext.tsx — 认证上下文

- Provider 包裹整个App
- state: user (UserInfo|null), token (string|null), loading (bool)
- 启动时从 localStorage 读 token，调 GET /api/auth/me 验证
- login(username,password): POST /api/auth/login，存 token 到 localStorage
- logout(): 清除 token + user，跳转 /login
- isRoot: computed from user.is_root

---

## Task 3: API 层 (5个文件)

**Dependencies:** Task 1 | **Parallelizable:** Yes

### api/auth.ts
- login(username, password) -> POST /api/auth/login -> LoginResponse
- getMe() -> GET /api/auth/me -> UserInfo

### api/videos.ts
- detect(url) -> POST /api/videos/detect -> DetectResponse
- getResolutions(platform, url) -> GET /api/videos/resolutions -> ResolutionsResponse

### api/downloads.ts
- submit(url, platform, resolution) -> POST /api/downloads -> {download_id}
- list(page, pageSize) -> GET /api/downloads -> DownloadListResponse
- getOne(id) -> GET /api/downloads/{id} -> DownloadResponse
- retry(id) -> POST /api/downloads/{id}/retry -> {download_id}

### api/cookies.ts
- getStatus() -> GET /api/cookies/status -> CookieStatusResponse
- upload(platform, file) -> POST /api/cookies/upload (FormData) -> CookieUploadResponse
- remove(platform) -> DELETE /api/cookies/{platform}

### api/admin.ts
- listUsers() -> GET /api/admin/users -> UserListResponse
- createUser(username, password, note) -> POST /api/admin/users -> CreateUserResponse
- deleteUser(id) -> DELETE /api/admin/users/{id}

---

## Task 4: Hooks 层

**Dependencies:** Task 2, 3 | **Parallelizable:** Yes

### hooks/useAuth.ts
- 封装 useContext(AuthContext)，导出 useAuth hook
- 返回: { user, token, login, logout, loading, isRoot }

### hooks/useCookies.ts
- useQuery: cookiesStatus -> getStatus(), 30s staleTime
- useMutation: uploadCookie -> upload() -> invalidate cookiesStatus
- useMutation: deleteCookie -> remove() -> invalidate cookiesStatus

### hooks/useDownload.ts — 核心下载 hook
- useMutation: submitDownload -> submit()
- useQuery: downloadHistory -> list()
- 自定义: useDownloadProgress(downloadId) — EventSource SSE hook
  - 状态: { progress, status, fileName, fileSize, errorMessage }
  - useEffect 内 new EventSource(url)，onmessage 更新状态
  - status=completed/failed 时 close，cleanup 时 close

---

## Task 5: Layout 组件

**Dependencies:** Task 2 | **Parallelizable:** Yes

### components/layout/ProtectedRoute.tsx
- 读取 AuthContext，loading 时显示 spinner
- 未登录 redirect /login
- 已登录渲染 Outlet

### components/layout/Sidebar.tsx
- 导航项: Home, History, Cookies, Admin(仅isRoot)
- 当前路由高亮，lucide-react 图标
- 底部: 用户名 + [退出登录]

### components/layout/AppLayout.tsx
- 左侧 Sidebar (w-64固定)，右侧 Outlet (flex-1 overflow-auto)
- min-h-screen 布局

---

## Task 6: Download 相关组件（6个）

**Dependencies:** Task 4 | **Parallelizable:** No (依赖 hooks)

### components/download/UrlInput.tsx
- 输入框 + [检测] 按钮
- 输入链接后点击检测调 detect(url)
- 检测结果通过 callback 通知父组件 (detected, platforms)

### components/download/PlatformSelect.tsx
- Select 组件，选项来自 platforms 列表
- 默认值: 检测结果 (detected)
- 支持搜索/手动选择其他平台

### components/download/ResolutionSelect.tsx
- Select 组件，选项来自 getResolutions()
- 显示 format_id + description
- 如果没有分辨率（instagram/tiktok等短格式），可选是否显示默认选项

### components/download/CookiesStatus.tsx
- 显示指定平台的 cookies 状态
- 已有: 绿色 badge "已上传 (日期)" + [重新上传] 按钮
- 无: 红色 badge "未上传" + [上传文件] 按钮
- 上传: <input type=file> 选择txt文件 -> upload(platform, file)

### components/download/ProgressBar.tsx
- Props: downloadId, onComplete
- 使用 useDownloadProgress hook 订阅 SSE
- 显示 Progress 组件 (0-100%)
- 进度条上方: "下载中 45%"
- 完成: 100%绿色进度条 + [⬇ 下载到本地] 按钮
- 按钮: window.open(/api/downloads/{id}/file) 触发下载
- 失败: 红色进度条 + 错误消息 + [重试] 按钮

### components/download/DownloadCard.tsx — 组装容器
- Card 组件包裹上述所有子组件
- 状态机管理: 
  - idle: UrlInput + PlatformSelect + CookiesStatus
  - ready: 已检测+有cookies -> 显示 ResolutionSelect + [开始下载]
  - downloading: ProgressBar
  - complete/failed: ProgressBar 最终态
- [开始下载] 按钮: 调 submitDownload -> 获取 downloadId -> 切换到 downloading

---

## Task 7: History 组件

**Dependencies:** Task 4 | **Parallelizable:** Yes

### components/history/HistoryTable.tsx
- useQuery downloadHistory(page)
- Table 组件，列: 平台, 链接(截断), 分辨率, 状态, 进度, 时间
- 分页: 上一页/下一页按钮

### components/history/HistoryRow.tsx
- 状态badge: pending=灰色, processing=蓝色, completed=绿色, failed=红色
- completed: [下载] 按钮 (window.open file)
- failed: [重试] 按钮 (retry mutation)
- 折叠详情: 展开显示完整URL和错误信息

---

## Task 8: Admin 组件

**Dependencies:** Task 4 | **Parallelizable:** Yes

### components/admin/UserTable.tsx
- useQuery listUsers
- Table 列: 用户名, 备注, 状态, 创建时间, 操作
- 操作: [禁用] 按钮 -> deleteUser mutation -> invalidate

### components/admin/CreateUserDialog.tsx
- Dialog 弹窗，触发按钮 "创建用户"
- 表单: username input, password input, note input
- 提交: createUser mutation -> invalidate listUsers + close dialog

---

## Task 9: Pages 页面（5个）

**Dependencies:** Task 5-8 | **Parallelizable:** No

### pages/LoginPage.tsx
- 全屏居中卡片，标题 "视频下载"
- username + password 输入 + [登录] 按钮
- useAuth().login 调用
- 错误: 红色提示（用户名或密码错误 / 账号已被禁用）
- 登录成功自动跳转 /

### pages/HomePage.tsx
- 标题 "视频下载"
- DownloadCard 组件
- 简洁的单列布局

### pages/HistoryPage.tsx
- 标题 "下载历史"
- HistoryTable 组件

### pages/CookiesPage.tsx
- 标题 "Cookies 管理"
- 6平台网格布局 (3x2)
- 每个平台卡片: 平台名 + 状态badge + 上传/删除按钮
- 使用 useState 管理本地上传状态

### pages/AdminPage.tsx
- 仅 isRoot 渲染，否则重定向 /
- 标题 "用户管理"
- [创建用户] 按钮 -> CreateUserDialog
- UserTable

---

## Task 10: App.tsx 路由 + main.tsx 入口

**Dependencies:** Task 9 | **Parallelizable:** No

### App.tsx
- BrowserRouter -> AuthProvider -> QueryClientProvider -> Routes
- Routes:
  - /login -> LoginPage
  - ProtectedRoute -> AppLayout (Outlet) ->
    - / -> HomePage
    - /history -> HistoryPage
    - /cookies -> CookiesPage
    - /admin -> AdminPage
  - * -> Navigate to /

### main.tsx
- createRoot, render App
- import index.css

### index.css
- @tailwind base; @tailwind components; @tailwind utilities;
- 基础 body 样式: font-family, bg-gray-50, text-gray-900

---

## 前端后端接口对齐

| 前端调用 | API 端点 | 请求 | 响应 |
|----------|----------|------|------|
| api/auth.login() | POST /api/auth/login | {username,password} | {token,user} |
| api/auth.getMe() | GET /api/auth/me | — | {id,username,is_root,...} |
| api/videos.detect() | POST /api/videos/detect | {url} | {detected,platforms} |
| api/videos.getResolutions() | GET /api/videos/resolutions | ?platform=&url= | {resolutions:[{format_id,desc}]} |
| api/downloads.submit() | POST /api/downloads | {url,platform,resolution} | {download_id} |
| api/downloads.list() | GET /api/downloads | ?page=&page_size= | {items,total} |
| api/downloads.getOne() | GET /api/downloads/{id} | — | DownloadResponse |
| EventSource (SSE) | GET /api/downloads/{id}/progress | — | SSE {progress,status,...} |
| window.open (下载) | GET /api/downloads/{id}/file | — | 文件流 |
| api/downloads.retry() | POST /api/downloads/{id}/retry | — | {download_id} |
| api/cookies.getStatus() | GET /api/cookies/status | — | {cookies:{platform:{...}}} |
| api/cookies.upload() | POST /api/cookies/upload | FormData | {platform,message} |
| api/cookies.remove() | DELETE /api/cookies/{platform} | — | {message} |
| api/admin.listUsers() | GET /api/admin/users | — | {users,total} |
| api/admin.createUser() | POST /api/admin/users | {username,password,note} | {id,username,message} |
| api/admin.deleteUser() | DELETE /api/admin/users/{id} | — | {message} |

---

**Execution Mode:** serial (Task 1->2->3+4->5->6->7+8->9->10)
