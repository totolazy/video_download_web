# 前端层实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use nbl.subagent-driven-development (recommended). Steps use checkbox (- [ ]) syntax.

**Goal:** 实现 React + Vite 完整前端：登录、下载、历史、Cookies管理、用户管理 5 个页面，含 SSE 实时进度、shadcn/ui 组件

**Architecture:** React 18 + TypeScript + Vite + shadcn/ui + Tailwind CSS + React Router v6 + TanStack Query + axios。状态管理：AuthContext (认证) + TanStack Query (服务端数据) + EventSource (实时进度)

**Tech Stack:** React 18, TypeScript, Vite, shadcn/ui, Tailwind CSS, React Router v6, @tanstack/react-query, axios, lucide-react

---

## 文件清单（38 个文件：34 个 src + 4 个项目配置）

| # | 文件 | 职责 |
|---|------|------|
| 1 | frontend/package.json, tsconfig.json, vite.config.ts, index.html | 项目配置文件（4个） |
| 2 | src/api/client.ts | axios 实例 + JWT 拦截器 |
| 3 | src/api/auth.ts | 登录 API（login, getMe） |
| 4 | src/api/videos.ts | URL 检测 + 分辨率 |
| 5 | src/api/downloads.ts | 下载 CRUD（submit, list, getOne, retry） |
| 6 | src/api/cookies.ts | Cookies 管理（getStatus, upload, remove） |
| 7 | src/api/admin.ts | 用户管理（listUsers, createUser, deleteUser） |
| 8 | src/contexts/AuthContext.tsx | 认证状态 Provider |
| 9 | src/hooks/useAuth.ts | 认证 hook |
| 10 | src/hooks/useDownload.ts | 下载流程 hook + SSE progress |
| 11 | src/hooks/useCookies.ts | Cookies hook |
| 12 | src/lib/utils.ts | 工具函数（formatFileSize, formatDate） |
| 13 | src/lib/constants.ts | 常量（平台列表、分辨率选项） |
| 14 | src/components/layout/AppLayout.tsx | 整体布局：Sidebar + Outlet |
| 15 | src/components/layout/Sidebar.tsx | 侧边导航 |
| 16 | src/components/layout/ProtectedRoute.tsx | 路由守卫：未登录跳 /login |
| 17 | src/components/download/UrlInput.tsx | URL 输入 + 检测按钮 |
| 18 | src/components/download/PlatformSelect.tsx | 平台选择器（自动识别 + 手动） |
| 19 | src/components/download/ResolutionSelect.tsx | 分辨率选择器 |
| 20 | src/components/download/CookiesStatus.tsx | Cookies 状态 + 上传 |
| 21 | src/components/download/ProgressBar.tsx | 进度条 + 下载按钮 + SSE 订阅 |
| 22 | src/components/download/DownloadCard.tsx | 下载卡片（组装以上5个子组件） |
| 23 | src/components/history/HistoryTable.tsx | 下载历史表格（分页） |
| 24 | src/components/history/HistoryRow.tsx | 单条历史记录行 |
| 25 | src/components/admin/UserTable.tsx | 用户列表表格 |
| 26 | src/components/admin/CreateUserDialog.tsx | 创建用户弹窗 |
| 27 | src/pages/LoginPage.tsx | 登录页 |
| 28 | src/pages/HomePage.tsx | 首页/下载页 |
| 29 | src/pages/HistoryPage.tsx | 下载历史页 |
| 30 | src/pages/CookiesPage.tsx | Cookies 管理页 |
| 31 | src/pages/AdminPage.tsx | 用户管理页（仅 root 可见） |
| 32 | src/App.tsx | 路由定义 |
| 33 | src/main.tsx | React 入口 |
| 34 | src/index.css | Tailwind + 全局样式 |

---

## Task 1: 项目初始化 (Vite + shadcn/ui + 依赖安装)

**Dependencies:** None | **Parallelizable:** Yes

步骤：
1. npm create vite@latest frontend -- --template react-ts
2. cd frontend && npm install
3. npm install react-router-dom @tanstack/react-query axios lucide-react
4. npm install -D tailwindcss @tailwindcss/vite postcss autoprefixer
5. npx shadcn@latest init（slate 主题，css variables: yes，默认路径）
6. npx shadcn@latest add button input select card dialog table progress badge toast separator sheet
7. 配置 vite.config.ts: server.proxy { "/api": "http://127.0.0.1:8000" }
8. 配置 tsconfig.json paths: "@/*" -> "./src/*"
9. 配置 index.css: @tailwind base/components/utilities + 基础 body 样式

