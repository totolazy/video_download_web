import { useState } from "react"
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
  const [hoverLogo, setHoverLogo] = useState(false)

  const linkClass = (isActive: boolean) =>
    "flex items-center gap-3 rounded-xl transition-all duration-300 ease-in-out " +
    (collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5") +
    " text-sm font-medium " +
    (isActive
      ? "bg-primary text-primary-foreground shadow-sm"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground")

  return (
    <aside
      className="fixed left-0 top-0 flex h-screen flex-col transition-all duration-300 ease-in-out z-40"
      style={{ width: collapsed ? "4rem" : "16rem", boxShadow: "2px 0 12px rgba(74,55,33,0.06)" }}
    >
      {/* Header — matches top bar color */}
      {collapsed ? (
        <div
          className="flex h-14 items-center justify-center bg-card"
          onMouseEnter={() => setHoverLogo(true)}
          onMouseLeave={() => setHoverLogo(false)}
        >
          <div className="relative">
            <img src="/logo-white.png" alt="ReelBox" className="h-6 w-6 block rounded-lg object-cover" />
            {hoverLogo && (
              <button
                onClick={onToggle}
                className="absolute -inset-x-0.5 -inset-y-0.5 flex items-center justify-center rounded-lg bg-card transition-all duration-150"
              >
                <PanelLeftOpen className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex h-14 items-center gap-3 px-5 bg-card">
          <img src="/logo-white.png" alt="ReelBox" className="h-6 w-6 shrink-0 rounded-lg object-cover" />
          <span className="text-lg font-bold text-foreground whitespace-nowrap flex-1">
            ReelBox
          </span>
          <button
            onClick={onToggle}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-all duration-200"
            title="收纳菜单"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>
      )}
      <Separator />

      {/* Navigation — lighter sidebar body */}
      <nav
        className="flex-1 space-y-1 py-2 overflow-hidden"
        style={{
          paddingLeft: collapsed ? "0.5rem" : "0.75rem",
          paddingRight: collapsed ? "0.5rem" : "0.75rem",
          backgroundColor: "#F3E8DA",
        }}
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
            {!collapsed ? <span className="overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out" style={{ maxWidth: collapsed ? "0px" : "200px", opacity: collapsed ? 0 : 1 }}>{label}</span> : null}
          </NavLink>
        ))}
        {isRoot && (
          <NavLink
            to="/admin"
            className={({ isActive }) => linkClass(isActive)}
            title={collapsed ? "用户管理" : undefined}
          >
            <Shield className="h-4 w-4 shrink-0" />
            {!collapsed ? <span className="overflow-hidden whitespace-nowrap transition-all duration-300 ease-in-out" style={{ maxWidth: collapsed ? "0px" : "200px", opacity: collapsed ? 0 : 1 }}>用户管理</span> : null}
          </NavLink>
        )}
      </nav>
    </aside>
  )
}
