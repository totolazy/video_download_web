import { NavLink } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { Download, Clock, Cookie, Shield, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Separator } from "@/components/ui/separator"

const navItems = [
  { to: "/", label: "下载视频", icon: Download },
  { to: "/history", label: "下载历史", icon: Clock },
  { to: "/cookies", label: "Cookies", icon: Cookie },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { isRoot } = useAuth()

  const linkClass = (isActive: boolean) =>
    "flex items-center gap-3 rounded-xl transition-all duration-300 ease-in-out " +
    (collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5") +
    " text-sm font-medium " +
    (isActive
      ? "bg-primary text-primary-foreground shadow-sm"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")

  return (
    <aside
      className="fixed left-0 top-0 flex h-screen flex-col bg-card transition-all duration-300 ease-in-out z-40" style={{ width: collapsed ? "4rem" : "16rem", boxShadow: "2px 0 12px rgba(74,55,33,0.06)" }}
      style={{ width: collapsed ? "4rem" : "16rem" }}
    >
      {/* Header */}
      {collapsed ? (
        <div className="flex h-14 items-center justify-center">
          <button
            onClick={onToggle}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200"
            title="展开菜单"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex h-14 items-center gap-3 px-5">
          <img src="/logo-white.png" alt="ReelBox" className="h-7 w-7 shrink-0 rounded-lg object-cover" />
          <span className="text-lg font-bold text-foreground whitespace-nowrap flex-1">
            ReelBox
          </span>
          <button
            onClick={onToggle}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200"
            title="收纳菜单"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
      )}
      <Separator />

      {/* Navigation */}
      <nav
        className="flex-1 space-y-1 py-2 overflow-hidden"
        style={{ paddingLeft: collapsed ? "0.5rem" : "0.75rem", paddingRight: collapsed ? "0.5rem" : "0.75rem" }}
      >
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) => linkClass(isActive)}
            title={collapsed ? label : undefined}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
        {isRoot && (
          <NavLink
            to="/admin"
            className={({ isActive }) => linkClass(isActive)}
            title={collapsed ? "用户管理" : undefined}
          >
            <Shield className="h-4 w-4 shrink-0" />
            {!collapsed && <span>用户管理</span>}
          </NavLink>
        )}
      </nav>
    </aside>
  )
}