git commit -m "feat: init React+Vite+shadcn/ui frontend project"

---

## Task 2: 基础工具层 (client.ts + constants.ts + utils.ts + AuthContext)

**Dependencies:** Task 1 | **Parallelizable:** No

### src/api/client.ts
- axios.create({ baseURL: "/api" })
- 请求拦截器: 从 localStorage 取 token → Authorization: Bearer {token}
- 响应拦截器: 401 → 清除 localStorage token → window.location.href = "/login"
- 导出 client 实例

### src/lib/constants.ts
- PLATFORMS: [{value, label}] 6个平台：youtube/YouTube, bilibili/B站, instagram/Instagram, facebook/Facebook, douyin/抖音, tiktok/TikTok
- SUPPORTED_PLATFORMS: ["youtube","bilibili",...] 

### src/lib/utils.ts
- formatFileSize(bytes): < 1KB→"B", < 1MB→"KB", < 1GB→"MB", else→"GB"
- formatDate(iso): new Date(iso).toLocaleString("zh-CN")

### src/contexts/AuthContext.tsx
- createContext + AuthProvider 包裹 App
- state: user (UserInfo|null), token (string|null), loading (bool)
- useEffect 启动: 从 localStorage 读 token → 有则调 GET /api/auth/me → 失败则清空
- login(username, password): POST /api/auth/login → 存 token 到 localStorage → setUser
- logout(): 清除 localStorage token + user → navigate("/login")
- isRoot: user?.is_root ?? false
- value 导出: { user, token, loading, login, logout, isRoot }

git commit -m "feat: add API client, constants, utils, and AuthContext"

---

## Task 3: API 层函数（6 个文件）

**Dependencies:** Task 2 | **Parallelizable:** Yes（6个文件之间互相独立）

### src/api/auth.ts
- login(username: string, password: string): client.post("/auth/login", {username, password}) → data
- getMe(): client.get("/auth/me") → data

### src/api/videos.ts
- detect(url: string): client.post("/videos/detect", {url}) → data as DetectResponse
- getResolutions(platform: string, url: string): client.get("/videos/resolutions", {params: {platform, url}}) → data as ResolutionsResponse

### src/api/downloads.ts
- submit(url, platform, resolution): client.post("/downloads", {url, platform, resolution}) → data
- list(page=1, pageSize=20): client.get("/downloads", {params: {page, page_size: pageSize}}) → data
- getOne(id): client.get(/downloads/{id}) → data
- retry(id): client.post(/downloads/{id}/retry) → data

### src/api/cookies.ts
- getStatus(): client.get("/cookies/status") → data
- upload(platform, file): FormData → client.post("/cookies/upload", formData) → data
- remove(platform): client.delete(/cookies/{platform}) → data

### src/api/admin.ts
- listUsers(): client.get("/admin/users") → data
- createUser(username, password, note): client.post("/admin/users", {username,password,note}) → data
- deleteUser(id): client.delete(/admin/users/{id}) → data

git commit -m "feat: add all API layer functions"

---

## Task 4: Hooks 层（3 个文件）

**Dependencies:** Task 2, 3 | **Parallelizable:** Yes

### src/hooks/useAuth.ts
- export function useAuth() { return useContext(AuthContext) }
- 返回: { user, token, loading, login, logout, isRoot }

### src/hooks/useCookies.ts
- useQuery: cookiesStatus, queryFn: getStatus, staleTime: 30s
- useMutation: uploadCookie, mutationFn: ({platform, file}) => upload(platform, file), onSuccess invalidate cookiesStatus
- useMutation: deleteCookie, mutationFn: remove, onSuccess invalidate cookiesStatus
- 返回: { cookiesStatus, uploadCookie, deleteCookie }

### src/hooks/useDownload.ts — 核心
- useQuery: downloadHistory(page), queryFn: () => list(page)
- useMutation: submitDownload, mutationFn: submit
- useMutation: retryDownload, mutationFn: retry
- useDownloadProgress(downloadId):
  - useState: { progress:0, status:"pending", fileName:null, fileSize:null, errorMessage:null }
  - useEffect: new EventSource(/api/downloads/{downloadId}/progress)
  - onmessage: JSON.parse → setState
  - status === "completed" || "failed" → es.close()
  - cleanup: es.close()
  - 返回 state

git commit -m "feat: add hooks (useAuth, useCookies, useDownload)"

---

## Task 5: Layout 布局组件（3 个文件）

