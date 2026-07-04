import { NavLink } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { Download, Clock, Cookie, Shield, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

const navItems = [
  { to: "/", label: "下载视频", icon: Download },
  { to: "/history", label: "下载历史", icon: Clock },
  { to: "/cookies", label: "Cookies", icon: Cookie },
]

export default function Sidebar() {
  const { user, isRoot, logout } = useAuth()

  return (
    <aside className="fixed left-0 top-0 flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-14 items-center gap-2 px-6">
        <Download className="h-5 w-5 text-primary" />
        <span className="text-lg font-semibold">视频下载</span>
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
        {isRoot && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`
            }
          >
            <Shield className="h-4 w-4" />
            用户管理
          </NavLink>
        )}
      </nav>
      <Separator />
      <div className="flex items-center justify-between p-3">
        <span className="text-sm text-muted-foreground truncate max-w-[140px]">{user?.username}</span>
        <Button variant="ghost" size="icon" onClick={logout} title="退出登录">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </aside>
  )
}