**Dependencies:** Task 4 | **Parallelizable:** Yes

### src/components/layout/ProtectedRoute.tsx
- useAuth() → loading: 显示 Spinner
- !user: Navigate to="/login"
- user: Outlet

### src/components/layout/Sidebar.tsx
- 顶部: 网站标题 "视频下载"
- nav 列表（lucide 图标）:
  - Home (Download) → "/"
  - History (Clock) → "/history"
  - Cookies (Cookie) → "/cookies"
  - {isRoot && Admin (Shield) → "/admin"}
- 底部: user?.username + [退出登录] 按钮（LogOut 图标）

### src/components/layout/AppLayout.tsx
- 左: Sidebar (w-64, h-screen, fixed)
- 右: Outlet (ml-64, p-6, min-h-screen)
- bg-gray-50 背景

git commit -m "feat: add layout components (ProtectedRoute, Sidebar, AppLayout)"

---

## Task 6: Download 相关组件（6 个文件）

**Dependencies:** Task 4 | **Parallelizable:** No（DownloadCard 组装其他 5 个子组件）

### src/components/download/UrlInput.tsx
- Props: onDetected(detected, platforms)
- Textarea/Input + [检测] 按钮
- 点击检测: detect(url) → onDetected(result.detected, result.platforms)
- 检测中: 按钮 disabled + spinner

### src/components/download/PlatformSelect.tsx
- Props: detected, platforms, value, onChange
- Select 组件，items = platforms.map(p => ({value:p, label:PLATFORMS[p]}))
- 默认值 = detected || platforms[0]
- 提供搜索功能

### src/components/download/ResolutionSelect.tsx
- Props: platform, url, value, onChange, disabled
- 使用 React Query: useQuery getResolutions(platform, url)，enabled: !!platform && !!url
- Select 组件，items = resolutions
- label: "{description} ({format_id})"
- 如果没有分辨率可用: 显示 "默认" 选项

### src/components/download/CookiesStatus.tsx
- Props: platform, onRefresh?
- 使用 useCookies hook
- 如果 cookiesStatus?.cookies[platform]?.exists:
  - Badge(绿色): "已上传 ({uploaded_at})"
  - [重新上传] 按钮 → file input → uploadCookie
- 否则:
  - Badge(红色): "未上传"
  - [上传 Cookies] 按钮 → file input → uploadCookie
- 上传接受 .txt 文件

### src/components/download/ProgressBar.tsx
- Props: downloadId, onComplete
- 使用 useDownloadProgress(downloadId)
- Progress 组件 (value = progress)
- progress < 100: 显示 "{progress}%"
- status="completed": Progress(100%, green) + "下载完成" + [⬇ 下载到本地] 按钮
  - 按钮: window.open(/api/downloads/{downloadId}/file)
- status="failed": Progress(red) + errorMessage + [重试] 按钮

### src/components/download/DownloadCard.tsx — 组装容器
- Card 包裹所有子组件
- State machine:
  - idle: UrlInput + PlatformSelect + CookiesStatus
  - ready: 有 url + cookies → ResolutionSelect + [开始下载] 按钮
  - downloading: ProgressBar (隐藏其他组件)
  - complete/failed: ProgressBar 显示最终状态
- [开始下载] onClick: submitDownload → 获取 downloadId → setPhase("downloading")

git commit -m "feat: add download components (UrlInput, PlatformSelect, ResolutionSelect, CookiesStatus, ProgressBar, DownloadCard)"

---

## Task 7: History 组件（2 个文件）

**Dependencies:** Task 4 | **Parallelizable:** Yes

### src/components/history/HistoryTable.tsx
- useState page=1
- useQuery downloadHistory(page)
- Table 列: 平台, 链接(truncate 50 chars), 分辨率, 状态Badge, 进度, 创建时间
- 分页: 上一页/下一页按钮
- 行点击展开详情

### src/components/history/HistoryRow.tsx
- Props: download (DownloadResponse)
- 状态 Badge: pending=gray, processing=blue, completed=green, failed=red
- completed: [⬇ 下载] 按钮 → window.open(/api/downloads/{id}/file)
- failed: [重试] 按钮 → retryDownload mutation

git commit -m "feat: add history components (HistoryTable, HistoryRow)"

---

## Task 8: Admin 组件（2 个文件）

**Dependencies:** Task 4 | **Parallelizable:** Yes

### src/components/admin/UserTable.tsx
- useQuery listUsers()
- Table 列: 用户名, 备注, 状态(Active/Disabled), 创建时间, 操作
- 操作列: [禁用] 按钮 → deleteUser(id) → invalidate listUsers
- 如果用户是 root: 操作列显示 "不可操作"

### src/components/admin/CreateUserDialog.tsx
- Dialog 触发按钮: "创建用户" (Plus icon)
- 表单: username input + password input + note input
- [创建] 按钮: createUser(username,password,note) → onSuccess: close dialog + invalidate listUsers
- 显示 toast 成功/失败提示

git commit -m "feat: add admin components (UserTable, CreateUserDialog)"

---

## Task 9: Pages 页面（5 个文件）

**Dependencies:** Task 5, 6, 7, 8 | **Parallelizable:** No（依赖所有组件）

### src/pages/LoginPage.tsx
- 全屏居中布局（min-h-screen flex items-center justify-center）
- Card: 标题 "视频下载" + 副标题 "请登录"
- Form: username Input + password Input (type="password") + [登录] Button
- 提交: useAuth().login(username, password)
- 错误: Alert 显示错误信息
- 成功后 navigate("/")

### src/pages/HomePage.tsx
- 标题 "下载视频"
- DownloadCard 组件

### src/pages/HistoryPage.tsx
- 标题 "下载历史"
- HistoryTable 组件

### src/pages/CookiesPage.tsx
- 标题 "Cookies 管理"
- 6 平台 2x3 网格布局
- 每个平台卡片: 平台名 + 图标 + CookiesStatus 组件

### src/pages/AdminPage.tsx
- if (!isRoot) return Navigate to="/"
- 标题 "用户管理" + [创建用户] 按钮
- CreateUserDialog + UserTable

git commit -m "feat: add all 5 pages"

---

## Task 10: App.tsx 路由 + main.tsx 入口 + index.css

**Dependencies:** Task 9 | **Parallelizable:** No

### src/App.tsx
`	sx
<QueryClientProvider client={queryClient}>
  <BrowserRouter>
    <AuthProvider>
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  </BrowserRouter>
</QueryClientProvider>
`

### src/main.tsx
- import App, createRoot, render

### src/index.css
- @tailwind base/components/utilities
- body: font-family system, bg-gray-50, text-gray-900, antialiased

git commit -m "feat: add routing, entry point, and global styles"

---

## 前端与后端接口完全对齐（16 个端点）

| # | 前端调用（实现文件） | 后端端点 | HTTP 方法 | 请求 | 响应 |
|---|---------------------|----------|-----------|------|------|
| 1 | api/auth.ts:login() | /api/auth/login | POST | {username,password} | {token,user} |
| 2 | api/auth.ts:getMe() | /api/auth/me | GET | — | {id,username,is_root,...} |
| 3 | api/videos.ts:detect() | /api/videos/detect | POST | {url} | {detected,platforms} |
| 4 | api/videos.ts:getResolutions() | /api/videos/resolutions | GET | ?platform=&url= | {resolutions:[{format_id,description}]} |
| 5 | api/downloads.ts:submit() | /api/downloads | POST | {url,platform,resolution?} | {download_id} |
| 6 | api/downloads.ts:list() | /api/downloads | GET | ?page=&page_size= | {items,total} |
| 7 | api/downloads.ts:getOne() | /api/downloads/{id} | GET | — | {id,url,platform,status,...} |
| 8 | useDownload.ts:EventSource | /api/downloads/{id}/progress | GET | — | SSE: {progress,status,...} |
| 9 | ProgressBar:window.open() | /api/downloads/{id}/file | GET | — | 文件流下载 |
| 10 | api/downloads.ts:retry() | /api/downloads/{id}/retry | POST | — | {download_id} |
| 11 | api/cookies.ts:getStatus() | /api/cookies/status | GET | — | {cookies:{platform:{...}}} |
| 12 | api/cookies.ts:upload() | /api/cookies/upload | POST | FormData(platform+file) | {platform,message} |
| 13 | api/cookies.ts:remove() | /api/cookies/{platform} | DELETE | — | {message} |
| 14 | api/admin.ts:listUsers() | /api/admin/users | GET | — | {users,total} |
| 15 | api/admin.ts:createUser() | /api/admin/users | POST | {username,password,note} | {id,username,message} |
| 16 | api/admin.ts:deleteUser() | /api/admin/users/{id} | DELETE | — | {message} |

**验证结果：16/16 全部对齐 ✅**

---

**Execution Mode:** serial (Task 1→2→3+4→5→6→7+8→9→10)
